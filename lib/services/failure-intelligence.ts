import "server-only";

import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import {
  analyzeFailureEvidence,
  validateFailureAnalysisEvidence,
  type FailureAnalysisEvidence,
  type FailureAnalysisResult,
} from "@/lib/ai/failure-analysis";
import {
  requireWorkspaceContext,
  type WorkspaceContextDependencies,
} from "@/lib/auth/workspace-context";
import { getPrismaClient } from "@/lib/db/prisma";
import { readTestCaseList } from "@/lib/services/test-cases";
import { readEvidence, readStepResults } from "@/lib/services/test-runs";

const uuidSchema = z.string().uuid();
const PROMPT_VERSION = "failure-analysis-v1";
const SCHEMA_VERSION = "failure-analysis-schema-v1";

type Dependencies = WorkspaceContextDependencies & {
  analyzer?: (evidence: FailureAnalysisEvidence) => Promise<FailureAnalysisResult>;
};

export class FailureIntelligenceDomainError extends Error {
  readonly code: string;
  readonly status: 400 | 404 | 409 | 502;

  constructor(code: string, status: 400 | 404 | 409 | 502) {
    super(code);
    this.name = "FailureIntelligenceDomainError";
    this.code = code;
    this.status = status;
  }
}

function parseUuid(value: string): string {
  const result = uuidSchema.safeParse(value);
  if (!result.success) throw new FailureIntelligenceDomainError("invalid_failure_input", 400);
  return result.data;
}

function client(dependencies?: Dependencies) {
  return dependencies?.prisma ?? getPrismaClient();
}

async function context(
  input: { orgSlug?: string; projectId: string },
  permission: "failure:read" | "failure:analyze" | "failure:resolve",
  dependencies?: Dependencies,
) {
  const projectId = parseUuid(input.projectId);
  const workspace = await requireWorkspaceContext(
    { orgSlug: input.orgSlug, projectId, permission },
    dependencies,
  );
  return { workspace, projectId };
}

export function buildFailureEvidence(input: {
  result: string;
  summary: string;
  failureDetails: string;
  stepResults: Prisma.JsonValue;
  evidence: Prisma.JsonValue;
  objective: string;
  steps: Prisma.JsonValue;
  expectedResults: Prisma.JsonValue;
}): FailureAnalysisEvidence {
  return {
    RUN_RESULT: input.result,
    SUMMARY: input.summary,
    FAILURE_DETAILS: input.failureDetails,
    STEP_RESULTS: readStepResults(input.stepResults)
      .map((step) => `Step ${step.stepIndex + 1}: ${step.result}${step.notes ? ` — ${step.notes}` : ""}`)
      .join("\n"),
    EVIDENCE_LINKS: readEvidence(input.evidence)
      .map((item) => `${item.label} (${item.kind}): ${item.url}`)
      .join("\n"),
    TEST_OBJECTIVE: input.objective,
    TEST_STEPS: readTestCaseList(input.steps)
      .map((step, index) => `${index + 1}. ${step}`)
      .join("\n"),
    EXPECTED_RESULTS: readTestCaseList(input.expectedResults)
      .map((result, index) => `${index + 1}. ${result}`)
      .join("\n"),
  };
}

export async function listFailureAnalyses(
  input: { orgSlug?: string; projectId: string; testRunId: string },
  dependencies?: Dependencies,
) {
  const testRunId = parseUuid(input.testRunId);
  const { workspace, projectId } = await context(input, "failure:read", dependencies);
  return client(dependencies).failureAnalysis.findMany({
    where: { organizationId: workspace.organization.id, projectId, testRunId },
    include: {
      createdBy: { select: { displayName: true } },
      attempt: { select: { attemptNumber: true, result: true } },
      findings: {
        include: { resolvedBy: { select: { displayName: true } } },
        orderBy: [{ confidence: "desc" }, { createdAt: "asc" }],
      },
    },
    orderBy: { startedAt: "desc" },
  });
}

