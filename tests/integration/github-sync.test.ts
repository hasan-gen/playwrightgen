import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import {
  dispatchGitHubWebhook,
  GitHubSyncConflictError,
} from "@/lib/services/github-sync";
import {
  bindGitHubInstallation,
  connectGitHubRepository,
  importGitHubRepository,
} from "@/lib/services/repository-imports";
import {
  cleanPhase1ATables,
  connectTestDatabase,
  createTestPrismaClient,
  disconnectTestDatabase,
} from "@/tests/helpers/database";

const unique = (prefix: string) => `${prefix}-${randomUUID()}`;
const externalId = () => String(Math.floor(Math.random() * 900_000_000) + 100_000_000);
const digest = (character: string) => character.repeat(64);

describe("signed GitHub installation lifecycle", () => {
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
        name: "GitHub lifecycle workspace",
        slug: unique("github-lifecycle"),
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

  const dependencies = (space: Awaited<ReturnType<typeof workspace>>) => ({
    authenticate: async () => ({
      userId: space.owner.clerkUserId,
      orgId: space.organization.clerkOrganizationId,
    }),
    prisma,
  });

  async function connectedRepository(space: Awaited<ReturnType<typeof workspace>>) {
    const installation = await bindGitHubInstallation({
      externalInstallationId: externalId(),
      accountId: externalId(),
      accountLogin: "acme-quality",
      accountType: "Organization",
      repositorySelection: "selected",
    }, dependencies(space));
    const connection = await connectGitHubRepository({
      projectId: space.project.id,
      githubInstallationId: installation.id,
      externalRepositoryId: externalId(),
      ownerLogin: "acme-quality",
      name: "storefront",
      defaultBranch: "main",
      visibility: "PRIVATE",
    }, dependencies(space));
    return { installation, connection };
  }

  function installationPayload(input: {
    action: string;
    installationId: string;
    accountId: string;
    updatedAt: string;
    selection?: "all" | "selected";
  }) {
    return {
      action: input.action,
      installation: {
        id: input.installationId,
        account: {
          id: input.accountId,
          login: "acme-quality",
          type: "Organization",
        },
        repository_selection: input.selection ?? "selected",
        updated_at: input.updatedAt,
        suspended_at:
          input.action === "suspend" ? input.updatedAt : null,
      },
    };
  }

  async function installationEvent(input: {
    action: string;
    installationId: string;
    accountId: string;
    deliveryId?: string;
    payloadSha256?: string;
    updatedAt?: string;
  }) {
    return dispatchGitHubWebhook({
      eventName: "installation",
      deliveryId: input.deliveryId ?? randomUUID(),
      payloadSha256: input.payloadSha256 ?? digest("a"),
      payload: installationPayload({
        action: input.action,
        installationId: input.installationId,
        accountId: input.accountId,
        updatedAt: input.updatedAt ?? "2026-08-26T12:00:00.000Z",
      }),
      prisma,
      now: new Date("2026-08-26T12:01:00.000Z"),
    });
  }

  it("suspends a bound installation once and treats redelivery as duplicate", async () => {
    const space = await workspace();
    const { installation, connection } = await connectedRepository(space);
    const deliveryId = randomUUID();
    const input = {
      action: "suspend",
      installationId: installation.externalInstallationId,
      accountId: installation.accountId,
      deliveryId,
      payloadSha256: digest("b"),
    };

    expect((await installationEvent(input)).status).toBe("applied");
    expect((await installationEvent(input)).status).toBe("duplicate");
    expect(await prisma.gitHubInstallation.findUniqueOrThrow({
      where: { id: installation.id },
    })).toMatchObject({
      status: "SUSPENDED",
      lastWebhookDeliveryId: deliveryId,
    });
    expect(await prisma.gitHubWebhookDelivery.count({ where: { deliveryId } })).toBe(1);
    expect(await prisma.activity.count({
      where: { requestId: deliveryId, source: "GITHUB_WEBHOOK" },
    })).toBe(1);
    await expect(importGitHubRepository({
      projectId: space.project.id,
      repositoryConnectionId: connection.id,
      idempotencyKey: "suspended-installation-import",
    }, dependencies(space))).rejects.toMatchObject({
      code: "repository_connection_not_found",
    });
  });

  it("rejects reuse of a delivery ID with a different signed payload digest", async () => {
    const space = await workspace();
    const { installation } = await connectedRepository(space);
    const deliveryId = randomUUID();
    await installationEvent({
      action: "suspend",
      installationId: installation.externalInstallationId,
      accountId: installation.accountId,
      deliveryId,
      payloadSha256: digest("c"),
    });

    await expect(installationEvent({
      action: "unsuspend",
      installationId: installation.externalInstallationId,
      accountId: installation.accountId,
      deliveryId,
      payloadSha256: digest("d"),
      updatedAt: "2026-08-26T12:02:00.000Z",
    })).rejects.toBeInstanceOf(GitHubSyncConflictError);
  });

  it("removes installation access and prevents subsequent imports", async () => {
    const space = await workspace();
    const { installation, connection } = await connectedRepository(space);
    await installationEvent({
      action: "deleted",
      installationId: installation.externalInstallationId,
      accountId: installation.accountId,
      payloadSha256: digest("e"),
    });

    expect(await prisma.gitHubInstallation.findUniqueOrThrow({
      where: { id: installation.id },
    })).toMatchObject({ status: "REMOVED" });
    expect(await prisma.repositoryConnection.findUniqueOrThrow({
      where: { id: connection.id },
    })).toMatchObject({ status: "ACCESS_REMOVED" });
    await expect(importGitHubRepository({
      projectId: space.project.id,
      repositoryConnectionId: connection.id,
      idempotencyKey: "removed-installation-import",
    }, dependencies(space))).rejects.toMatchObject({
      code: "repository_connection_not_found",
    });
  });

  it("removes and restores only provider-selected repository connections", async () => {
    const space = await workspace();
    const { installation, connection } = await connectedRepository(space);
    const other = await connectGitHubRepository({
      projectId: space.project.id,
      githubInstallationId: installation.id,
      externalRepositoryId: externalId(),
      ownerLogin: "acme-quality",
      name: "admin",
      defaultBranch: "main",
      visibility: "PRIVATE",
    }, dependencies(space));
    const basePayload = {
      installation: {
        id: installation.externalInstallationId,
        account: {
          id: installation.accountId,
          login: "acme-quality",
          type: "Organization",
        },
        repository_selection: "selected",
        updated_at: "2026-08-26T12:03:00.000Z",
        suspended_at: null,
      },
      repository_selection: "selected",
    };

    await dispatchGitHubWebhook({
      eventName: "installation_repositories",
      deliveryId: randomUUID(),
      payloadSha256: digest("f"),
      payload: {
        ...basePayload,
        action: "removed",
        repositories_added: [],
        repositories_removed: [{ id: connection.externalRepositoryId }],
      },
      prisma,
    });
    expect((await prisma.repositoryConnection.findUniqueOrThrow({
      where: { id: connection.id },
    })).status).toBe("ACCESS_REMOVED");
    expect((await prisma.repositoryConnection.findUniqueOrThrow({
      where: { id: other.id },
    })).status).toBe("ACTIVE");

    await dispatchGitHubWebhook({
      eventName: "installation_repositories",
      deliveryId: randomUUID(),
      payloadSha256: digest("1"),
      payload: {
        ...basePayload,
        action: "added",
        repositories_added: [{ id: connection.externalRepositoryId }],
        repositories_removed: [],
      },
      prisma,
    });
    expect((await prisma.repositoryConnection.findUniqueOrThrow({
      where: { id: connection.id },
    })).status).toBe("ACTIVE");
  });

  it("records an unbound installation delivery without creating tenant state", async () => {
    const result = await installationEvent({
      action: "created",
      installationId: externalId(),
      accountId: externalId(),
      payloadSha256: digest("2"),
    });

    expect(result.status).toBe("ignored");
    expect(await prisma.gitHubInstallation.count()).toBe(0);
    expect(await prisma.gitHubWebhookDelivery.count({
      where: { organizationId: null, result: "IGNORED" },
    })).toBe(1);
  });
});
