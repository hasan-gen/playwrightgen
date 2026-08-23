import { ClerkProvider, SignUp } from "@clerk/nextjs";

import { ClerkAuthShell } from "@/components/auth/clerk-auth-shell";
import { validatePublicClerkEnvironment } from "@/lib/env";

export default function SignUpPage() {
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
        eyebrow="Create your workspace"
        title="Turn quality engineering into a team system."
        description="Create an account to organize requirements, test design, automation artifacts, execution evidence, and release intelligence in one secure workspace."
      >
        <SignUp
          path="/sign-up"
          routing="path"
          fallbackRedirectUrl="/workspace"
          signInUrl="/sign-in"
          signInFallbackRedirectUrl="/workspace"
        />
      </ClerkAuthShell>
    </ClerkProvider>
  );
}
