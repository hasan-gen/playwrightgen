CREATE TYPE "AiRunType" AS ENUM ('REQUIREMENT_REVIEW');
CREATE TYPE "AiRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "AiSuggestionCategory" AS ENUM ('AMBIGUITY', 'MISSING_ACCEPTANCE_CRITERIA', 'CONFLICT', 'TESTABILITY', 'EDGE_CASE', 'UNANSWERED_QUESTION');
CREATE TYPE "AiSuggestionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "AiSuggestionStatus" AS ENUM ('OPEN', 'ACCEPTED', 'DISMISSED');

ALTER TYPE "ActivityAction" ADD VALUE 'REQUIREMENT_REVIEW_COMPLETED';
ALTER TYPE "ActivityAction" ADD VALUE 'AI_SUGGESTION_ACCEPTED';
ALTER TYPE "ActivityAction" ADD VALUE 'AI_SUGGESTION_DISMISSED';
ALTER TYPE "ActivityTargetType" ADD VALUE 'AI_RUN';
ALTER TYPE "ActivityTargetType" ADD VALUE 'AI_SUGGESTION';

CREATE TABLE "AiRun" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "requirementId" UUID NOT NULL,
    "requirementVersionId" UUID NOT NULL,
    "type" "AiRunType" NOT NULL,
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
    CONSTRAINT "AiRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiSuggestion" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "requirementId" UUID NOT NULL,
    "requirementVersionId" UUID NOT NULL,
    "aiRunId" UUID NOT NULL,
    "category" "AiSuggestionCategory" NOT NULL,
    "severity" "AiSuggestionSeverity" NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "observation" TEXT NOT NULL,
    "evidenceField" VARCHAR(100) NOT NULL,
    "evidenceQuote" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "status" "AiSuggestionStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedByUserId" UUID,
    "resolvedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RequirementVersion_organizationId_projectId_requirementId_id_key" ON "RequirementVersion"("organizationId", "projectId", "requirementId", "id");
CREATE UNIQUE INDEX "AiRun_organizationId_projectId_id_key" ON "AiRun"("organizationId", "projectId", "id");
CREATE INDEX "AiRun_organizationId_projectId_requirementId_startedAt_idx" ON "AiRun"("organizationId", "projectId", "requirementId", "startedAt");
CREATE INDEX "AiRun_status_startedAt_idx" ON "AiRun"("status", "startedAt");
CREATE INDEX "AiSuggestion_organizationId_projectId_requirementId_status_idx" ON "AiSuggestion"("organizationId", "projectId", "requirementId", "status");
CREATE INDEX "AiSuggestion_aiRunId_createdAt_idx" ON "AiSuggestion"("aiRunId", "createdAt");

ALTER TABLE "AiRun" ADD CONSTRAINT "AiRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AiRun" ADD CONSTRAINT "AiRun_organizationId_projectId_fkey" FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AiRun" ADD CONSTRAINT "AiRun_organizationId_projectId_requirementId_fkey" FOREIGN KEY ("organizationId", "projectId", "requirementId") REFERENCES "Requirement"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AiRun" ADD CONSTRAINT "AiRun_organizationId_projectId_requirementId_requirementVersionId_fkey" FOREIGN KEY ("organizationId", "projectId", "requirementId", "requirementVersionId") REFERENCES "RequirementVersion"("organizationId", "projectId", "requirementId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AiRun" ADD CONSTRAINT "AiRun_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "AiSuggestion" ADD CONSTRAINT "AiSuggestion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AiSuggestion" ADD CONSTRAINT "AiSuggestion_organizationId_projectId_fkey" FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AiSuggestion" ADD CONSTRAINT "AiSuggestion_organizationId_projectId_requirementId_fkey" FOREIGN KEY ("organizationId", "projectId", "requirementId") REFERENCES "Requirement"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AiSuggestion" ADD CONSTRAINT "AiSuggestion_organizationId_projectId_requirementId_requirementVersionId_fkey" FOREIGN KEY ("organizationId", "projectId", "requirementId", "requirementVersionId") REFERENCES "RequirementVersion"("organizationId", "projectId", "requirementId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AiSuggestion" ADD CONSTRAINT "AiSuggestion_organizationId_projectId_aiRunId_fkey" FOREIGN KEY ("organizationId", "projectId", "aiRunId") REFERENCES "AiRun"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AiSuggestion" ADD CONSTRAINT "AiSuggestion_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
