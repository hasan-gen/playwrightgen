CREATE TYPE "TestCaseStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED');
CREATE TYPE "TestCasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "TestCaseType" AS ENUM ('FUNCTIONAL', 'END_TO_END', 'API', 'INTEGRATION', 'REGRESSION');
CREATE TYPE "TestCaseSource" AS ENUM ('MANUAL', 'IMPORTED', 'AI_SUGGESTED');
CREATE TYPE "AutomationStatus" AS ENUM ('MANUAL', 'CANDIDATE', 'DRAFT', 'AUTOMATED');

ALTER TYPE "ActivityAction" ADD VALUE 'TEST_CASE_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE 'TEST_CASE_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'TEST_CASE_SUBMITTED_FOR_REVIEW';
ALTER TYPE "ActivityAction" ADD VALUE 'TEST_CASE_CHANGES_REQUESTED';
ALTER TYPE "ActivityAction" ADD VALUE 'TEST_CASE_APPROVED';
ALTER TYPE "ActivityAction" ADD VALUE 'TEST_CASE_ARCHIVED';
ALTER TYPE "ActivityAction" ADD VALUE 'TEST_CASE_REQUIREMENT_LINKED';
ALTER TYPE "ActivityAction" ADD VALUE 'TEST_CASE_REQUIREMENT_UNLINKED';
ALTER TYPE "ActivityTargetType" ADD VALUE 'TEST_CASE';
ALTER TYPE "ActivityTargetType" ADD VALUE 'REQUIREMENT_TEST_CASE';

CREATE TABLE "TestCase" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "objective" TEXT NOT NULL,
    "preconditions" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "expectedResults" JSONB NOT NULL,
    "priority" "TestCasePriority" NOT NULL DEFAULT 'MEDIUM',
    "type" "TestCaseType" NOT NULL DEFAULT 'FUNCTIONAL',
    "status" "TestCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "TestCaseSource" NOT NULL DEFAULT 'MANUAL',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "automationStatus" "AutomationStatus" NOT NULL DEFAULT 'MANUAL',
    "ownerUserId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "submittedForReviewAt" TIMESTAMPTZ(3),
    "approvedAt" TIMESTAMPTZ(3),
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TestCase_currentVersionNumber_check" CHECK ("currentVersionNumber" > 0)
);

CREATE TABLE "TestCaseVersion" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "testCaseId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "objective" TEXT NOT NULL,
    "preconditions" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "expectedResults" JSONB NOT NULL,
    "priority" "TestCasePriority" NOT NULL,
    "type" "TestCaseType" NOT NULL,
    "source" "TestCaseSource" NOT NULL,
    "tags" TEXT[] NOT NULL,
    "automationStatus" "AutomationStatus" NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestCaseVersion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TestCaseVersion_versionNumber_check" CHECK ("versionNumber" > 0)
);

CREATE TABLE "RequirementTestCase" (
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "requirementId" UUID NOT NULL,
    "testCaseId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequirementTestCase_pkey" PRIMARY KEY ("organizationId", "projectId", "requirementId", "testCaseId")
);

CREATE UNIQUE INDEX "TestCase_organizationId_projectId_id_key" ON "TestCase"("organizationId", "projectId", "id");
CREATE INDEX "TestCase_organizationId_projectId_status_updatedAt_idx" ON "TestCase"("organizationId", "projectId", "status", "updatedAt");
CREATE INDEX "TestCase_ownerUserId_status_idx" ON "TestCase"("ownerUserId", "status");
CREATE UNIQUE INDEX "TestCaseVersion_organizationId_projectId_testCaseId_versionNumber_key" ON "TestCaseVersion"("organizationId", "projectId", "testCaseId", "versionNumber");
CREATE INDEX "TestCaseVersion_testCaseId_createdAt_idx" ON "TestCaseVersion"("testCaseId", "createdAt");
CREATE INDEX "RequirementTestCase_testCaseId_createdAt_idx" ON "RequirementTestCase"("testCaseId", "createdAt");
CREATE INDEX "RequirementTestCase_requirementId_createdAt_idx" ON "RequirementTestCase"("requirementId", "createdAt");

ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_organizationId_projectId_fkey" FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "TestCaseVersion" ADD CONSTRAINT "TestCaseVersion_organizationId_projectId_testCaseId_fkey" FOREIGN KEY ("organizationId", "projectId", "testCaseId") REFERENCES "TestCase"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TestCaseVersion" ADD CONSTRAINT "TestCaseVersion_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "TestCaseVersion" ADD CONSTRAINT "TestCaseVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "RequirementTestCase" ADD CONSTRAINT "RequirementTestCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "RequirementTestCase" ADD CONSTRAINT "RequirementTestCase_organizationId_projectId_fkey" FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "RequirementTestCase" ADD CONSTRAINT "RequirementTestCase_organizationId_projectId_requirementId_fkey" FOREIGN KEY ("organizationId", "projectId", "requirementId") REFERENCES "Requirement"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "RequirementTestCase" ADD CONSTRAINT "RequirementTestCase_organizationId_projectId_testCaseId_fkey" FOREIGN KEY ("organizationId", "projectId", "testCaseId") REFERENCES "TestCase"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "RequirementTestCase" ADD CONSTRAINT "RequirementTestCase_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
