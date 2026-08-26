CREATE TYPE "GitHubInstallationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REMOVED');
CREATE TYPE "RepositoryConnectionStatus" AS ENUM ('ACTIVE', 'ACCESS_REMOVED', 'DISCONNECTED');
CREATE TYPE "RepositoryVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'INTERNAL', 'UNKNOWN');
CREATE TYPE "RepositoryImportStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'INCOMPLETE', 'FAILED');
CREATE TYPE "RepositoryImportFileKind" AS ENUM ('PLAYWRIGHT_CONFIG', 'TEST_SPEC', 'SUPPORT_FILE');

ALTER TYPE "ActivityAction" ADD VALUE 'GITHUB_INSTALLATION_CONNECTED';
ALTER TYPE "ActivityAction" ADD VALUE 'REPOSITORY_CONNECTED';
ALTER TYPE "ActivityAction" ADD VALUE 'REPOSITORY_IMPORT_COMPLETED';
ALTER TYPE "ActivityTargetType" ADD VALUE 'GITHUB_INSTALLATION';
ALTER TYPE "ActivityTargetType" ADD VALUE 'REPOSITORY_CONNECTION';
ALTER TYPE "ActivityTargetType" ADD VALUE 'REPOSITORY_IMPORT';

CREATE TABLE "GitHubInstallation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "externalInstallationId" VARCHAR(32) NOT NULL,
  "accountId" VARCHAR(32) NOT NULL,
  "accountLogin" VARCHAR(255) NOT NULL,
  "accountType" VARCHAR(50) NOT NULL,
  "repositorySelection" VARCHAR(20) NOT NULL,
  "status" "GitHubInstallationStatus" NOT NULL DEFAULT 'ACTIVE',
  "connectedByUserId" UUID NOT NULL,
  "installedAt" TIMESTAMPTZ(3),
  "suspendedAt" TIMESTAMPTZ(3),
  "removedAt" TIMESTAMPTZ(3),
  "lastSyncedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "GitHubInstallation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GitHubInstallation_externalInstallationId_check" CHECK ("externalInstallationId" ~ '^[0-9]+$'),
  CONSTRAINT "GitHubInstallation_accountId_check" CHECK ("accountId" ~ '^[0-9]+$'),
  CONSTRAINT "GitHubInstallation_repositorySelection_check" CHECK ("repositorySelection" IN ('all', 'selected'))
);

CREATE TABLE "RepositoryConnection" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "githubInstallationId" UUID NOT NULL,
  "externalRepositoryId" VARCHAR(32) NOT NULL,
  "ownerLogin" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "fullName" VARCHAR(511) NOT NULL,
  "defaultBranch" VARCHAR(255) NOT NULL,
  "visibility" "RepositoryVisibility" NOT NULL DEFAULT 'UNKNOWN',
  "status" "RepositoryConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdByUserId" UUID NOT NULL,
  "lastImportedAt" TIMESTAMPTZ(3),
  "accessRemovedAt" TIMESTAMPTZ(3),
  "disconnectedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "RepositoryConnection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepositoryConnection_externalRepositoryId_check" CHECK ("externalRepositoryId" ~ '^[0-9]+$'),
  CONSTRAINT "RepositoryConnection_fullName_check" CHECK ("fullName" = "ownerLogin" || '/' || "name")
);

CREATE TABLE "RepositoryImport" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "repositoryConnectionId" UUID NOT NULL,
  "idempotencyKey" VARCHAR(100) NOT NULL,
  "sourceRef" VARCHAR(255) NOT NULL,
  "commitSha" CHAR(40),
  "parserVersion" VARCHAR(50) NOT NULL,
  "status" "RepositoryImportStatus" NOT NULL DEFAULT 'RUNNING',
  "configurationCount" INTEGER NOT NULL DEFAULT 0,
  "testFileCount" INTEGER NOT NULL DEFAULT 0,
  "supportFileCount" INTEGER NOT NULL DEFAULT 0,
  "discoveredTestCount" INTEGER NOT NULL DEFAULT 0,
  "limitations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "failureCode" VARCHAR(100),
  "requestedByUserId" UUID NOT NULL,
  "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(3),
  CONSTRAINT "RepositoryImport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepositoryImport_commitSha_check" CHECK ("commitSha" IS NULL OR "commitSha" ~ '^[0-9a-f]{40}$'),
  CONSTRAINT "RepositoryImport_counts_check" CHECK (
    "configurationCount" >= 0 AND
    "testFileCount" >= 0 AND
    "supportFileCount" >= 0 AND
    "discoveredTestCount" >= 0
  )
);

