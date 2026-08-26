import "server-only";

import { z } from "zod";

import {
  requireWorkspaceContext,
  type WorkspaceContextDependencies,
  type WorkspacePermission,
} from "@/lib/auth/workspace-context";
import { getPrismaClient } from "@/lib/db/prisma";
import {
  createGitHubRepositorySnapshotProvider,
  type GitHubAccessibleRepository,
  GitHubProviderError,
  listGitHubInstallationRepositories,
} from "@/lib/integrations/github/app-client";

const uuidSchema = z.string().uuid();
const externalIdSchema = z.string().regex(/^\d+$/).max(32);
const safeNameSchema = z.string().trim().min(1).max(255);
const sourceRefSchema = z.string().trim().min(1).max(255);
const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(100)
  .regex(/^[A-Za-z0-9_.:-]+$/);
const commitShaSchema = z.string().regex(/^[0-9a-f]{40}$/);
const PARSER_VERSION = "playwright-inventory-v1";
const MAX_CANDIDATE_FILE_BYTES = 512_000;
const MAX_INVENTORY_FILES = 10_000;

const sourceFileSchema = z.object({
  path: z.string().trim().min(1).max(1_000),
  blobSha: z.string().trim().min(1).max(64),
  sizeBytes: z.number().int().min(0),
  content: z.string().max(MAX_CANDIDATE_FILE_BYTES).optional(),
});

const snapshotSchema = z.object({
  externalRepositoryId: externalIdSchema,
  commitSha: commitShaSchema,
  truncated: z.boolean().default(false),
  files: z.array(sourceFileSchema).max(MAX_INVENTORY_FILES),
});

export type RepositorySourceSnapshot = z.input<typeof snapshotSchema>;

export type RepositorySnapshotProvider = (input: {
  externalInstallationId: string;
  externalRepositoryId: string;
  ownerLogin: string;
  repositoryName: string;
  sourceRef: string;
}) => Promise<RepositorySourceSnapshot>;

type Dependencies = WorkspaceContextDependencies & {
  fetchSnapshot?: RepositorySnapshotProvider;
  listRepositories?: (input: {
    installationId: string;
  }) => Promise<GitHubAccessibleRepository[]>;
};

export class RepositoryImportDomainError extends Error {
  readonly code: string;
  readonly status: 400 | 404 | 409 | 502;

  constructor(code: string, status: 400 | 404 | 409 | 502) {
    super(code);
    this.name = "RepositoryImportDomainError";
    this.code = code;
    this.status = status;
  }
}

function client(dependencies?: Dependencies) {
  return dependencies?.prisma ?? getPrismaClient();
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new RepositoryImportDomainError("invalid_repository_input", 400);
  }
  return result.data;
}

async function projectContext(
  input: { orgSlug?: string; projectId: string },
  permission: WorkspacePermission,
  dependencies?: Dependencies,
) {
  const projectId = parse(uuidSchema, input.projectId);
  const workspace = await requireWorkspaceContext(
    { orgSlug: input.orgSlug, projectId, permission },
    dependencies,
  );
  return { workspace, projectId };
}

function classifyPath(path: string) {
  const normalized = path.replaceAll("\\", "/").toLowerCase();
  const fileName = normalized.split("/").at(-1) ?? normalized;
  if (/^playwright\.config\.(?:ts|js|mts|mjs|cts|cjs)$/.test(fileName)) {
    return "PLAYWRIGHT_CONFIG" as const;
  }
  if (/\.(?:spec|test)\.(?:ts|tsx|js|jsx|mts|mjs|cts|cjs)$/.test(fileName)) {
    return "TEST_SPEC" as const;
  }
  if (
    fileName === "package.json" ||
    fileName === "package-lock.json" ||
    fileName === "pnpm-lock.yaml" ||
    fileName === "yarn.lock" ||
    /^tsconfig(?:\..+)?\.json$/.test(fileName)
  ) {
    return "SUPPORT_FILE" as const;
  }
  return null;
}

