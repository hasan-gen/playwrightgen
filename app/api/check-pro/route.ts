import { NextResponse } from "next/server";
import { z } from "zod";

import {
  requireWorkspaceContext,
  workspaceAuthorizationErrorResponse,
} from "@/lib/auth/workspace-context";
import { getPrismaClient } from "@/lib/db/prisma";

const requestSchema = z.object({
  orgSlug: z.string().trim().min(1).max(100),
});

// Compatibility route for legacy clients. Entitlement authority is now the
// authenticated organization in PostgreSQL; an email address is never used.
export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const context = await requireWorkspaceContext({ orgSlug: input.orgSlug });
    const entitlement =
      await getPrismaClient().organizationEntitlement.findUnique({
        where: {
          organizationId_key: {
            organizationId: context.organization.id,
            key: "workspace.team",
          },
        },
        select: { enabled: true },
      });

    return NextResponse.json({ isPro: entitlement?.enabled === true });
  } catch (error: unknown) {
    const authorizationResponse = workspaceAuthorizationErrorResponse(error);
    if (authorizationResponse) return authorizationResponse;
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json(
        { status: "error", code: "invalid_request" },
        { status: 400 },
      );
    }
    console.error("Organization entitlement lookup failed safely.");
    return NextResponse.json(
      { status: "error", code: "entitlement_lookup_failed" },
      { status: 500 },
    );
  }
}
