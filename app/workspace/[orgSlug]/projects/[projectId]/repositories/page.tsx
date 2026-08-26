import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ProjectNavigation } from "@/components/workspace/project-navigation";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";
import { validateGitHubSetupEnvironment } from "@/lib/env";
import {
  connectVerifiedGitHubRepository,
  listConnectableGitHubRepositories,
  listRepositoryConnections,
} from "@/lib/services/repository-imports";

const connectionStatusStyle = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  ACCESS_REMOVED: "bg-amber-50 text-amber-800",
  DISCONNECTED: "bg-slate-100 text-slate-500",
} as const;

const importStatusStyle = {
  RUNNING: "bg-sky-50 text-sky-700",
  SUCCEEDED: "bg-emerald-50 text-emerald-700",
  INCOMPLETE: "bg-amber-50 text-amber-800",
  FAILED: "bg-red-50 text-red-700",
} as const;

function shortSha(value: string | null) {
  return value ? value.slice(0, 8) : "Not resolved";
}

async function connectRepositoryAction(formData: FormData) {
  "use server";

  const orgSlug = String(formData.get("orgSlug") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const destination =
    "/workspace/" +
    encodeURIComponent(orgSlug) +
    "/projects/" +
    encodeURIComponent(projectId) +
    "/repositories";
  try {
    await connectVerifiedGitHubRepository({
      orgSlug,
      projectId,
      githubInstallationId: String(
        formData.get("githubInstallationId") ?? "",
      ),
      externalRepositoryId: String(
        formData.get("externalRepositoryId") ?? "",
      ),
    });
  } catch {
    redirect(destination + "?github=connection_failed");
  }
  revalidatePath(destination);
  redirect(destination + "?github=repository_connected");
}

export default async function ProjectRepositoriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; projectId: string }>;
  searchParams: Promise<{ github?: string }>;
}) {
  const { orgSlug, projectId } = await params;
  const { github: githubResult } = await searchParams;
  const [context, connections] = await Promise.all([
    requireWorkspaceContext({ orgSlug, projectId }),
    listRepositoryConnections({ orgSlug, projectId }),
  ]);
  let setupConfigured = true;
  try {
    validateGitHubSetupEnvironment();
  } catch {
    setupConfigured = false;
  }
  let connectableRepositories: Awaited<
    ReturnType<typeof listConnectableGitHubRepositories>
  > = [];
  let repositoryDiscoveryFailed = false;
  if (context.can("repository:connect")) {
    try {
      connectableRepositories = await listConnectableGitHubRepositories({
        orgSlug,
        projectId,
      });
    } catch {
      repositoryDiscoveryFailed = true;
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <ProjectNavigation organizationSlug={orgSlug} projectId={projectId} />

      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Repository evidence
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Connect tests to their source
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Review the exact commit, Playwright configuration, and test inventory
          imported from GitHub. Imports remain preliminary until your team
          creates or links approved Workspace records.
        </p>
      </header>

      {githubResult === "connected" ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          GitHub identity and installation access were verified. Choose a
          repository below to attach it to this project.
        </div>
      ) : null}
      {githubResult === "repository_connected" ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Repository connected with fresh GitHub access verification.
        </div>
      ) : null}
      {githubResult === "failed" || githubResult === "connection_failed" ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          GitHub setup could not be verified. No installation or repository
          authority was changed.
        </div>
      ) : null}

      {connectableRepositories.length ? (
        <section className="mt-8 rounded-3xl border border-cyan-200 bg-cyan-50/40 p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                Available from GitHub
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                Select repository evidence
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                This list is fetched live from the verified App installation.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {connectableRepositories.map((repository) => (
              <div
                key={
                  repository.githubInstallationId +
                  ":" +
                  repository.externalRepositoryId
                }
                className="flex flex-col justify-between gap-4 rounded-2xl border border-cyan-100 bg-white p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-950">
                    {repository.fullName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {repository.visibility.toLowerCase()} /{" "}
                    {repository.defaultBranch} / {repository.accountLogin}
                  </p>
                </div>
                {repository.connectionStatus === "ACTIVE" ? (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Connected
                  </span>
                ) : (
                  <form action={connectRepositoryAction}>
                    <input type="hidden" name="orgSlug" value={orgSlug} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <input
                      type="hidden"
                      name="githubInstallationId"
                      value={repository.githubInstallationId}
                    />
                    <input
                      type="hidden"
                      name="externalRepositoryId"
                      value={repository.externalRepositoryId}
                    />
                    <button
                      type="submit"
                      className="shrink-0 rounded-full bg-cyan-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cyan-700"
                    >
                      Connect
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        {connections.length ? (
          <div className="space-y-8">
            {connections.map((connection) => {
              const latestImport = connection.imports[0];
              return (
                <article key={connection.id}>
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${connectionStatusStyle[connection.status]}`}>
                          {connection.status.replaceAll("_", " ")}
                        </span>
                        <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800">
                          {connection.visibility.toLowerCase()}
                        </span>
                      </div>
                      <h2 className="mt-3 text-xl font-semibold tracking-tight">
                        {connection.fullName}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Default branch {connection.defaultBranch} · GitHub account {connection.installation.accountLogin}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {connection.lastImportedAt
                        ? `Last imported ${connection.lastImportedAt.toLocaleString()}`
                        : "No import recorded"}
                    </p>
                  </div>

                  {latestImport ? (
                    <div className="mt-6 rounded-2xl bg-slate-950 p-5 text-white sm:p-6">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${importStatusStyle[latestImport.status]}`}>
                            {latestImport.status.toLowerCase()}
                          </span>
                          <code className="text-xs text-slate-300">
                            {latestImport.sourceRef}@{shortSha(latestImport.commitSha)}
                          </code>
                        </div>
                        <p className="text-xs text-slate-400">
                          Parser {latestImport.parserVersion}
                        </p>
                      </div>

                      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          ["Configs", latestImport.configurationCount],
                          ["Spec files", latestImport.testFileCount],
                          ["Test declarations", latestImport.discoveredTestCount],
                          ["Support files", latestImport.supportFileCount],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-xl bg-white/5 p-3">
                            <dt className="text-xs text-slate-400">{label}</dt>
                            <dd className="mt-1 text-xl font-semibold">{value}</dd>
                          </div>
                        ))}
                      </dl>

                      {latestImport.limitations.length ? (
                        <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
                            Missing or incomplete evidence
                          </p>
                          <ul className="mt-2 space-y-1 text-sm text-amber-50">
                            {latestImport.limitations.map((limitation) => (
                              <li key={limitation}>· {limitation.replaceAll("_", " ")}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {latestImport.files.length ? (
                        <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
                          {latestImport.files.map((file) => (
                            <div
                              key={file.id}
                              className="flex flex-col justify-between gap-1 border-b border-white/10 px-4 py-3 text-sm last:border-b-0 sm:flex-row sm:items-center"
                            >
                              <code className="break-all text-slate-100">{file.path}</code>
                              <span className="shrink-0 text-xs text-slate-400">
                                {file.kind.replaceAll("_", " ").toLowerCase()}
                                {file.kind === "TEST_SPEC"
                                  ? ` · ${file.discoveredTestCount} tests`
                                  : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-6 rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/40 p-6">
                      <p className="font-semibold">No source snapshot yet</p>
                      <p className="mt-1 text-sm text-slate-600">
                        This connection has not produced repository evidence.
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mx-auto max-w-2xl py-8 text-center sm:py-12">
            <span className="inline-flex rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
              Read-only GitHub App
            </span>
            <h2 className="mt-4 text-xl font-semibold">No repository connected</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Install the read-only PlaywrightGen GitHub App, verify your GitHub
              access, then choose the repository whose test evidence belongs to
              this project.
            </p>
            {context.can("organization:manage") && setupConfigured ? (
              <Link
                href={
                  "/api/github/setup/start?orgSlug=" +
                  encodeURIComponent(orgSlug) +
                  "&projectId=" +
                  encodeURIComponent(projectId)
                }
                className="mt-5 inline-flex rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700"
              >
                Connect GitHub
              </Link>
            ) : (
              <p className="mt-5 text-xs font-medium text-amber-700">
                {context.can("organization:manage")
                  ? "GitHub App setup is not configured in this environment."
                  : "An organization Owner or Admin must install the GitHub App."}
              </p>
            )}
            {repositoryDiscoveryFailed ? (
              <p className="mt-3 text-xs text-red-700">
                Live repository access could not be refreshed. Existing
                evidence remains unchanged.
              </p>
            ) : null}
            <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
              {[
                ["Permissions", "Metadata and Contents read only"],
                ["Imports", "Pinned to an exact commit"],
                ["Execution", "Disabled until runner isolation passes"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="mt-2 text-sm font-medium text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
