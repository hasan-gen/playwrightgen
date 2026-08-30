import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { validateGitHubSetupEnvironment } from "@/lib/env";
import { createGitHubSetupDestination } from "@/lib/integrations/github/setup-destination";
import { createGitHubSetupState } from "@/lib/integrations/github/setup-state";
import {
  requireWorkspaceContext,
  workspaceAuthorizationErrorResponse,
} from "@/lib/auth/workspace-context";

export const runtime = "nodejs";

const querySchema = z.object({
  orgSlug: z.string().trim().min(1).max(255),
  projectId: z.string().uuid(),
  installationId: z.string().regex(/^\d+$/).max(32).optional(),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({
    orgSlug: request.nextUrl.searchParams.get("orgSlug"),
    projectId: request.nextUrl.searchParams.get("projectId"),
    installationId:
      request.nextUrl.searchParams.get("installationId") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { status: "error", code: "invalid_github_setup_request" },
      { status: 400 },
    );
  }

  try {
    const workspace = await requireWorkspaceContext({
      orgSlug: parsed.data.orgSlug,
      projectId: parsed.data.projectId,
      permission: "organization:manage",
    });
    const environment = validateGitHubSetupEnvironment();
    const state = createGitHubSetupState(
      {
        phase: "install",
        organizationId: workspace.organization.id,
        orgSlug: workspace.organization.slug,
        projectId: parsed.data.projectId,
        userId: workspace.user.id,
      },
      environment.GITHUB_SETUP_STATE_SECRET,
    );
    return NextResponse.redirect(
      createGitHubSetupDestination({
        appUrl: environment.NEXT_PUBLIC_APP_URL,
        appSlug: environment.GITHUB_APP_SLUG,
        state,
        installationId: parsed.data.installationId,
      }),
    );
  } catch (error) {
    const authorizationResponse =
      workspaceAuthorizationErrorResponse(error);
    if (authorizationResponse) return authorizationResponse;
    return NextResponse.json(
      { status: "error", code: "github_setup_unavailable" },
      { status: 503 },
    );
  }
}
