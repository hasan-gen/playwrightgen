import "server-only";

export function createGitHubSetupDestination(input: {
  appUrl: string;
  appSlug: string;
  state: string;
  installationId?: string;
}) {
  if (input.installationId) {
    const destination = new URL("/api/github/setup/installed", input.appUrl);
    destination.searchParams.set("state", input.state);
    destination.searchParams.set("installation_id", input.installationId);
    return destination;
  }

  const destination = new URL(
    "https://github.com/apps/" +
      encodeURIComponent(input.appSlug) +
      "/installations/new",
  );
  destination.searchParams.set("state", input.state);
  return destination;
}
