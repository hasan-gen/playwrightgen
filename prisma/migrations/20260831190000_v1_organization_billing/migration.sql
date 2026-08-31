CREATE TYPE "BillingPlan" AS ENUM ('FREE', 'TEAM');
CREATE TYPE "BillingSubscriptionStatus" AS ENUM (
  'INCOMPLETE',
  'INCOMPLETE_EXPIRED',
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'CANCELED',
  'UNPAID',
  'PAUSED'
);
CREATE TYPE "BillingEntitlementSource" AS ENUM ('SUBSCRIPTION', 'MANUAL_OVERRIDE');
CREATE TYPE "StripeWebhookDeliveryResult" AS ENUM ('APPLIED', 'IGNORED');

ALTER TYPE "ActivityAction" ADD VALUE 'BILLING_SUBSCRIPTION_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'BILLING_ENTITLEMENTS_UPDATED';
ALTER TYPE "ActivityTargetType" ADD VALUE 'BILLING_SUBSCRIPTION';
ALTER TYPE "ActivitySource" ADD VALUE 'STRIPE_WEBHOOK';

CREATE TABLE "OrganizationBillingAccount" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "stripeCustomerId" VARCHAR(255),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "OrganizationBillingAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingSubscription" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "billingAccountId" UUID NOT NULL,
  "stripeSubscriptionId" VARCHAR(255) NOT NULL,
  "stripePriceId" VARCHAR(255) NOT NULL,
  "plan" "BillingPlan" NOT NULL,
  "status" "BillingSubscriptionStatus" NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "currentPeriodStart" TIMESTAMPTZ(3),
  "currentPeriodEnd" TIMESTAMPTZ(3),
  "trialEnd" TIMESTAMPTZ(3),
  "providerUpdatedAt" TIMESTAMPTZ(3) NOT NULL,
  "lastStripeEventId" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "BillingSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingSubscription_quantity_check" CHECK ("quantity" > 0)
);

CREATE TABLE "OrganizationEntitlement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "key" VARCHAR(100) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "limitValue" INTEGER,
  "source" "BillingEntitlementSource" NOT NULL,
  "sourceSubscriptionId" UUID,
  "effectiveFrom" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveUntil" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "OrganizationEntitlement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrganizationEntitlement_limitValue_check"
    CHECK ("limitValue" IS NULL OR "limitValue" >= 0),
  CONSTRAINT "OrganizationEntitlement_subscription_source_check"
    CHECK (
      ("source" = 'SUBSCRIPTION' AND "sourceSubscriptionId" IS NOT NULL) OR
      ("source" = 'MANUAL_OVERRIDE')
    )
);

CREATE TABLE "StripeWebhookDelivery" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stripeEventId" VARCHAR(255) NOT NULL,
  "payloadSha256" CHAR(64) NOT NULL,
  "eventType" VARCHAR(100) NOT NULL,
  "externalObjectId" VARCHAR(255),
  "livemode" BOOLEAN NOT NULL,
  "organizationId" UUID,
  "billingSubscriptionId" UUID,
  "result" "StripeWebhookDeliveryResult" NOT NULL,
  "processedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeWebhookDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StripeWebhookDelivery_payloadSha256_check"
    CHECK ("payloadSha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "StripeWebhookDelivery_subscription_scope_check"
    CHECK ("billingSubscriptionId" IS NULL OR "organizationId" IS NOT NULL)
);

CREATE UNIQUE INDEX "OrganizationBillingAccount_organizationId_key"
  ON "OrganizationBillingAccount"("organizationId");
CREATE UNIQUE INDEX "OrganizationBillingAccount_stripeCustomerId_key"
  ON "OrganizationBillingAccount"("stripeCustomerId");

CREATE UNIQUE INDEX "BillingSubscription_stripeSubscriptionId_key"
  ON "BillingSubscription"("stripeSubscriptionId");
CREATE UNIQUE INDEX "BillingSubscription_organizationId_id_key"
  ON "BillingSubscription"("organizationId", "id");
CREATE INDEX "BillingSubscription_organizationId_status_updatedAt_idx"
  ON "BillingSubscription"("organizationId", "status", "updatedAt");
CREATE INDEX "BillingSubscription_billingAccountId_status_idx"
  ON "BillingSubscription"("billingAccountId", "status");

CREATE UNIQUE INDEX "OrganizationEntitlement_organizationId_key_key"
  ON "OrganizationEntitlement"("organizationId", "key");
CREATE INDEX "OrganizationEntitlement_organizationId_enabled_key_idx"
  ON "OrganizationEntitlement"("organizationId", "enabled", "key");
CREATE INDEX "OrganizationEntitlement_sourceSubscriptionId_idx"
  ON "OrganizationEntitlement"("sourceSubscriptionId");

CREATE UNIQUE INDEX "StripeWebhookDelivery_stripeEventId_key"
  ON "StripeWebhookDelivery"("stripeEventId");
CREATE INDEX "StripeWebhookDelivery_organizationId_processedAt_idx"
  ON "StripeWebhookDelivery"("organizationId", "processedAt");
CREATE INDEX "StripeWebhookDelivery_billingSubscriptionId_processedAt_idx"
  ON "StripeWebhookDelivery"("billingSubscriptionId", "processedAt");
CREATE INDEX "StripeWebhookDelivery_eventType_processedAt_idx"
  ON "StripeWebhookDelivery"("eventType", "processedAt");

ALTER TABLE "OrganizationBillingAccount"
  ADD CONSTRAINT "OrganizationBillingAccount_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "BillingSubscription"
  ADD CONSTRAINT "BillingSubscription_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "BillingSubscription"
  ADD CONSTRAINT "BillingSubscription_billingAccountId_fkey"
  FOREIGN KEY ("billingAccountId") REFERENCES "OrganizationBillingAccount"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "OrganizationEntitlement"
  ADD CONSTRAINT "OrganizationEntitlement_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "OrganizationEntitlement"
  ADD CONSTRAINT "OrganizationEntitlement_organizationId_sourceSubscriptionId_fkey"
  FOREIGN KEY ("organizationId", "sourceSubscriptionId")
  REFERENCES "BillingSubscription"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "StripeWebhookDelivery"
  ADD CONSTRAINT "StripeWebhookDelivery_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "StripeWebhookDelivery"
  ADD CONSTRAINT "StripeWebhookDelivery_organizationId_billingSubscriptionId_fkey"
  FOREIGN KEY ("organizationId", "billingSubscriptionId")
  REFERENCES "BillingSubscription"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;
