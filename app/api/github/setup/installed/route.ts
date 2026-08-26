import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  requireWorkspaceContext,
  workspaceAuthorizationErrorResponse,
} from "@/lib/auth/workspace-context";
import { validateGitHubSetupEnvironment } from "@/lib/env";
import {
  createGitHubSetupState,
  createPkceChallenge,
  createPkceVerifier,
  GITHUB_PKCE_COOKIE,
  verifyGitHubSetupState,
} from "@/lib/integrations/github/setup-state";

export const runtime = "nodejs";

const installationIdSchema = z.string().regex(/^\d+$/).max(32);

export async function GET(request: NextRequest) {
  try {
    const environment = validateGitHubSetupEnvironment();
    const state = verifyGitHubSetupState(
      request.nextUrl.searchParams.get("state") ?? "",
      environment.GITHUB_SETUP_STATE_SECRET,
      { phase: "install" },
    );
    const installationId = installationIdSchema.parse(
      request.nextUrl.searchParams.get("installation_id"),
    );
    const workspace = await requireWorkspaceContext({
      organizationId: state.organizationId,
      orgSlug: state.orgSlug,
      projectId: state.projectId,
      permission: "organization:manage",
    });
    if (workspace.user.id !== state.userId) {
      throw new Error("github_setup_user_mismatch");
    }

    const verifier = createPkceVerifier();
    const codeChallenge = createPkceChallenge(verifier);
    const oauthState = createGitHubSetupState(
      {
        phase: "oauth",
        organizationId: state.organizationId,
        orgSlug: state.orgSlug,
        projectId: state.projectId,
        userId: state.userId,
        installationId,
        codeChallenge,
      },
      environment.GITHUB_SETUP_STATE_SECRET,
    );
    const callbackUrl = new URL(
      "/api/github/setup/callback",
      environment.NEXT_PUBLIC_APP_URL,
    ).toString();
    const authorizationUrl = new URL("https://github.com/login/oauth/authorize");
    authorizationUrl.searchParams.set(
      "client_id",
      environment.GITHUB_APP_CLIENT_ID,
    );
    authorizationUrl.searchParams.set("redirect_uri", callbackUrl);
    authorizationUrl.searchParams.set("state", oauthState);
    authorizationUrl.searchParams.set("code_challenge", codeChallenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(GITHUB_PKCE_COOKIE, verifier, {
      httpOnly: true,
      secure: new URL(environment.NEXT_PUBLIC_APP_URL).protocol === "https:",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/api/github/setup/callback",
    });
    return response;
  } catch (error) {
    const authorizationResponse =
      workspaceAuthorizationErrorResponse(error);
    if (authorizationResponse) return authorizationResponse;
    return NextResponse.json(
      { status: "error", code: "invalid_github_setup_callback" },
      { status: 400 },
    );
  }
}
