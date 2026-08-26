import { ProjectNavigation } from "@/components/workspace/project-navigation";
import { listRepositoryConnections } from "@/lib/services/repository-imports";

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

export default async function ProjectRepositoriesPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectId: string }>;
}) {
  const { orgSlug, projectId } = await params;
  const connections = await listRepositoryConnections({ orgSlug, projectId });

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
              The secure connection foundation is ready. Installation setup is
              intentionally unavailable until the GitHub App credentials and
              signed lifecycle callback are configured for this environment.
            </p>
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