export async function runFailureAnalysis(
  input: {
    orgSlug?: string;
    projectId: string;
    testRunId: string;
    testRunAttemptId: string;
    requestId?: string;
  },
  dependencies?: Dependencies,
) {
  const testRunId = parseUuid(input.testRunId);
  const testRunAttemptId = parseUuid(input.testRunAttemptId);
  const { workspace, projectId } = await context(input, "failure:analyze", dependencies);
  const attempt = await client(dependencies).testRunAttempt.findUnique({
    where: { organizationId_projectId_testRunId_id: {
      organizationId: workspace.organization.id,
      projectId,
      testRunId,
      id: testRunAttemptId,
    } },
    include: { testRun: { include: { testCaseVersion: true } } },
  });
  if (!attempt) throw new FailureIntelligenceDomainError("test_run_attempt_not_found", 404);
  if (attempt.result === "PASSED") {
    throw new FailureIntelligenceDomainError("failed_attempt_required", 409);
  }
  const configuredModel = process.env.OPENAI_FAILURE_ANALYSIS_MODEL?.trim() || "gpt-5-mini";
  const analysis = await client(dependencies).failureAnalysis.create({ data: {
    organizationId: workspace.organization.id,
    projectId,
    testRunId,
    testRunAttemptId,
    model: configuredModel,
    promptVersion: PROMPT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    createdByUserId: workspace.user.id,
  } });
  const evidence = buildFailureEvidence({
    result: attempt.result,
    summary: attempt.summary,
    failureDetails: attempt.failureDetails,
    stepResults: attempt.stepResults,
    evidence: attempt.evidence,
    objective: attempt.testRun.testCaseVersion.objective,
    steps: attempt.testRun.testCaseVersion.steps,
    expectedResults: attempt.testRun.testCaseVersion.expectedResults,
  });
  let result: FailureAnalysisResult;
  try {
    result = await (dependencies?.analyzer ?? analyzeFailureEvidence)(evidence);
    validateFailureAnalysisEvidence(result, evidence);
  } catch (error) {
    const failureCode = error instanceof Error && /^[a-z_]+$/.test(error.message)
      ? error.message
      : "provider_failure";
    await client(dependencies).failureAnalysis.update({
      where: { id: analysis.id },
      data: { status: "FAILED", failureCode, completedAt: new Date() },
    });
    throw new FailureIntelligenceDomainError("failure_analysis_failed", 502);
  }

  return client(dependencies).$transaction(async (transaction) => {
    await transaction.failureAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: "SUCCEEDED",
        model: result.model,
        summary: result.summary,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.totalTokens,
        completedAt: new Date(),
      },
    });
    await transaction.failureFinding.createMany({ data: result.findings.map((finding) => ({
      organizationId: workspace.organization.id,
      projectId,
      testRunId,
      testRunAttemptId,
      failureAnalysisId: analysis.id,
      ...finding,
    })) });
    await transaction.activity.create({ data: {
      organizationId: workspace.organization.id,
      projectId,
      actorUserId: workspace.user.id,
      source: "USER",
      action: "FAILURE_ANALYSIS_COMPLETED",
      targetType: "FAILURE_ANALYSIS",
      targetId: analysis.id,
      requestId: input.requestId ?? null,
      metadata: {
        testRunId,
        testRunAttemptId,
        attemptNumber: attempt.attemptNumber,
        findingCount: result.findings.length,
        promptVersion: PROMPT_VERSION,
        schemaVersion: SCHEMA_VERSION,
      },
    } });
    return transaction.failureAnalysis.findUniqueOrThrow({
      where: { id: analysis.id }, include: { findings: true },
    });
  });
}

export async function resolveFailureFinding(
  input: {
    orgSlug?: string;
    projectId: string;
    testRunId: string;
    findingId: string;
    resolution: "CONFIRMED" | "DISMISSED";
    requestId?: string;
  },
  dependencies?: Dependencies,
) {
  const testRunId = parseUuid(input.testRunId);
  const findingId = parseUuid(input.findingId);
  const { workspace, projectId } = await context(input, "failure:resolve", dependencies);
  return client(dependencies).$transaction(async (transaction) => {
    const update = await transaction.failureFinding.updateMany({
      where: {
        id: findingId,
        organizationId: workspace.organization.id,
        projectId,
        testRunId,
        status: "OPEN",
      },
      data: {
        status: input.resolution,
        resolvedByUserId: workspace.user.id,
        resolvedAt: new Date(),
      },
    });
    if (update.count !== 1) throw new FailureIntelligenceDomainError("failure_finding_not_open", 409);
    await transaction.activity.create({ data: {
      organizationId: workspace.organization.id,
      projectId,
      actorUserId: workspace.user.id,
      source: "USER",
      action: input.resolution === "CONFIRMED"
        ? "FAILURE_FINDING_CONFIRMED"
        : "FAILURE_FINDING_DISMISSED",
      targetType: "FAILURE_FINDING",
      targetId: findingId,
      requestId: input.requestId ?? null,
      metadata: { testRunId },
    } });
    return transaction.failureFinding.findUniqueOrThrow({ where: { id: findingId } });
  });
}

export function failureIntelligenceDomainErrorResponse(error: unknown): Response | null {
  if (!(error instanceof FailureIntelligenceDomainError)) return null;
  return Response.json({ status: "error", code: error.code }, { status: error.status });
}
