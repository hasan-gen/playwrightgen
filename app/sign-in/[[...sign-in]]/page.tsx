import { ClerkProvider, SignIn } from "@clerk/nextjs";

import { ClerkAuthShell } from "@/components/auth/clerk-auth-shell";
import { validatePublicClerkEnvironment } from "@/lib/env";

export default function SignInPage() {
  const { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY } =
    validatePublicClerkEnvironment();

  return (
    <ClerkProvider
      publishableKey={NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/workspace"
      signUpFallbackRedirectUrl="/workspace"
    >
      <ClerkAuthShell
        eyebrow="PlaywrightGen Workspace"
        title="Build confidence before the release."
        description="Sign in to move from requirements to approved tests, versioned Playwright automation, and evidence-backed release decisions."
      >
        <SignIn
          path="/sign-in"
          routing="path"
          fallbackRedirectUrl="/workspace"
          signUpUrl="/sign-up"
          signUpFallbackRedirectUrl="/workspace"
        />
      </ClerkAuthShell>
    </ClerkProvider>
  );
}
