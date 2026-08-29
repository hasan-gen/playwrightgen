import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { validateServerClerkEnvironment } from "@/lib/env";

const isAuthenticatedApplicationRoute = createRouteMatcher([
  "/workspace",
  "/workspace/(.*)",
  "/api/github/setup/(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isAuthenticatedApplicationRoute(request)) {
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
