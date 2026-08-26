import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { validateServerClerkEnvironment } from "@/lib/env";

const isWorkspaceRoute = createRouteMatcher([
  "/workspace",
  "/workspace/(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isWorkspaceRoute(request)) {
    validateServerClerkEnvironment();
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", request.url);

    await auth.protect({ unauthenticatedUrl: signInUrl.toString() });
  }
});

export const config = {
  matcher: [
    "/workspace",
    "/workspace/:path*",
    "/api/github/setup/:path*",
  ],
};
