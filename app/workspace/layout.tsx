import type { Metadata } from "next";

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
  return children;
}
