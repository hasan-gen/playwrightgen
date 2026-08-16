import { WorkspaceFrame } from "@/components/workspace/workspace-frame";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

export default async function OrganizationWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const context = await requireWorkspaceContext({ orgSlug });

  return (
    <WorkspaceFrame
      organizationName={context.organization.name}
      organizationSlug={context.organization.slug}
    >
      {children}
    </WorkspaceFrame>
  );
}
