import { SignIn } from "@clerk/nextjs";

import { ClerkAuthShell } from "@/components/auth/clerk-auth-shell";

export default function SignInPage() {
  return (
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
  );
}
