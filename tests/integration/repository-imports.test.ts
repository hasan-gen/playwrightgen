import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaClient, ProjectMembershipRole } from "@/generated/prisma/client";
import {
  bindGitHubInstallation,
  connectGitHubRepository,
  connectVerifiedPublicGitHubRepository,
  connectVerifiedGitHubRepository,
  importGitHubRepository,
  listConnectableGitHubRepositories,
  listRepositoryConnections,
  parseGitHubRepositoryLocator,
  type RepositorySnapshotProvider,
} from "@/lib/services/repository-imports";
import {
  cleanPhase1ATables,
  connectTestDatabase,
  createTestPrismaClient,
  disconnectTestDatabase,
} from "@/tests/helpers/database";

const unique = (prefix: string) => `${prefix}-${randomUUID()}`;

describe("tenant-safe GitHub repository imports", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    await connectTestDatabase(prisma);
  });
  beforeEach(async () => cleanPhase1ATables(prisma));
  afterAll(async () => {
    if (prisma) {
      await cleanPhase1ATables(prisma);
      await disconnectTestDatabase(prisma);
    }
  });

  async function workspace() {
    const owner = await prisma.user.create({
      data: { clerkUserId: unique("owner"), displayName: "Owner" },
    });
    const organization = await prisma.organization.create({
      data: {
        clerkOrganizationId: unique("org"),
        name: "Repository workspace",
        slug: unique("repository"),
      },
    });
    await prisma.membership.create({
      data: { organizationId: organization.id, userId: owner.id, role: "OWNER" },
    });
    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: "Storefront",
        slug: unique("storefront"),
        createdByUserId: owner.id,
      },
    });
    return { owner, organization, project };
  }

  const deps = (
    space: Awaited<ReturnType<typeof workspace>>,
    actor = space.owner,
    fetchSnapshot?: RepositorySnapshotProvider,
  ) => ({
    authenticate: async () => ({
      userId: actor.clerkUserId,
      orgId: space.organization.clerkOrganizationId,
    }),
    prisma,
    fetchSnapshot,
  });

  async function addProjectMember(
    space: Awaited<ReturnType<typeof workspace>>,
    role: ProjectMembershipRole,
  ) {
    const user = await prisma.user.create({
      data: { clerkUserId: unique("member"), displayName: role },
    });
    await prisma.membership.create({
      data: {
        organizationId: space.organization.id,
        userId: user.id,
        role: "MEMBER",
      },
    });
    await prisma.projectMembership.create({
      data: {
        organizationId: space.organization.id,
        projectId: space.project.id,
        userId: user.id,
        role,
      },
    });
    return user;
  }

  async function connectedRepository(space: Awaited<ReturnType<typeof workspace>>) {
    const installation = await bindGitHubInstallation({
      externalInstallationId: String(Math.floor(Math.random() * 900_000_000) + 100_000_000),
      accountId: String(Math.floor(Math.random() * 900_000_000) + 100_000_000),
      accountLogin: "acme-quality",
      accountType: "Organization",
      repositorySelection: "selected",
    }, deps(space));
    const connection = await connectGitHubRepository({
      projectId: space.project.id,
      githubInstallationId: installation.id,
      externalRepositoryId: String(Math.floor(Math.random() * 900_000_000) + 100_000_000),
      ownerLogin: "acme-quality",
      name: "storefront",
      defaultBranch: "main",
      visibility: "PRIVATE",
    }, deps(space));
    return { connection, installation };
  }

  it("imports source-linked inventory as preliminary evidence", async () => {
    const space = await workspace();
    const { connection } = await connectedRepository(space);
    const fetchSnapshot = vi.fn(async () => ({
      externalRepositoryId: connection.externalRepositoryId,
      commitSha: "a".repeat(40),
      truncated: false,
      files: [
        {
          path: "playwright.config.ts",
          blobSha: "config-sha",
          sizeBytes: 120,
          content: "export default {}",
        },
        {
          path: "tests/checkout.spec.ts",
          blobSha: "test-sha",
          sizeBytes: 240,
          content: `test("checkout", async () => {});`,
        },
      ],
    }));

    const imported = await importGitHubRepository({
      projectId: space.project.id,
      repositoryConnectionId: connection.id,
      idempotencyKey: "import-request-0001",
    }, deps(space, space.owner, fetchSnapshot));

    expect(imported).toMatchObject({
      status: "SUCCEEDED",
      commitSha: "a".repeat(40),
      configurationCount: 1,
      testFileCount: 1,
      discoveredTestCount: 1,
      limitations: [],
    });
    expect(imported.files).toHaveLength(2);
    expect(imported.files[1]).not.toHaveProperty("content");
    expect(await prisma.testCase.count()).toBe(0);
    expect(await prisma.automationArtifact.count()).toBe(0);
    expect(await prisma.testRun.count()).toBe(0);
    expect(await prisma.activity.count({
      where: { action: "REPOSITORY_IMPORT_COMPLETED" },
    })).toBe(1);
  });

  it("returns the same import for a repeated idempotency key", async () => {
    const space = await workspace();
    const { connection } = await connectedRepository(space);
    const fetchSnapshot = vi.fn(async () => ({
      externalRepositoryId: connection.externalRepositoryId,
      commitSha: "b".repeat(40),
      truncated: false,
      files: [],
    }));
    const input = {
      projectId: space.project.id,
      repositoryConnectionId: connection.id,
      idempotencyKey: "import-request-0002",
    };

    const first = await importGitHubRepository(
      input,
      deps(space, space.owner, fetchSnapshot),
    );
    const second = await importGitHubRepository(
      input,
      deps(space, space.owner, fetchSnapshot),
    );

    expect(second.id).toBe(first.id);
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
  });

  it("does not expose or import a repository across tenants", async () => {
    const first = await workspace();
    const second = await workspace();
    const { connection } = await connectedRepository(first);

    expect(await listRepositoryConnections(
      { projectId: second.project.id },
      deps(second),
    )).toEqual([]);
    await expect(importGitHubRepository({
      projectId: second.project.id,
      repositoryConnectionId: connection.id,
      idempotencyKey: "cross-tenant-request",
    }, deps(second))).rejects.toMatchObject({
      code: "repository_connection_not_found",
    });
  });

  it("allows Viewers to inspect evidence but only Leads to import", async () => {
    const space = await workspace();
    const { connection } = await connectedRepository(space);
    const viewer = await addProjectMember(space, "VIEWER");
    const member = await addProjectMember(space, "MEMBER");
    const lead = await addProjectMember(space, "PROJECT_LEAD");

    expect(await listRepositoryConnections(
      { projectId: space.project.id },
      deps(space, viewer),
    )).toHaveLength(1);
    await expect(importGitHubRepository({
      projectId: space.project.id,
      repositoryConnectionId: connection.id,
      idempotencyKey: "viewer-import-request",
    }, deps(space, viewer))).rejects.toMatchObject({ code: "permission_denied" });
    await expect(importGitHubRepository({
      projectId: space.project.id,
      repositoryConnectionId: connection.id,
      idempotencyKey: "member-import-request",
    }, deps(space, member))).rejects.toMatchObject({ code: "permission_denied" });

    const imported = await importGitHubRepository({
      projectId: space.project.id,
      repositoryConnectionId: connection.id,
      idempotencyKey: "lead-import-request",
    }, deps(space, lead, async () => ({
      externalRepositoryId: connection.externalRepositoryId,
      commitSha: "c".repeat(40),
      truncated: false,
      files: [],
    })));
    expect(imported.status).toBe("INCOMPLETE");
  });

  it("prevents one external installation from crossing organizations", async () => {
    const first = await workspace();
    const second = await workspace();
    const input = {
      externalInstallationId: "700000001",
      accountId: "800000001",
      accountLogin: "shared-account",
      accountType: "Organization",
      repositorySelection: "selected" as const,
    };
    await bindGitHubInstallation(input, deps(first));
    await expect(bindGitHubInstallation(input, deps(second))).rejects.toMatchObject({
      code: "github_installation_already_connected",
    });
  });

  it("connects only a repository returned by the tenant installation live", async () => {
    const space = await workspace();
    const installation = await bindGitHubInstallation({
      externalInstallationId: "700000002",
      accountId: "800000002",
      accountLogin: "acme-quality",
      accountType: "Organization",
      repositorySelection: "selected",
    }, deps(space));
    const listRepositories = vi.fn(async () => [{
      externalRepositoryId: "900000002",
      ownerLogin: "acme-quality",
      name: "checkout",
      fullName: "acme-quality/checkout",
      defaultBranch: "main",
      visibility: "PRIVATE" as const,
    }]);
    const liveDependencies = { ...deps(space), listRepositories };

    const available = await listConnectableGitHubRepositories(
      { projectId: space.project.id },
      liveDependencies,
    );
    expect(available).toMatchObject([{
      githubInstallationId: installation.id,
      externalRepositoryId: "900000002",
      connectionStatus: null,
    }]);

    const connection = await connectVerifiedGitHubRepository({
      projectId: space.project.id,
      githubInstallationId: installation.id,
      externalRepositoryId: "900000002",
    }, liveDependencies);
    expect(connection).toMatchObject({
      organizationId: space.organization.id,
      projectId: space.project.id,
      fullName: "acme-quality/checkout",
      status: "ACTIVE",
    });
    await expect(connectVerifiedGitHubRepository({
      projectId: space.project.id,
      githubInstallationId: installation.id,
      externalRepositoryId: "900000099",
    }, liveDependencies)).rejects.toMatchObject({
      code: "github_repository_access_not_verified",
    });
  });

  it("connects a live-verified public repository through the tenant installation", async () => {
    const space = await workspace();
    const installation = await bindGitHubInstallation({
      externalInstallationId: "700000003",
      accountId: "800000003",
      accountLogin: "hmamut39",
      accountType: "User",
      repositorySelection: "all",
    }, deps(space));
    const getPublicRepository = vi.fn(async () => ({
      externalRepositoryId: "900000003",
      ownerLogin: "hasan-gen",
      name: "playwrightgen",
      fullName: "hasan-gen/playwrightgen",
      defaultBranch: "main",
      visibility: "PUBLIC" as const,
    }));

    const connection = await connectVerifiedPublicGitHubRepository({
      projectId: space.project.id,
      githubInstallationId: installation.id,
      repository: "https://github.com/hasan-gen/playwrightgen",
    }, { ...deps(space), getPublicRepository });

    expect(getPublicRepository).toHaveBeenCalledWith({
      installationId: "700000003",
      ownerLogin: "hasan-gen",
      repositoryName: "playwrightgen",
    });
    expect(connection).toMatchObject({
      organizationId: space.organization.id,
      projectId: space.project.id,
      fullName: "hasan-gen/playwrightgen",
      visibility: "PUBLIC",
    });
  });

  it("rejects public repository connection through another tenant's installation", async () => {
    const first = await workspace();
    const second = await workspace();
    const installation = await bindGitHubInstallation({
      externalInstallationId: "700000004",
      accountId: "800000004",
      accountLogin: "hmamut39",
      accountType: "User",
      repositorySelection: "all",
    }, deps(first));

    await expect(connectVerifiedPublicGitHubRepository({
      projectId: second.project.id,
      githubInstallationId: installation.id,
      repository: "https://github.com/hasan-gen/playwrightgen",
    }, deps(second))).rejects.toMatchObject({
      code: "github_installation_not_found",
    });
  });

  it("accepts only canonical GitHub repository locators", () => {
    expect(parseGitHubRepositoryLocator(
      "https://github.com/hasan-gen/playwrightgen.git",
    )).toEqual({ ownerLogin: "hasan-gen", repositoryName: "playwrightgen" });
    expect(parseGitHubRepositoryLocator("hasan-gen/playwrightgen")).toEqual({
      ownerLogin: "hasan-gen",
      repositoryName: "playwrightgen",
    });
    expect(() => parseGitHubRepositoryLocator(
      "https://example.com/hasan-gen/playwrightgen",
    )).toThrowError("invalid_repository_input");
    expect(() => parseGitHubRepositoryLocator(
      "https://github.com/hasan-gen/playwrightgen/issues",
    )).toThrowError("invalid_repository_input");
  });
});
