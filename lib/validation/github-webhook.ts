import { z } from "zod";

const externalIdSchema = z
  .union([
    z.string().regex(/^\d+$/).max(32),
    z.number().int().positive().safe(),
  ])
  .transform(String);
const safeProviderText = z.string().trim().min(1).max(255);
const actionSchema = z.string().trim().min(1).max(64);

const providerDateSchema = z
  .union([z.string(), z.number()])
  .transform((value, context) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      context.addIssue({ code: "custom", message: "Invalid provider date." });
      return z.NEVER;
    }
    return date;
  });

const installationSchema = z.object({
  id: externalIdSchema,
  account: z.object({
    id: externalIdSchema,
    login: safeProviderText,
    type: z.string().trim().min(1).max(50),
  }),
  repository_selection: z.enum(["all", "selected"]),
  updated_at: providerDateSchema.optional(),
  suspended_at: providerDateSchema.nullable().optional(),
});

const repositoryIdentitySchema = z.object({
  id: externalIdSchema,
});

const installationPayloadSchema = z.object({
  action: actionSchema,
  installation: installationSchema,
});

const installationRepositoriesPayloadSchema = z.object({
  action: actionSchema,
  installation: installationSchema,
  repository_selection: z.enum(["all", "selected"]),
  repositories_added: z.array(repositoryIdentitySchema).max(10_000),
  repositories_removed: z.array(repositoryIdentitySchema).max(10_000),
});

const installationActions = new Set([
  "created",
  "deleted",
  "suspend",
  "unsuspend",
  "new_permissions_accepted",
]);

const repositoryActions = new Set(["added", "removed"]);

export class GitHubWebhookPayloadError extends Error {
  constructor() {
    super("The verified GitHub webhook payload is invalid.");
    this.name = "GitHubWebhookPayloadError";
  }
}

export type NormalizedGitHubInstallationEvent = {
  kind: "installation";
  action:
    | "created"
    | "deleted"
    | "suspend"
    | "unsuspend"
    | "new_permissions_accepted";
  externalInstallationId: string;
  accountId: string;
  accountLogin: string;
  accountType: string;
  repositorySelection: "all" | "selected";
  providerUpdatedAt: Date | null;
  providerSuspendedAt: Date | null;
};

export type NormalizedGitHubRepositoriesEvent = {
  kind: "installation_repositories";
  action: "added" | "removed";
  externalInstallationId: string;
  repositorySelection: "all" | "selected";
  providerUpdatedAt: Date | null;
  addedRepositoryIds: string[];
  removedRepositoryIds: string[];
};

export type NormalizedGitHubWebhookEvent =
  | NormalizedGitHubInstallationEvent
  | NormalizedGitHubRepositoriesEvent;

export type ParsedGitHubWebhook =
  | { kind: "event"; event: NormalizedGitHubWebhookEvent }
  | { kind: "ignored"; action: string };

function readAction(payload: unknown): string {
  const result = z.object({ action: actionSchema }).safeParse(payload);
  return result.success ? result.data.action : "unknown";
}

export function parseVerifiedGitHubWebhook(input: {
  eventName: string;
  payload: unknown;
}): ParsedGitHubWebhook {
  if (input.eventName === "installation") {
    const action = readAction(input.payload);
    if (!installationActions.has(action)) {
      return { kind: "ignored", action };
    }
    const result = installationPayloadSchema.safeParse(input.payload);
    if (!result.success) throw new GitHubWebhookPayloadError();
    const { installation } = result.data;
    return {
      kind: "event",
      event: {
        kind: "installation",
        action: action as NormalizedGitHubInstallationEvent["action"],
        externalInstallationId: installation.id,
        accountId: installation.account.id,
        accountLogin: installation.account.login,
        accountType: installation.account.type,
        repositorySelection: installation.repository_selection,
        providerUpdatedAt: installation.updated_at ?? null,
        providerSuspendedAt: installation.suspended_at ?? null,
      },
    };
  }

  if (input.eventName === "installation_repositories") {
    const action = readAction(input.payload);
    if (!repositoryActions.has(action)) {
      return { kind: "ignored", action };
    }
    const result = installationRepositoriesPayloadSchema.safeParse(
      input.payload,
    );
    if (!result.success) throw new GitHubWebhookPayloadError();
    return {
      kind: "event",
      event: {
        kind: "installation_repositories",
        action: action as NormalizedGitHubRepositoriesEvent["action"],
        externalInstallationId: result.data.installation.id,
        repositorySelection: result.data.repository_selection,
        providerUpdatedAt: result.data.installation.updated_at ?? null,
        addedRepositoryIds: result.data.repositories_added.map(
          (repository) => repository.id,
        ),
        removedRepositoryIds: result.data.repositories_removed.map(
          (repository) => repository.id,
        ),
      },
    };
  }

  return { kind: "ignored", action: readAction(input.payload) };
}
