import { revalidatePath } from "next/cache";
import Link from "next/link";

import { readTestCaseList } from "@/lib/services/test-cases";
import {
  cancelTestRun,
  getTestRunDetail,
  readEvidence,
  readStepResults,
  recordTestRunAttempt,
} from "@/lib/services/test-runs";

const resultStyle = {
  NOT_STARTED: "bg-slate-100 text-slate-700", PASSED: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-red-50 text-red-700", BLOCKED: "bg-amber-50 text-amber-800",
  CANCELED: "bg-slate-100 text-slate-500",
} as const;

export default async function TestRunDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectId: string; testRunId: string }>;
}) {
  const { orgSlug, projectId, testRunId } = await params;
  const detail = await getTestRunDetail({ orgSlug, projectId, testRunId });
  const { testRun } = detail;
  const path = `/workspace/${orgSlug}/projects/${projectId}/test-runs/${testRunId}`;
  const listPath = `/workspace/${orgSlug}/projects/${projectId}/test-runs`;
  const steps = readTestCaseList(testRun.testCaseVersion.steps);
  const expectedResults = readTestCaseList(testRun.testCaseVersion.expectedResults);

  async function recordAction(formData: FormData) {
    "use server";
    const evidence = String(formData.get("evidence") ?? "").split(/\r?\n/).map((url) => url.trim()).filter(Boolean).map((url, index) => ({ kind: "LINK" as const, label: `Evidence ${index + 1}`, url }));
    const stepResults = steps.map((_, index) => ({
      stepIndex: index,
      result: String(formData.get(`step-${index}-result`) ?? "SKIPPED") as "PASSED" | "FAILED" | "BLOCKED" | "SKIPPED",
      notes: String(formData.get(`step-${index}-notes`) ?? ""),
    }));
    const durationSeconds = Number(formData.get("durationSeconds"));
    await recordTestRunAttempt({
      orgSlug, projectId, testRunId,
      expectedAttemptNumber: Number(formData.get("expectedAttemptNumber")),
      result: String(formData.get("result")) as "PASSED" | "FAILED" | "BLOCKED",
      durationMs: Number.isFinite(durationSeconds) && durationSeconds >= 0 ? Math.round(durationSeconds * 1000) : null,
      summary: String(formData.get("summary") ?? ""),
      failureDetails: String(formData.get("failureDetails") ?? ""),
      stepResults,
      evidence,
    });
    revalidatePath(path); revalidatePath(listPath);
  }
  async function cancelAction() {
    "use server";
    await cancelTestRun({ orgSlug, projectId, testRunId });
    revalidatePath(path); revalidatePath(listPath);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link href={listPath} className="text-sm font-medium text-cyan-700 hover:text-cyan-900">← Test Runs</Link>
      <header className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${resultStyle[testRun.status]}`}>{testRun.status.replace("_", " ")}</span><span className="text-xs text-slate-400">{testRun.latestAttemptNumber} attempts</span></div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{testRun.name}</h1>
          <p className="mt-3 text-sm text-slate-500">{testRun.mode.replaceAll("_", " ")} · {testRun.environment} · {testRun.browser}</p>
        </div>
        {testRun.status !== "CANCELED" && detail.canCancel ? <form action={cancelAction}><button className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">Cancel run</button></form> : null}
      </header>

      <section className="mt-8 rounded-2xl border border-cyan-200 bg-cyan-50/30 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Pinned test intent</p>
        <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><Link href={`/workspace/${orgSlug}/projects/${projectId}/test-cases/${testRun.testCase.id}`} className="text-lg font-semibold hover:text-cyan-700">{testRun.testCaseVersion.title}</Link><p className="mt-1 text-xs text-slate-400">Immutable Test Case version {testRun.testCaseVersion.versionNumber}</p></div><span className="text-xs font-semibold text-slate-500">{testRun.testCaseVersion.type.replaceAll("_", " ")} · {testRun.testCaseVersion.priority}</span></div>
        <p className="mt-5 text-sm leading-6 text-slate-700">{testRun.testCaseVersion.objective}</p>
        <div className="mt-5 grid gap-6 border-t border-cyan-100 pt-5 sm:grid-cols-2"><div><h2 className="text-xs font-semibold uppercase text-slate-400">Steps</h2><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">{steps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol></div><div><h2 className="text-xs font-semibold uppercase text-slate-400">Expected results</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">{expectedResults.map((result, index) => <li key={`${index}-${result}`}>{result}</li>)}</ul></div></div>
      </section>

      {testRun.status !== "CANCELED" && detail.canRecord ? (
        <form action={recordAction} className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Attempt {testRun.latestAttemptNumber + 1}</p><h2 className="mt-2 text-lg font-semibold">Record execution evidence</h2><p className="mt-1 text-sm text-slate-500">Submitting creates an immutable attempt. Corrections are recorded as another attempt.</p></div>
          <input type="hidden" name="expectedAttemptNumber" value={testRun.latestAttemptNumber} />
          <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-medium">Overall result<select name="result" defaultValue="PASSED" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5"><option>PASSED</option><option>FAILED</option><option>BLOCKED</option></select></label><label className="block text-sm font-medium">Duration in seconds<input name="durationSeconds" type="number" min="0" step="0.001" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label></div>
          <label className="block text-sm font-medium">Summary<textarea name="summary" rows={3} placeholder="What happened in this execution?" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
          <div><h3 className="text-sm font-semibold">Step results</h3><div className="mt-3 space-y-3">{steps.map((step, index) => <div key={`${index}-${step}`} className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_150px]"><div><p className="text-sm font-medium">{index + 1}. {step}</p><input name={`step-${index}-notes`} placeholder="Optional evidence or observation" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div><select name={`step-${index}-result`} defaultValue="PASSED" className="h-fit rounded-lg border border-slate-300 px-3 py-2 text-sm"><option>PASSED</option><option>FAILED</option><option>BLOCKED</option><option>SKIPPED</option></select></div>)}</div></div>
          <label className="block text-sm font-medium">Failure or blocker details<textarea name="failureDetails" rows={4} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
          <label className="block text-sm font-medium">Evidence URLs — one per line<textarea name="evidence" rows={3} placeholder={"https://example.com/screenshot\nhttps://example.com/trace"} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
          <button className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Record immutable attempt</button>
        </form>
      ) : null}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold">Attempt history</h2><p className="mt-1 text-sm text-slate-500">Newest first. Stored evidence cannot be edited or deleted.</p>
        {testRun.attempts.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">No attempts recorded.</p> : <div className="mt-6 space-y-4">{testRun.attempts.map((attempt) => { const evidence = readEvidence(attempt.evidence); const stepResults = readStepResults(attempt.stepResults); return <details key={attempt.id} className="rounded-xl border border-slate-200 p-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4"><div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${resultStyle[attempt.result]}`}>{attempt.result}</span><span className="text-sm font-semibold">Attempt {attempt.attemptNumber}</span></div><span className="text-xs text-slate-400">{attempt.executedBy.displayName || "Workspace member"} · {attempt.executedAt.toLocaleString()}</span></summary><div className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-700"><p>{attempt.summary || "No summary."}</p>{attempt.durationMs !== null ? <p className="mt-2 text-xs text-slate-400">Duration {(attempt.durationMs / 1000).toFixed(3)} seconds</p> : null}{attempt.failureDetails ? <div className="mt-4 rounded-lg bg-red-50 p-3 text-red-900"><span className="font-semibold">Failure/blocker: </span>{attempt.failureDetails}</div> : null}{stepResults.length ? <ul className="mt-4 space-y-2">{stepResults.map((step) => <li key={step.stepIndex} className="rounded-lg bg-slate-50 p-3"><span className="font-semibold">Step {step.stepIndex + 1}: {step.result}</span>{step.notes ? ` · ${step.notes}` : ""}</li>)}</ul> : null}{evidence.length ? <div className="mt-4 flex flex-wrap gap-2">{evidence.map((item) => <a key={`${item.label}-${item.url}`} href={item.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-cyan-700">{item.label}</a>)}</div> : null}</div></details>; })}</div>}
      </section>
    </div>
  );
}
