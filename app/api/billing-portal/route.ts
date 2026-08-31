import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import {
  requireWorkspaceContext,
  workspaceAuthorizationErrorResponse,
} from "@/lib/auth/workspace-context";
import { getPrismaClient } from "@/lib/db/prisma";
import {
  EnvironmentValidationError,
  validateStripePortalEnvironment,
} from "@/lib/env";

const requestSchema = z.object({
  orgSlug: z.string().trim().min(1).max(100),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const context = await requireWorkspaceContext({
      orgSlug: input.orgSlug,
      permission: "organization:manage",
    });
    const config = validateStripePortalEnvironment();
    const account = await getPrismaClient().organizationBillingAccount.findUnique({
      where: { organizationId: context.organization.id },
    });
    if (!account?.stripeCustomerId) {
      return NextResponse.json(
        { status: "error", code: "billing_account_not_found" },
        { status: 404 },
      );
    }
    const session = await new Stripe(
      config.STRIPE_SECRET_KEY,
    ).billingPortal.sessions.create({
      customer: account.stripeCustomerId,
      return_url: `${config.NEXT_PUBLIC_APP_URL}/workspace/${encodeURIComponent(context.organization.slug)}/billing`,
    });
    return NextResponse.json({ status: "ok", url: session.url });
  } catch (error: unknown) {
    const authorizationResponse = workspaceAuthorizationErrorResponse(error);
    if (authorizationResponse) return authorizationResponse;
    if (error instanceof EnvironmentValidationError) {
      return NextResponse.json(
        { status: "error", code: "billing_unavailable" },
        { status: 503 },
      );
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json(
        { status: "error", code: "invalid_request" },
        { status: 400 },
      );
    }
    console.error("Stripe billing portal failed safely.");
    return NextResponse.json(
      { status: "error", code: "billing_portal_failed" },
      { status: 500 },
    );
  }
}
