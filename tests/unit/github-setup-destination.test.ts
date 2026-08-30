import { describe, expect, it } from "vitest";

import { createGitHubSetupDestination } from "@/lib/integrations/github/setup-destination";

describe("GitHub setup destination", () => {
  it("starts a new installation when no installation ID is supplied", () => {
    const destination = createGitHubSetupDestination({
      appUrl: "https://preview.example.com",
      appSlug: "playwrightgen-development",
      state: "signed.install.state",
    });

    expect(destination.toString()).toBe(
      "https://github.com/apps/playwrightgen-development/installations/new?state=signed.install.state",
    );
  });

  it("continues an existing installation through the signed callback", () => {
    const destination = createGitHubSetupDestination({
      appUrl: "https://preview.example.com",
      appSlug: "playwrightgen-development",
      state: "signed.install.state",
      installationId: "157602553",
    });

    expect(destination.origin).toBe("https://preview.example.com");
    expect(destination.pathname).toBe("/api/github/setup/installed");
    expect(destination.searchParams.get("state")).toBe("signed.install.state");
    expect(destination.searchParams.get("installation_id")).toBe("157602553");
  });
});
