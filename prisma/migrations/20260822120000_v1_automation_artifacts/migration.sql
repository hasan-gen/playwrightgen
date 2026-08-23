CREATE TYPE "AutomationEngine" AS ENUM ('PLAYWRIGHT_BROWSER', 'PLAYWRIGHT_API');
CREATE TYPE "AutomationArtifactStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED');
CREATE TYPE "AutomationValidationStatus" AS ENUM ('PASSED', 'WARNINGS', 'BLOCKED');

ALTER TYPE "ActivityAction" ADD VALUE 'AUTOMATION_ARTIFACT_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE 'AUTOMATION_VERSION_GENERATED';
ALTER TYPE "ActivityAction" ADD VALUE 'AUTOMATION_SUBMITTED_FOR_REVIEW';
ALTER TYPE "ActivityAction" ADD VALUE 'AUTOMATION_CHANGES_REQUESTED';
ALTER TYPE "ActivityAction" ADD VALUE 'AUTOMATION_APPROVED';
ALTER TYPE "ActivityTargetType" ADD VALUE 'AUTOMATION_ARTIFACT';
ALTER TYPE "ActivityTargetType" ADD VALUE 'AUTOMATION_ARTIFACT_VERSION';

CREATE TABLE "AutomationArtifact" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "testCaseId" UUID NOT NULL,
  "testCaseVersionId" UUID NOT NULL,
  "engine" "AutomationEngine" NOT NULL,
  "name" VARCHAR(300) NOT NULL,
  "status" "AutomationArtifactStatus" NOT NULL DEFAULT 'DRAFT',
  "currentVersionNumber" INTEGER NOT NULL DEFAULT 0,
  "approvedVersionNumber" INTEGER,
  "createdByUserId" UUID NOT NULL,
  "approvedByUserId" UUID,
  "submittedForReviewAt" TIMESTAMPTZ(3),
  "approvedAt" TIMESTAMPTZ(3),
  "archivedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "AutomationArtifact_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AutomationArtifact_currentVersionNumber_check" CHECK ("currentVersionNumber" >= 0),
  CONSTRAINT "AutomationArtifact_approvedVersionNumber_check" CHECK (
    "approvedVersionNumber" IS NULL OR
    ("approvedVersionNumber" > 0 AND "approvedVersionNumber" <= "currentVersionNumber")
  )
);

CREATE TABLE "AutomationArtifactVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "automationArtifactId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "generationStatus" "AiRunStatus" NOT NULL DEFAULT 'RUNNING',
  "validationStatus" "AutomationValidationStatus" NOT NULL DEFAULT 'BLOCKED',
  "summary" TEXT NOT NULL,
  "plan" JSONB NOT NULL,
  "code" TEXT NOT NULL,
  "configuration" TEXT NOT NULL,
  "dependencies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "assumptions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "validationFindings" JSONB NOT NULL,
  "model" VARCHAR(100) NOT NULL,
  "promptVersion" VARCHAR(100) NOT NULL,
  "schemaVersion" VARCHAR(100) NOT NULL,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "totalTokens" INTEGER,
  "failureCode" VARCHAR(100),
  "createdByUserId" UUID NOT NULL,
  "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(3),
  CONSTRAINT "AutomationArtifactVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AutomationArtifactVersion_versionNumber_check" CHECK ("versionNumber" > 0)
);

CREATE UNIQUE INDEX "AutomationArtifact_organizationId_projectId_id_key"
  ON "AutomationArtifact"("organizationId", "projectId", "id");
CREATE UNIQUE INDEX "AutomationArtifact_organizationId_projectId_testCaseVersionId_engine_key"
  ON "AutomationArtifact"("organizationId", "projectId", "testCaseVersionId", "engine");
CREATE INDEX "AutomationArtifact_organizationId_projectId_status_updatedAt_idx"
  ON "AutomationArtifact"("organizationId", "projectId", "status", "updatedAt");
CREATE INDEX "AutomationArtifact_testCaseId_engine_updatedAt_idx"
  ON "AutomationArtifact"("testCaseId", "engine", "updatedAt");

CREATE UNIQUE INDEX "automation_version_number_unique"
  ON "AutomationArtifactVersion"("organizationId", "projectId", "automationArtifactId", "versionNumber");
CREATE UNIQUE INDEX "automation_version_tenant_id_unique"
  ON "AutomationArtifactVersion"("organizationId", "projectId", "automationArtifactId", "id");
CREATE INDEX "AutomationArtifactVersion_automationArtifactId_versionNumber_idx"
  ON "AutomationArtifactVersion"("automationArtifactId", "versionNumber");
CREATE INDEX "AutomationArtifactVersion_generationStatus_startedAt_idx"
  ON "AutomationArtifactVersion"("generationStatus", "startedAt");

ALTER TABLE "AutomationArtifact" ADD CONSTRAINT "AutomationArtifact_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AutomationArtifact" ADD CONSTRAINT "AutomationArtifact_organizationId_projectId_fkey"
  FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AutomationArtifact" ADD CONSTRAINT "AutomationArtifact_organizationId_projectId_testCaseId_fkey"
  FOREIGN KEY ("organizationId", "projectId", "testCaseId") REFERENCES "TestCase"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AutomationArtifact" ADD CONSTRAINT "AutomationArtifact_organizationId_projectId_testCaseId_testCaseVersionId_fkey"
  FOREIGN KEY ("organizationId", "projectId", "testCaseId", "testCaseVersionId") REFERENCES "TestCaseVersion"("organizationId", "projectId", "testCaseId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AutomationArtifact" ADD CONSTRAINT "AutomationArtifact_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AutomationArtifact" ADD CONSTRAINT "AutomationArtifact_approvedByUserId_fkey"
  FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "AutomationArtifactVersion" ADD CONSTRAINT "AutomationArtifactVersion_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AutomationArtifactVersion" ADD CONSTRAINT "AutomationArtifactVersion_organizationId_projectId_fkey"
  FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AutomationArtifactVersion" ADD CONSTRAINT "AutomationArtifactVersion_organizationId_projectId_automationArtifactId_fkey"
  FOREIGN KEY ("organizationId", "projectId", "automationArtifactId") REFERENCES "AutomationArtifact"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AutomationArtifactVersion" ADD CONSTRAINT "AutomationArtifactVersion_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
