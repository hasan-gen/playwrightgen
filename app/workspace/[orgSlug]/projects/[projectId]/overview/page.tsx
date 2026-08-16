import { revalidatePath } from "next/cache";

import {
  archiveProject,
  getProjectOverview,
  restoreProject,
} from "@/lib/services/projects";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectId: string }>;
}) {
  const { orgSlug, projectId } = await params;
  const overview = await getProjectOverview({
    orgSlug,
    projectId,
    allowArchived: true,
  });
  const { project } = overview;

  async function transitionAction(formData: FormData) {
    "use server";
    const intent = formData.get("intent");
    if (intent === "archive") {
      await archiveProject({ orgSlug, projectId });
    } else if (intent === "restore") {
      await restoreProject({ orgSlug, projectId });
    } else {
      throw new Error("Invalid project transition intent");
    }
    revalidatePath(`/workspace/${orgSlug}`);
    revalidatePath(`/workspace/${orgSlug}/projects/${projectId}/overview`);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Project overview</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{project.name}</h1>
          <p className="mt-2 text-sm text-slate-500">{project.slug}</p>
        </div>
        {overview.canArchive ? (
          <form action={transitionAction}>
            <input
              name="intent"
              type="hidden"
              value={project.status === "ACTIVE" ? "archive" : "restore"}
            />
            <button className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
              {project.status === "ACTIVE" ? "Archive project" : "Restore project"}
            </button>
          </form>
        ) : null}
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <dl className="grid gap-6 sm:grid-cols-2">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</dt><dd className="mt-2 text-sm font-medium">{project.status}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your role</dt><dd className="mt-2 text-sm font-medium">{overview.role}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Creator</dt><dd className="mt-2 text-sm font-medium">{project.createdBy.displayName || "Workspace member"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Created</dt><dd className="mt-2 text-sm">{project.createdAt.toLocaleString()}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Updated</dt><dd className="mt-2 text-sm">{project.updatedAt.toLocaleString()}</dd></div>
        </dl>
        <div className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="text-sm font-semibold">Description</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{project.description || "No description provided."}</p>
        </div>
      </section>
    </div>
  );
}
