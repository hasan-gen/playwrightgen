-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RequirementSource" AS ENUM ('MANUAL', 'IMPORTED', 'AI_SUGGESTED');

-- ExtendEnum
ALTER TYPE "ActivityAction" ADD VALUE 'REQUIREMENT_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE 'REQUIREMENT_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'REQUIREMENT_SUBMITTED_FOR_REVIEW';
ALTER TYPE "ActivityAction" ADD VALUE 'REQUIREMENT_CHANGES_REQUESTED';
ALTER TYPE "ActivityAction" ADD VALUE 'REQUIREMENT_APPROVED';
ALTER TYPE "ActivityAction" ADD VALUE 'REQUIREMENT_ARCHIVED';

-- ExtendEnum
ALTER TYPE "ActivityTargetType" ADD VALUE 'REQUIREMENT';

-- CreateTable
CREATE TABLE "Requirement" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT NOT NULL,
    "acceptanceCriteria" TEXT NOT NULL,
    "status" "RequirementStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "RequirementSource" NOT NULL DEFAULT 'MANUAL',
    "externalReference" VARCHAR(500),
    "ownerUserId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "submittedForReviewAt" TIMESTAMPTZ(3),
    "approvedAt" TIMESTAMPTZ(3),
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Requirement_currentVersionNumber_check" CHECK ("currentVersionNumber" > 0)
);

-- CreateTable
CREATE TABLE "RequirementVersion" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "requirementId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT NOT NULL,
    "acceptanceCriteria" TEXT NOT NULL,
    "source" "RequirementSource" NOT NULL,
    "externalReference" VARCHAR(500),
    "ownerUserId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementVersion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RequirementVersion_versionNumber_check" CHECK ("versionNumber" > 0)
);

-- CreateIndex
CREATE INDEX "Requirement_organizationId_projectId_status_updatedAt_idx" ON "Requirement"("organizationId", "projectId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Requirement_ownerUserId_status_idx" ON "Requirement"("ownerUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Requirement_organizationId_projectId_id_key" ON "Requirement"("organizationId", "projectId", "id");

-- CreateIndex
CREATE INDEX "RequirementVersion_requirementId_createdAt_idx" ON "RequirementVersion"("requirementId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementVersion_organizationId_projectId_requirementId_versionNumber_key" ON "RequirementVersion"("organizationId", "projectId", "requirementId", "versionNumber");

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_organizationId_projectId_fkey" FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "RequirementVersion" ADD CONSTRAINT "RequirementVersion_organizationId_projectId_requirementId_fkey" FOREIGN KEY ("organizationId", "projectId", "requirementId") REFERENCES "Requirement"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "RequirementVersion" ADD CONSTRAINT "RequirementVersion_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "RequirementVersion" ADD CONSTRAINT "RequirementVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
