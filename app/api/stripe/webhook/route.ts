import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  EnvironmentValidationError,
  validateStripeWebhookEnvironment,
} from "@/lib/env";
import {
  dispatchStripeWebhook,
  type NormalizedStripeWebhook,
  StripeWebhookConflictError,
} from "@/lib/services/billing";

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 1_000_000;

function errorResponse(code: string, status: number) {
  return NextResponse.json({ status: "error", code }, { status });
}

function unixDate(value: number | null | undefined): Date | null {
  return typeof value === "number" ? new Date(value * 1_000) : null;
}

function customerId(
  value:
    | Stripe.Subscription["customer"]
    | Stripe.Checkout.Session["customer"],
) {
  return typeof value === "string" ? value : value?.id;
}

async function normalizeEvent(
  event: Stripe.Event,
  stripe: Stripe,
  digest: string,
): Promise<NormalizedStripeWebhook> {
  const base = {
    stripeEventId: event.id,
    payloadSha256: digest,
    eventType: event.type,
    livemode: event.livemode,
    eventCreatedAt: new Date(event.created * 1_000),
  };
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const organizationId =
      session.client_reference_id ||
      session.metadata?.playwrightgenOrganizationId;
    const customer = customerId(session.customer);
    if (session.mode !== "subscription" || !organizationId || !customer) {
      return { ...base, kind: "ignored", externalObjectId: session.id };
    }
    return {
      ...base,
      kind: "checkout",
      organizationId,
      customerId: customer,
      checkoutSessionId: session.id,
    };
  }
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const eventSubscription = event.data.object;
    const subscription = await stripe.subscriptions.retrieve(
      eventSubscription.id,
    );
    const organizationId =
      subscription.metadata.playwrightgenOrganizationId;
    const customer = customerId(subscription.customer);
    const item = subscription.items.data[0];
    if (!organizationId || !customer || !item?.price.id) {
      return {
        ...base,
        kind: "ignored",
        externalObjectId: subscription.id,
      };
    }
    return {
      ...base,
      kind: "subscription",
      organizationId,
      customerId: customer,
      subscriptionId: subscription.id,
      priceId: item.price.id,
      status: subscription.status,
      quantity: item.quantity ?? 1,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodStart: unixDate(item.current_period_start),
      currentPeriodEnd: unixDate(item.current_period_end),
      trialEnd: unixDate(subscription.trial_end),
    };
  }
  const object = event.data.object as { id?: unknown };
  return {
    ...base,
    kind: "ignored",
    externalObjectId:
      typeof object.id === "string" ? object.id : undefined,
  };
}

export async function POST(request: Request) {
  let config;
  try {
    config = validateStripeWebhookEnvironment();
  } catch (error: unknown) {
    if (error instanceof EnvironmentValidationError) {
      return errorResponse("webhook_unavailable", 503);
    }
    return errorResponse("webhook_unavailable", 503);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    return errorResponse("payload_too_large", 413);
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return errorResponse("invalid_signature", 400);

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return errorResponse("invalid_payload", 400);
  }
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
    return errorResponse("payload_too_large", 413);
  }

  const stripe = new Stripe(config.STRIPE_SECRET_KEY);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return errorResponse("invalid_signature", 400);
  }
  const expectedLivemode = config.STRIPE_ENVIRONMENT === "live";
  if (event.livemode !== expectedLivemode) {
    return errorResponse("stripe_environment_mismatch", 409);
  }

  try {
    const digest = createHash("sha256").update(rawBody).digest("hex");
    const webhook = await normalizeEvent(event, stripe, digest);
    const result = await dispatchStripeWebhook({
      webhook,
      teamPriceId: config.STRIPE_TEAM_PRICE_ID,
    });
    return NextResponse.json({ status: "ok", result: result.status });
  } catch (error: unknown) {
    if (error instanceof StripeWebhookConflictError) {
      return errorResponse(error.code, 409);
    }
    console.error("Stripe webhook synchronization failed safely.");
    return errorResponse("synchronization_failed", 500);
  }
}
