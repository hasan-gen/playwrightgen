import { auth, clerkClient } from "@clerk/nextjs/server";

import { WorkspaceOnboarding } from "@/components/workspace/workspace-onboarding";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default async function WorkspacePage() {
  const { userId, orgId, orgSlug, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn({ returnBackUrl: "/workspace" });
  }

  if (!orgId) {
    return <WorkspaceOnboarding />;
  }

  const client = await clerkClient();
  const organization = await client.organizations.getOrganization({
    organizationId: orgId,
  });

  return (
    <WorkspaceShell
      organizationName={organization.name}
      organizationSlug={organization.slug ?? orgSlug}
    />
  );
}