CREATE TABLE "RepositoryImportFile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "repositoryImportId" UUID NOT NULL,
  "path" VARCHAR(1000) NOT NULL,
  "kind" "RepositoryImportFileKind" NOT NULL,
  "blobSha" VARCHAR(64) NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "discoveredTestCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RepositoryImportFile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepositoryImportFile_sizeBytes_check" CHECK ("sizeBytes" >= 0),
  CONSTRAINT "RepositoryImportFile_discoveredTestCount_check" CHECK ("discoveredTestCount" >= 0)
);

CREATE UNIQUE INDEX "GitHubInstallation_externalInstallationId_key"
  ON "GitHubInstallation"("externalInstallationId");
CREATE UNIQUE INDEX "GitHubInstallation_organizationId_id_key"
  ON "GitHubInstallation"("organizationId", "id");
CREATE INDEX "GitHubInstallation_organizationId_status_updatedAt_idx"
  ON "GitHubInstallation"("organizationId", "status", "updatedAt");

CREATE UNIQUE INDEX "RepositoryConnection_organizationId_projectId_id_key"
  ON "RepositoryConnection"("organizationId", "projectId", "id");
CREATE UNIQUE INDEX "RepositoryConnection_organizationId_projectId_externalRepositoryId_key"
  ON "RepositoryConnection"("organizationId", "projectId", "externalRepositoryId");
CREATE INDEX "RepositoryConnection_organizationId_projectId_status_updatedAt_idx"
  ON "RepositoryConnection"("organizationId", "projectId", "status", "updatedAt");
CREATE INDEX "RepositoryConnection_githubInstallationId_status_idx"
  ON "RepositoryConnection"("githubInstallationId", "status");

CREATE UNIQUE INDEX "RepositoryImport_organizationId_projectId_id_key"
  ON "RepositoryImport"("organizationId", "projectId", "id");
CREATE UNIQUE INDEX "repository_import_idempotency_unique"
  ON "RepositoryImport"("organizationId", "projectId", "repositoryConnectionId", "idempotencyKey");
CREATE UNIQUE INDEX "repository_import_snapshot_unique"
  ON "RepositoryImport"("organizationId", "projectId", "repositoryConnectionId", "commitSha", "parserVersion");
CREATE INDEX "RepositoryImport_organizationId_projectId_status_startedAt_idx"
  ON "RepositoryImport"("organizationId", "projectId", "status", "startedAt");
CREATE INDEX "RepositoryImport_repositoryConnectionId_startedAt_idx"
  ON "RepositoryImport"("repositoryConnectionId", "startedAt");

CREATE UNIQUE INDEX "RepositoryImportFile_organizationId_projectId_repositoryImportId_path_key"
  ON "RepositoryImportFile"("organizationId", "projectId", "repositoryImportId", "path");
CREATE INDEX "RepositoryImportFile_repositoryImportId_kind_path_idx"
  ON "RepositoryImportFile"("repositoryImportId", "kind", "path");

ALTER TABLE "GitHubInstallation" ADD CONSTRAINT "GitHubInstallation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "GitHubInstallation" ADD CONSTRAINT "GitHubInstallation_connectedByUserId_fkey"
  FOREIGN KEY ("connectedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "RepositoryConnection" ADD CONSTRAINT "RepositoryConnection_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "RepositoryConnection" ADD CONSTRAINT "RepositoryConnection_organizationId_projectId_fkey"
  FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "RepositoryConnection" ADD CONSTRAINT "RepositoryConnection_organizationId_githubInstallationId_fkey"
  FOREIGN KEY ("organizationId", "githubInstallationId") REFERENCES "GitHubInstallation"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "RepositoryConnection" ADD CONSTRAINT "RepositoryConnection_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "RepositoryImport" ADD CONSTRAINT "RepositoryImport_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "RepositoryImport" ADD CONSTRAINT "RepositoryImport_organizationId_projectId_fkey"
  FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "RepositoryImport" ADD CONSTRAINT "RepositoryImport_organizationId_projectId_repositoryConnectionId_fkey"
  FOREIGN KEY ("organizationId", "projectId", "repositoryConnectionId") REFERENCES "RepositoryConnection"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "RepositoryImport" ADD CONSTRAINT "RepositoryImport_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "RepositoryImportFile" ADD CONSTRAINT "RepositoryImportFile_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "RepositoryImportFile" ADD CONSTRAINT "RepositoryImportFile_organizationId_projectId_fkey"
  FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "RepositoryImportFile" ADD CONSTRAINT "RepositoryImportFile_organizationId_projectId_repositoryImportId_fkey"
  FOREIGN KEY ("organizationId", "projectId", "repositoryImportId") REFERENCES "RepositoryImport"("organizationId", "projectId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
