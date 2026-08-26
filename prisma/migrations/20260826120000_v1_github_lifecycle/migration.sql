CREATE TYPE "GitHubWebhookDeliveryResult" AS ENUM ('APPLIED', 'IGNORED');

ALTER TYPE "ActivityAction" ADD VALUE 'GITHUB_INSTALLATION_STATUS_CHANGED';
ALTER TYPE "ActivityAction" ADD VALUE 'REPOSITORY_ACCESS_CHANGED';
ALTER TYPE "ActivitySource" ADD VALUE 'GITHUB_WEBHOOK';

ALTER TABLE "GitHubInstallation"
  ADD COLUMN "providerUpdatedAt" TIMESTAMPTZ(3),
  ADD COLUMN "lastWebhookDeliveryId" VARCHAR(128);

CREATE TABLE "GitHubWebhookDelivery" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "deliveryId" VARCHAR(128) NOT NULL,
  "payloadSha256" CHAR(64) NOT NULL,
  "eventName" VARCHAR(64) NOT NULL,
  "action" VARCHAR(64) NOT NULL,
  "externalInstallationId" VARCHAR(32),
  "organizationId" UUID,
  "githubInstallationId" UUID,
  "result" "GitHubWebhookDeliveryResult" NOT NULL,
  "processedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GitHubWebhookDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GitHubWebhookDelivery_payloadSha256_check"
    CHECK ("payloadSha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "GitHubWebhookDelivery_externalInstallationId_check"
    CHECK ("externalInstallationId" IS NULL OR "externalInstallationId" ~ '^[0-9]+$'),
  CONSTRAINT "GitHubWebhookDelivery_installation_scope_check"
    CHECK (
      ("organizationId" IS NULL AND "githubInstallationId" IS NULL) OR
      ("organizationId" IS NOT NULL AND "githubInstallationId" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "GitHubWebhookDelivery_deliveryId_key"
  ON "GitHubWebhookDelivery"("deliveryId");
CREATE INDEX "GitHubWebhookDelivery_externalInstallationId_processedAt_idx"
  ON "GitHubWebhookDelivery"("externalInstallationId", "processedAt");
CREATE INDEX "GitHubWebhookDelivery_organizationId_processedAt_idx"
  ON "GitHubWebhookDelivery"("organizationId", "processedAt");
CREATE INDEX "GitHubWebhookDelivery_githubInstallationId_processedAt_idx"
  ON "GitHubWebhookDelivery"("githubInstallationId", "processedAt");

ALTER TABLE "GitHubWebhookDelivery"
  ADD CONSTRAINT "GitHubWebhookDelivery_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "GitHubWebhookDelivery"
  ADD CONSTRAINT "GitHubWebhookDelivery_organizationId_githubInstallationId_fkey"
  FOREIGN KEY ("organizationId", "githubInstallationId")
  REFERENCES "GitHubInstallation"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;
