import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";

import { validatePublicClerkEnvironment } from "@/lib/env";

export const metadata: Metadata = {
  title: "PlaywrightGen Workspace",
  description:
    "An AI-native quality engineering workspace for teams building dependable software.",
};

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY } =
    validatePublicClerkEnvironment();

  return (
    <ClerkProvider publishableKey={NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      {children}
    </ClerkProvider>
  );
}
