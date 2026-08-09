import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { validateServerClerkEnvironment } from "@/lib/env";

const isWorkspaceRoute = createRouteMatcher([
  "/workspace",
  "/workspace/(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isWorkspaceRoute(request)) {
    validateServerClerkEnvironment();
    await auth.protect();
  }
});

export const config = {
  matcher: ["/workspace", "/workspace/:path*"],
};
