import Link from "next/link";

export function ProjectNavigation({
  organizationSlug,
  projectId,
}: {
  organizationSlug: string;
  projectId: string;
}) {
  const base = `/workspace/${organizationSlug}/projects/${projectId}`;

  return (
    <nav className="mb-8 flex gap-1 border-b border-slate-200" aria-label="Project">
      <Link
        href={`${base}/overview`}
        className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-950"
      >
        Overview
      </Link>
      <Link
        href={`${base}/requirements`}
        className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-950"
      >
        Requirements
      </Link>
      <Link
        href={`${base}/test-cases`}
        className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-950"
      >
        Test Cases
      </Link>
      <Link
        href={`${base}/test-runs`}
        className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-950"
      >
        Test Runs
      </Link>
    </nav>
  );
}
