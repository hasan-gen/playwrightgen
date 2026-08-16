import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { WorkspaceOnboarding } from "@/components/workspace/workspace-onboarding";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

export default async function WorkspacePage() {
  const { userId, orgId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn({ returnBackUrl: "/workspace" });
  }

  if (!orgId) {
    return <WorkspaceOnboarding />;
  }

  const context = await requireWorkspaceContext();
  redirect(`/workspace/${context.organization.slug}`);
}
