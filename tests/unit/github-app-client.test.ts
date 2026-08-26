import { generateKeyPairSync } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  createGitHubAppJwt,
  createGitHubRepositorySnapshotProvider,
} from "@/lib/integrations/github/app-client";

function privateKey() {
  return generateKeyPairSync("rsa", { modulusLength: 2048 })
    .privateKey.export({ type: "pkcs8", format: "pem" })
    .toString();
}

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("least-privilege GitHub App client", () => {
  it("creates a short-lived app JWT", () => {
    const now = new Date("2026-08-25T12:00:00.000Z");
    const jwt = createGitHubAppJwt({ appId: "123", privateKey: privateKey(), now });
    const [, encodedPayload] = jwt.split(".");
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as { iat: number; exp: number; iss: string };

    expect(payload.iss).toBe("123");
    expect(payload.exp - payload.iat).toBe(600);
  });

  it("mints a repository-restricted read token and returns bounded source evidence", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({
        token: "installation-token-never-returned",
        expires_at: "2026-08-25T12:30:00Z",
      }))
      .mockResolvedValueOnce(jsonResponse({
        sha: "a".repeat(40),
        commit: { tree: { sha: "tree-sha" } },
      }))
      .mockResolvedValueOnce(jsonResponse({
        truncated: false,
        tree: [
          {
            path: "playwright.config.ts",
            type: "blob",
            sha: "config-blob",
            size: 20,
          },
          {
            path: ".env",
            type: "blob",
            sha: "secret-blob",
            size: 20,
          },
        ],
      }))
      .mockResolvedValueOnce(jsonResponse({
        content: Buffer.from("export default {}", "utf8").toString("base64"),
        encoding: "base64",
      }));
    const provider = createGitHubRepositorySnapshotProvider({
      fetcher,
      environment: {
        GITHUB_APP_ID: "123",
        GITHUB_APP_PRIVATE_KEY: privateKey(),
        GITHUB_WEBHOOK_SECRET: "webhook-secret",
      },
    });

    const snapshot = await provider({
      externalInstallationId: "456",
      externalRepositoryId: "789",
      ownerLogin: "acme",
      repositoryName: "storefront",
      sourceRef: "main",
    });

    const tokenRequest = fetcher.mock.calls[0];
    expect(tokenRequest[0]).toBe(
      "https://api.github.com/app/installations/456/access_tokens",
    );
    expect(JSON.parse(String(tokenRequest[1]?.body))).toEqual({
      repository_ids: [789],
      permissions: { contents: "read" },
    });
    expect(snapshot).toMatchObject({
      externalRepositoryId: "789",
      commitSha: "a".repeat(40),
      truncated: false,
      files: [{ path: "playwright.config.ts", content: "export default {}" }],
    });
    expect(snapshot.files).toHaveLength(1);
    expect(JSON.stringify(snapshot)).not.toContain("installation-token");
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
});
