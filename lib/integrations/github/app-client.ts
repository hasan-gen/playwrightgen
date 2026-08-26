import "server-only";

import { createSign } from "node:crypto";

import { z } from "zod";

import { validateGitHubAppAuthenticationEnvironment } from "@/lib/env";
import type {
  RepositorySnapshotProvider,
  RepositorySourceSnapshot,
} from "@/lib/services/repository-imports";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2026-03-10";
const MAX_CANDIDATE_FILES = 1_000;
const MAX_CANDIDATE_BYTES = 512_000;
const BLOB_FETCH_CONCURRENCY = 8;

const tokenResponseSchema = z.object({
  token: z.string().min(1),
  expires_at: z.string().min(1),
});
const commitResponseSchema = z.object({
  sha: z.string().regex(/^[0-9a-f]{40}$/),
  commit: z.object({
    tree: z.object({ sha: z.string().min(1).max(64) }),
  }),
});
const treeResponseSchema = z.object({
  truncated: z.boolean(),
  tree: z.array(z.object({
    path: z.string().min(1).max(1_000),
    mode: z.string().optional(),
    type: z.string(),
    sha: z.string().min(1).max(64),
    size: z.number().int().min(0).optional(),
  })).max(100_000),
});
const blobResponseSchema = z.object({
  content: z.string(),
  encoding: z.literal("base64"),
});

export class GitHubProviderError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "GitHubProviderError";
    this.code = code;
  }
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
}

function normalizePrivateKey(value: string): string {
  return value.includes("\\n") ? value.replaceAll("\\n", "\n") : value;
}

export function createGitHubAppJwt(input: {
  appId: string;
  privateKey: string;
  now?: Date;
}): string {
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1_000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iat: nowSeconds - 60,
    exp: nowSeconds + 9 * 60,
    iss: input.appId,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${base64Url(signer.sign(normalizePrivateKey(input.privateKey)))}`;
}

function candidatePath(path: string): boolean {
  const fileName = path.toLowerCase().split("/").at(-1) ?? path.toLowerCase();
  return (
    /^playwright\.config\.(?:ts|js|mts|mjs|cts|cjs)$/.test(fileName) ||
    /\.(?:spec|test)\.(?:ts|tsx|js|jsx|mts|mjs|cts|cjs)$/.test(fileName) ||
    fileName === "package.json" ||
    fileName === "package-lock.json" ||
    fileName === "pnpm-lock.yaml" ||
    fileName === "yarn.lock" ||
    /^tsconfig(?:\..+)?\.json$/.test(fileName)
  );
}

async function githubRequest<T>(
  fetcher: typeof fetch,
  path: string,
  token: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetcher(`${GITHUB_API}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new GitHubProviderError(`github_http_${response.status}`);
  }
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) {
    throw new GitHubProviderError("github_response_invalid");
  }
  return parsed.data;
}

async function installationToken(input: {
  fetcher: typeof fetch;
  appJwt: string;
  installationId: string;
  repositoryId: string;
}) {
  const repositoryId = Number(input.repositoryId);
  if (!Number.isSafeInteger(repositoryId) || repositoryId <= 0) {
    throw new GitHubProviderError("github_repository_id_invalid");
  }
  return githubRequest(
    input.fetcher,
    `/app/installations/${encodeURIComponent(input.installationId)}/access_tokens`,
    input.appJwt,
    tokenResponseSchema,
    {
      method: "POST",
      body: JSON.stringify({
        repository_ids: [repositoryId],
        permissions: { contents: "read" },
      }),
      headers: { "Content-Type": "application/json" },
    },
  );
}

export function createGitHubRepositorySnapshotProvider(input?: {
  fetcher?: typeof fetch;
  environment?: Readonly<Record<string, string | undefined>>;
}): RepositorySnapshotProvider {
  const environment = validateGitHubAppAuthenticationEnvironment(
    input?.environment,
  );
  const fetcher = input?.fetcher ?? fetch;

  return async (request): Promise<RepositorySourceSnapshot> => {
    const appJwt = createGitHubAppJwt({
      appId: environment.GITHUB_APP_ID,
      privateKey: environment.GITHUB_APP_PRIVATE_KEY,
    });
    const access = await installationToken({
      fetcher,
      appJwt,
      installationId: request.externalInstallationId,
      repositoryId: request.externalRepositoryId,
    });
    const owner = encodeURIComponent(request.ownerLogin);
    const repository = encodeURIComponent(request.repositoryName);
    const sourceRef = encodeURIComponent(request.sourceRef);
    const commit = await githubRequest(
      fetcher,
      `/repos/${owner}/${repository}/commits/${sourceRef}`,
      access.token,
      commitResponseSchema,
    );
    const tree = await githubRequest(
      fetcher,
      `/repos/${owner}/${repository}/git/trees/${encodeURIComponent(commit.commit.tree.sha)}?recursive=1`,
      access.token,
      treeResponseSchema,
    );
    const allCandidates = tree.tree.filter(
      (entry) => entry.type === "blob" && candidatePath(entry.path),
    );
    const candidates = allCandidates.slice(0, MAX_CANDIDATE_FILES);
    const files: RepositorySourceSnapshot["files"] = [];
    for (let offset = 0; offset < candidates.length; offset += BLOB_FETCH_CONCURRENCY) {
      const batch = candidates.slice(offset, offset + BLOB_FETCH_CONCURRENCY);
      files.push(...await Promise.all(batch.map(async (entry) => {
        const sizeBytes = entry.size ?? 0;
        if (sizeBytes > MAX_CANDIDATE_BYTES) {
          return { path: entry.path, blobSha: entry.sha, sizeBytes };
        }
        const blob = await githubRequest(
          fetcher,
          `/repos/${owner}/${repository}/git/blobs/${encodeURIComponent(entry.sha)}`,
          access.token,
          blobResponseSchema,
        );
        return {
          path: entry.path,
          blobSha: entry.sha,
          sizeBytes,
          content: Buffer.from(
            blob.content.replaceAll("\n", ""),
            "base64",
          ).toString("utf8"),
        };
      })));
    }

    return {
      externalRepositoryId: request.externalRepositoryId,
      commitSha: commit.sha,
      truncated: tree.truncated || allCandidates.length > MAX_CANDIDATE_FILES,
      files,
    };
  };
}