export function countPlaywrightTests(content: string): number {
  return Array.from(
    content.matchAll(/\b(?:test|it)\s*(?:\.(?:only|skip|fixme|fail|slow))?\s*\(/g),
  ).length;
}

export function buildRepositoryInventory(snapshot: RepositorySourceSnapshot) {
  const parsed = parse(snapshotSchema, snapshot);
  const limitations = new Set<string>();
  if (parsed.truncated) limitations.add("repository_tree_truncated");

  const byPath = new Map<string, (typeof parsed.files)[number]>();
  for (const file of parsed.files) {
    const normalizedPath = file.path.replaceAll("\\", "/");
    if (normalizedPath.startsWith("/") || normalizedPath.includes("../")) {
      limitations.add("unsafe_path_ignored");
      continue;
    }
    byPath.set(normalizedPath, { ...file, path: normalizedPath });
  }

  const files = Array.from(byPath.values()).flatMap((file) => {
    const kind = classifyPath(file.path);
    if (!kind) return [];
    const discoveredTestCount =
      kind === "TEST_SPEC" && file.content
        ? countPlaywrightTests(file.content)
        : 0;
    if (kind === "TEST_SPEC" && !file.content) {
      limitations.add("test_content_unavailable");
    }
    return [{
      path: file.path,
      kind,
      blobSha: file.blobSha,
      sizeBytes: file.sizeBytes,
      discoveredTestCount,
    }];
  });

  const configurationCount = files.filter(
    (file) => file.kind === "PLAYWRIGHT_CONFIG",
  ).length;
  const testFileCount = files.filter((file) => file.kind === "TEST_SPEC").length;
  const supportFileCount = files.filter(
    (file) => file.kind === "SUPPORT_FILE",
  ).length;
  if (configurationCount === 0) limitations.add("playwright_config_missing");
  if (testFileCount === 0) limitations.add("test_specs_missing");

  return {
    commitSha: parsed.commitSha,
    files,
    configurationCount,
    testFileCount,
    supportFileCount,
    discoveredTestCount: files.reduce(
      (total, file) => total + file.discoveredTestCount,
      0,
    ),
    limitations: Array.from(limitations).sort(),
  };
}

export async function bindGitHubInstallation(
  input: {
    orgSlug?: string;
    externalInstallationId: string;
    accountId: string;
    accountLogin: string;
    accountType: string;
    repositorySelection: "all" | "selected";
    installedAt?: Date;
    providerUpdatedAt?: Date;
    requestId?: string;
  },
  dependencies?: Dependencies,
) {
  const externalInstallationId = parse(
    externalIdSchema,
    input.externalInstallationId,
  );
  const accountId = parse(externalIdSchema, input.accountId);
  const accountLogin = parse(safeNameSchema, input.accountLogin);
  const accountType = parse(z.string().trim().min(1).max(50), input.accountType);
  const repositorySelection = parse(
    z.enum(["all", "selected"]),
    input.repositorySelection,
  );
  const workspace = await requireWorkspaceContext(
    { orgSlug: input.orgSlug, permission: "organization:manage" },
    dependencies,
  );
  const prisma = client(dependencies);
  const existing = await prisma.gitHubInstallation.findUnique({
    where: { externalInstallationId },
  });
  if (existing && existing.organizationId !== workspace.organization.id) {
    throw new RepositoryImportDomainError(
      "github_installation_already_connected",
      409,
    );
  }
  if (existing) return existing;

  return prisma.$transaction(async (transaction) => {
    const installation = await transaction.gitHubInstallation.create({
      data: {
        organizationId: workspace.organization.id,
        externalInstallationId,
        accountId,
        accountLogin,
        accountType,
        repositorySelection,
        connectedByUserId: workspace.user.id,
        installedAt: input.installedAt,
        providerUpdatedAt: input.providerUpdatedAt,
      },
    });
    await transaction.activity.create({
      data: {
        organizationId: workspace.organization.id,
        actorUserId: workspace.user.id,
        source: "USER",
        action: "GITHUB_INSTALLATION_CONNECTED",
        targetType: "GITHUB_INSTALLATION",
        targetId: installation.id,
        requestId: input.requestId ?? null,
        metadata: {
          accountLogin,
          accountType,
          repositorySelection,
        },
      },
    });
    return installation;
  });
}

export async function connectGitHubRepository(
  input: {
    orgSlug?: string;
    projectId: string;
    githubInstallationId: string;
    externalRepositoryId: string;
    ownerLogin: string;
    name: string;
    defaultBranch: string;
    visibility: "PUBLIC" | "PRIVATE" | "INTERNAL" | "UNKNOWN";
    requestId?: string;
  },
  dependencies?: Dependencies,
) {
  const githubInstallationId = parse(uuidSchema, input.githubInstallationId);
  const externalRepositoryId = parse(
    externalIdSchema,
    input.externalRepositoryId,
  );
  const ownerLogin = parse(safeNameSchema, input.ownerLogin);
  const name = parse(safeNameSchema, input.name);
  const defaultBranch = parse(safeNameSchema, input.defaultBranch);
  const visibility = parse(
    z.enum(["PUBLIC", "PRIVATE", "INTERNAL", "UNKNOWN"]),
    input.visibility,
  );
  const { workspace, projectId } = await projectContext(
    input,
    "repository:connect",
    dependencies,
  );
  const prisma = client(dependencies);
  const installation = await prisma.gitHubInstallation.findUnique({
    where: {
      organizationId_id: {
        organizationId: workspace.organization.id,
        id: githubInstallationId,
      },
    },
  });
  if (!installation || installation.status !== "ACTIVE") {
    throw new RepositoryImportDomainError("github_installation_not_found", 404);
  }
  const existing = await prisma.repositoryConnection.findUnique({
    where: {
      organizationId_projectId_externalRepositoryId: {
        organizationId: workspace.organization.id,
        projectId,
        externalRepositoryId,
      },
    },
  });
  if (existing?.status === "ACTIVE") return existing;

  return prisma.$transaction(async (transaction) => {
    const connection = existing
      ? await transaction.repositoryConnection.update({
          where: { id: existing.id },
          data: {
            githubInstallationId,
            ownerLogin,
            name,
            fullName: `${ownerLogin}/${name}`,
            defaultBranch,
            visibility,
            status: "ACTIVE",
            accessRemovedAt: null,
            disconnectedAt: null,
          },
        })
      : await transaction.repositoryConnection.create({
          data: {
            organizationId: workspace.organization.id,
            projectId,
            githubInstallationId,
            externalRepositoryId,
            ownerLogin,
            name,
            fullName: `${ownerLogin}/${name}`,
            defaultBranch,
            visibility,
            createdByUserId: workspace.user.id,
          },
        });
    await transaction.activity.create({
      data: {
        organizationId: workspace.organization.id,
        projectId,
        actorUserId: workspace.user.id,
        source: "USER",
        action: "REPOSITORY_CONNECTED",
        targetType: "REPOSITORY_CONNECTION",
        targetId: connection.id,
        requestId: input.requestId ?? null,
        metadata: {
          repository: connection.fullName,
          visibility,
        },
      },
    });
    return connection;
  });
}

export async function listRepositoryConnections(
  input: { orgSlug?: string; projectId: string },
  dependencies?: Dependencies,
) {
  const { workspace, projectId } = await projectContext(
    input,
    "repository:read",
    dependencies,
  );
  return client(dependencies).repositoryConnection.findMany({
    where: { organizationId: workspace.organization.id, projectId },
    include: {
      installation: {
        select: { accountLogin: true, status: true, repositorySelection: true },
      },
      imports: {
        orderBy: { startedAt: "desc" },
        take: 5,
        include: { files: { orderBy: [{ kind: "asc" }, { path: "asc" }] } },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  });
}

export async function listConnectableGitHubRepositories(
  input: { orgSlug?: string; projectId: string },
  dependencies?: Dependencies,
) {
  const { workspace, projectId } = await projectContext(
    input,
    "repository:connect",
    dependencies,
  );
  const prisma = client(dependencies);
  const [installations, connections] = await Promise.all([
    prisma.gitHubInstallation.findMany({
      where: {
        organizationId: workspace.organization.id,
        status: "ACTIVE",
      },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    }),
    prisma.repositoryConnection.findMany({
      where: { organizationId: workspace.organization.id, projectId },
      select: { externalRepositoryId: true, status: true },
    }),
  ]);
  const connected = new Map(
    connections.map((connection) => [
      connection.externalRepositoryId,
      connection.status,
    ]),
  );
  const listRepositories =
    dependencies?.listRepositories ??
    ((request: { installationId: string }) =>
      listGitHubInstallationRepositories(request));
  const available = await Promise.all(
    installations.map(async (installation) => ({
      installation,
      repositories: await listRepositories({
        installationId: installation.externalInstallationId,
      }),
    })),
  );
  return available.flatMap(({ installation, repositories }) =>
    repositories.map((repository) => ({
      ...repository,
      githubInstallationId: installation.id,
      accountLogin: installation.accountLogin,
      connectionStatus: connected.get(repository.externalRepositoryId) ?? null,
    })),
  );
}

export async function connectVerifiedGitHubRepository(
  input: {
    orgSlug?: string;
    projectId: string;
    githubInstallationId: string;
    externalRepositoryId: string;
    requestId?: string;
  },
  dependencies?: Dependencies,
) {
  const githubInstallationId = parse(uuidSchema, input.githubInstallationId);
  const externalRepositoryId = parse(
    externalIdSchema,
    input.externalRepositoryId,
  );
  const { workspace } = await projectContext(
    input,
    "repository:connect",
    dependencies,
  );
  const installation = await client(dependencies).gitHubInstallation.findUnique({
    where: {
      organizationId_id: {
        organizationId: workspace.organization.id,
        id: githubInstallationId,
      },
    },
  });
  if (!installation || installation.status !== "ACTIVE") {
    throw new RepositoryImportDomainError("github_installation_not_found", 404);
  }
  const listRepositories =
    dependencies?.listRepositories ??
    ((request: { installationId: string }) =>
      listGitHubInstallationRepositories(request));
  let repositories: GitHubAccessibleRepository[];
  try {
    repositories = await listRepositories({
      installationId: installation.externalInstallationId,
    });
  } catch (error) {
    throw new RepositoryImportDomainError(
      error instanceof GitHubProviderError ? error.code : "provider_failure",
      502,
    );
  }
  const repository = repositories.find(
    (candidate) =>
      candidate.externalRepositoryId === externalRepositoryId,
  );
  if (!repository) {
    throw new RepositoryImportDomainError(
      "github_repository_access_not_verified",
      404,
    );
  }
  return connectGitHubRepository(
    {
      orgSlug: input.orgSlug,
      projectId: input.projectId,
      githubInstallationId,
      externalRepositoryId,
      ownerLogin: repository.ownerLogin,
      name: repository.name,
      defaultBranch: repository.defaultBranch,
      visibility: repository.visibility,
      requestId: input.requestId,
    },
    dependencies,
  );
}

export async function importGitHubRepository(
  input: {
    orgSlug?: string;
    projectId: string;
    repositoryConnectionId: string;
    idempotencyKey: string;
    sourceRef?: string;
    requestId?: string;
  },
  dependencies?: Dependencies,
) {
  const repositoryConnectionId = parse(
    uuidSchema,
    input.repositoryConnectionId,
  );
  const idempotencyKey = parse(idempotencyKeySchema, input.idempotencyKey);
  const { workspace, projectId } = await projectContext(
    input,
    "repository:import",
    dependencies,
  );
  const prisma = client(dependencies);
  const connection = await prisma.repositoryConnection.findUnique({
    where: {
      organizationId_projectId_id: {
        organizationId: workspace.organization.id,
        projectId,
        id: repositoryConnectionId,
      },
    },
    include: { installation: true },
  });
  if (
    !connection ||
    connection.status !== "ACTIVE" ||
    connection.installation.status !== "ACTIVE"
  ) {
    throw new RepositoryImportDomainError("repository_connection_not_found", 404);
  }
  const sourceRef = parse(
    sourceRefSchema,
    input.sourceRef ?? connection.defaultBranch,
  );
  const existing = await prisma.repositoryImport.findUnique({
    where: {
      organizationId_projectId_repositoryConnectionId_idempotencyKey: {
        organizationId: workspace.organization.id,
        projectId,
        repositoryConnectionId,
        idempotencyKey,
      },
    },
    include: { files: { orderBy: [{ kind: "asc" }, { path: "asc" }] } },
  });
  if (existing) return existing;

  const importRecord = await prisma.repositoryImport.create({
    data: {
      organizationId: workspace.organization.id,
      projectId,
      repositoryConnectionId,
      idempotencyKey,
      sourceRef,
      parserVersion: PARSER_VERSION,
      requestedByUserId: workspace.user.id,
    },
  });

  let inventory: ReturnType<typeof buildRepositoryInventory> | null = null;
  let failureCode: string | null = null;
  try {
    const fetchSnapshot =
      dependencies?.fetchSnapshot ?? createGitHubRepositorySnapshotProvider();
    const snapshot = await fetchSnapshot({
      externalInstallationId: connection.installation.externalInstallationId,
      externalRepositoryId: connection.externalRepositoryId,
      ownerLogin: connection.ownerLogin,
      repositoryName: connection.name,
      sourceRef,
    });
    const parsedSnapshot = parse(snapshotSchema, snapshot);
    if (parsedSnapshot.externalRepositoryId !== connection.externalRepositoryId) {
      throw new RepositoryImportDomainError("repository_identity_mismatch", 409);
    }
    inventory = buildRepositoryInventory(parsedSnapshot);
  } catch (error) {
    failureCode =
      error instanceof GitHubProviderError
        ? error.code
        : error instanceof Error && /^[a-z_]+$/.test(error.message)
        ? error.message
        : error instanceof RepositoryImportDomainError
          ? error.code
          : "provider_failure";
  }

  return prisma.$transaction(async (transaction) => {
    if (inventory) {
      const duplicate = await transaction.repositoryImport.findFirst({
        where: {
          organizationId: workspace.organization.id,
          projectId,
          repositoryConnectionId,
          commitSha: inventory.commitSha,
          parserVersion: PARSER_VERSION,
          id: { not: importRecord.id },
        },
        include: { files: { orderBy: [{ kind: "asc" }, { path: "asc" }] } },
      });
      if (duplicate) {
        await transaction.repositoryImport.update({
          where: { id: importRecord.id },
          data: {
            status: "FAILED",
            failureCode: "duplicate_snapshot",
            completedAt: new Date(),
          },
        });
        return duplicate;
      }
    }

    const status = inventory
      ? inventory.limitations.length > 0
        ? "INCOMPLETE"
        : "SUCCEEDED"
      : "FAILED";
    const completed = await transaction.repositoryImport.update({
      where: { id: importRecord.id },
      data: inventory
        ? {
            commitSha: inventory.commitSha,
            status,
            configurationCount: inventory.configurationCount,
            testFileCount: inventory.testFileCount,
            supportFileCount: inventory.supportFileCount,
            discoveredTestCount: inventory.discoveredTestCount,
            limitations: inventory.limitations,
            completedAt: new Date(),
            files: { createMany: { data: inventory.files } },
          }
        : {
            status: "FAILED",
            failureCode: failureCode ?? "provider_failure",
            completedAt: new Date(),
          },
      include: { files: { orderBy: [{ kind: "asc" }, { path: "asc" }] } },
    });
    if (inventory) {
      await transaction.repositoryConnection.update({
        where: { id: connection.id },
        data: { lastImportedAt: new Date() },
      });
    }
    await transaction.activity.create({
      data: {
        organizationId: workspace.organization.id,
        projectId,
        actorUserId: workspace.user.id,
        source: "USER",
        action: "REPOSITORY_IMPORT_COMPLETED",
        targetType: "REPOSITORY_IMPORT",
        targetId: completed.id,
        requestId: input.requestId ?? null,
        metadata: {
          repositoryConnectionId,
          sourceRef,
          commitSha: completed.commitSha,
          parserVersion: PARSER_VERSION,
          status: completed.status,
          configurationCount: completed.configurationCount,
          testFileCount: completed.testFileCount,
          discoveredTestCount: completed.discoveredTestCount,
          limitationCount: completed.limitations.length,
          failureCode: completed.failureCode,
        },
      },
    });
    return completed;
  });
}

export function repositoryImportDomainErrorResponse(
  error: unknown,
): Response | null {
  if (!(error instanceof RepositoryImportDomainError)) return null;
  return Response.json(
    { status: "error", code: error.code },
    { status: error.status },
  );
}
