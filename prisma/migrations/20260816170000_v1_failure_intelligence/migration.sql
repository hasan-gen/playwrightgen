CREATE TYPE "FailureCategory" AS ENUM ('PRODUCT_DEFECT', 'TEST_DEFECT', 'ENVIRONMENT', 'TEST_DATA', 'DEPENDENCY', 'FLAKY_TIMING', 'UNKNOWN');
CREATE TYPE "FailureFindingStatus" AS ENUM ('OPEN', 'CONFIRMED', 'DISMISSED');

ALTER TYPE "ActivityAction" ADD VALUE 'FAILURE_ANALYSIS_COMPLETED';
ALTER TYPE "ActivityAction" ADD VALUE 'FAILURE_FINDING_CONFIRMED';
ALTER TYPE "ActivityAction" ADD VALUE 'FAILURE_FINDING_DISMISSED';
ALTER TYPE "ActivityTargetType" ADD VALUE 'FAILURE_ANALYSIS';
ALTER TYPE "ActivityTargetType" ADD VALUE 'FAILURE_FINDING';

CREATE UNIQUE INDEX "TestRunAttempt_organizationId_projectId_testRunId_id_key"
  ON "TestRunAttempt"("organizationId", "projectId", "testRunId", "id");

CREATE TABLE "FailureAnalysis" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "testRunId" UUID NOT NULL,
  "testRunAttemptId" UUID NOT NULL,
  "status" "AiRunStatus" NOT NULL DEFAULT 'RUNNING',
  "model" VARCHAR(100) NOT NULL,
  "promptVersion" VARCHAR(100) NOT NULL,
  "schemaVersion" VARCHAR(100) NOT NULL,
  "summary" TEXT,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "totalTokens" INTEGER,
  "failureCode" VARCHAR(100),
  "createdByUserId" UUID NOT NULL,
  "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(3),
  CONSTRAINT "FailureAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FailureFinding" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "testRunId" UUID NOT NULL,
  "testRunAttemptId" UUID NOT NULL,
  "failureAnalysisId" UUID NOT NULL,
  "category" "FailureCategory" NOT NULL,
  "confidence" INTEGER NOT NULL,
  "title" VARCHAR(300) NOT NULL,
  "explanation" TEXT NOT NULL,
  "evidenceField" VARCHAR(100) NOT NULL,
  "evidenceQuote" TEXT NOT NULL,
  "recommendation" TEXT NOT NULL,
  "status" "FailureFindingStatus" NOT NULL DEFAULT 'OPEN',
  "resolvedByUserId" UUID,
  "resolvedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FailureFinding_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FailureFinding_confidence_check" CHECK ("confidence" >= 0 AND "confidence" <= 100)
);

CREATE UNIQUE INDEX "FailureAnalysis_organizationId_projectId_id_key" ON "FailureAnalysis"("organizationId", "projectId", "id");
CREATE INDEX "FailureAnalysis_organizationId_projectId_testRunAttemptId_startedAt_idx" ON "FailureAnalysis"("organizationId", "projectId", "testRunAttemptId", "startedAt");
CREATE INDEX "FailureAnalysis_status_startedAt_idx" ON "FailureAnalysis"("status", "startedAt");
CREATE INDEX "FailureFinding_organizationId_projectId_testRunAttemptId_status_idx" ON "FailureFinding"("organizationId", "projectId", "testRunAttemptId", "status");
CREATE INDEX "FailureFinding_failureAnalysisId_createdAt_idx" ON "FailureFinding"("failureAnalysisId", "createdAt");

ALTER TABLE "FailureAnalysis" ADD CONSTRAINT "FailureAnalysis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "FailureAnalysis" ADD CONSTRAINT "FailureAnalysis_organizationId_projectId_fkey" FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "FailureAnalysis" ADD CONSTRAINT "FailureAnalysis_organizationId_projectId_testRunId_fkey" FOREIGN KEY ("organizationId", "projectId", "testRunId") REFERENCES "TestRun"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "FailureAnalysis" ADD CONSTRAINT "FailureAnalysis_organizationId_projectId_testRunId_testRunAttemptId_fkey" FOREIGN KEY ("organizationId", "projectId", "testRunId", "testRunAttemptId") REFERENCES "TestRunAttempt"("organizationId", "projectId", "testRunId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "FailureAnalysis" ADD CONSTRAINT "FailureAnalysis_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "FailureFinding" ADD CONSTRAINT "FailureFinding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "FailureFinding" ADD CONSTRAINT "FailureFinding_organizationId_projectId_fkey" FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "FailureFinding" ADD CONSTRAINT "FailureFinding_organizationId_projectId_testRunId_testRunAttemptId_fkey" FOREIGN KEY ("organizationId", "projectId", "testRunId", "testRunAttemptId") REFERENCES "TestRunAttempt"("organizationId", "projectId", "testRunId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "FailureFinding" ADD CONSTRAINT "FailureFinding_organizationId_projectId_failureAnalysisId_fkey" FOREIGN KEY ("organizationId", "projectId", "failureAnalysisId") REFERENCES "FailureAnalysis"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "FailureFinding" ADD CONSTRAINT "FailureFinding_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
