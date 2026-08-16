CREATE TYPE "TestRunStatus" AS ENUM ('NOT_STARTED', 'PASSED', 'FAILED', 'BLOCKED', 'CANCELED');
CREATE TYPE "TestRunResult" AS ENUM ('PASSED', 'FAILED', 'BLOCKED');
CREATE TYPE "TestRunMode" AS ENUM ('MANUAL', 'PLAYWRIGHT_BROWSER', 'API');
CREATE TYPE "TestEnvironment" AS ENUM ('LOCAL', 'DEVELOPMENT', 'STAGING', 'PRODUCTION', 'OTHER');
CREATE TYPE "TestBrowser" AS ENUM ('NONE', 'CHROMIUM', 'FIREFOX', 'WEBKIT');

ALTER TYPE "ActivityAction" ADD VALUE 'TEST_RUN_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE 'TEST_RUN_ATTEMPT_RECORDED';
ALTER TYPE "ActivityAction" ADD VALUE 'TEST_RUN_CANCELED';
ALTER TYPE "ActivityTargetType" ADD VALUE 'TEST_RUN';
ALTER TYPE "ActivityTargetType" ADD VALUE 'TEST_RUN_ATTEMPT';

CREATE UNIQUE INDEX "TestCaseVersion_organizationId_projectId_testCaseId_id_key"
  ON "TestCaseVersion"("organizationId", "projectId", "testCaseId", "id");

CREATE TABLE "TestRun" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "testCaseId" UUID NOT NULL,
  "testCaseVersionId" UUID NOT NULL,
  "name" VARCHAR(300) NOT NULL,
  "status" "TestRunStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "mode" "TestRunMode" NOT NULL DEFAULT 'MANUAL',
  "environment" "TestEnvironment" NOT NULL DEFAULT 'DEVELOPMENT',
  "browser" "TestBrowser" NOT NULL DEFAULT 'NONE',
  "baseUrl" TEXT,
  "latestAttemptNumber" INTEGER NOT NULL DEFAULT 0,
  "createdByUserId" UUID NOT NULL,
  "canceledByUserId" UUID,
  "canceledAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TestRun_latestAttemptNumber_check" CHECK ("latestAttemptNumber" >= 0)
);

CREATE TABLE "TestRunAttempt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "testRunId" UUID NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "result" "TestRunResult" NOT NULL,
  "mode" "TestRunMode" NOT NULL,
  "environment" "TestEnvironment" NOT NULL,
  "browser" "TestBrowser" NOT NULL,
  "baseUrl" TEXT,
  "durationMs" INTEGER,
  "summary" TEXT NOT NULL,
  "failureDetails" TEXT NOT NULL,
  "stepResults" JSONB NOT NULL,
  "evidence" JSONB NOT NULL,
  "executedByUserId" UUID NOT NULL,
  "executedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TestRunAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TestRunAttempt_attemptNumber_check" CHECK ("attemptNumber" > 0),
  CONSTRAINT "TestRunAttempt_durationMs_check" CHECK ("durationMs" IS NULL OR "durationMs" >= 0)
);

CREATE UNIQUE INDEX "TestRun_organizationId_projectId_id_key" ON "TestRun"("organizationId", "projectId", "id");
CREATE INDEX "TestRun_organizationId_projectId_status_updatedAt_idx" ON "TestRun"("organizationId", "projectId", "status", "updatedAt");
CREATE INDEX "TestRun_testCaseId_createdAt_idx" ON "TestRun"("testCaseId", "createdAt");
CREATE INDEX "TestRun_testCaseVersionId_createdAt_idx" ON "TestRun"("testCaseVersionId", "createdAt");
CREATE UNIQUE INDEX "TestRunAttempt_organizationId_projectId_testRunId_attemptNumber_key" ON "TestRunAttempt"("organizationId", "projectId", "testRunId", "attemptNumber");
CREATE INDEX "TestRunAttempt_testRunId_executedAt_idx" ON "TestRunAttempt"("testRunId", "executedAt");

ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_organizationId_projectId_fkey" FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_organizationId_projectId_testCaseId_fkey" FOREIGN KEY ("organizationId", "projectId", "testCaseId") REFERENCES "TestCase"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_organizationId_projectId_testCaseId_testCaseVersionId_fkey" FOREIGN KEY ("organizationId", "projectId", "testCaseId", "testCaseVersionId") REFERENCES "TestCaseVersion"("organizationId", "projectId", "testCaseId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_canceledByUserId_fkey" FOREIGN KEY ("canceledByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "TestRunAttempt" ADD CONSTRAINT "TestRunAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TestRunAttempt" ADD CONSTRAINT "TestRunAttempt_organizationId_projectId_fkey" FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TestRunAttempt" ADD CONSTRAINT "TestRunAttempt_organizationId_projectId_testRunId_fkey" FOREIGN KEY ("organizationId", "projectId", "testRunId") REFERENCES "TestRun"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TestRunAttempt" ADD CONSTRAINT "TestRunAttempt_executedByUserId_fkey" FOREIGN KEY ("executedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
