import { config as loadEnv } from "dotenv";
import { afterEach, vi } from "vitest";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

afterEach(() => {
  vi.restoreAllMocks();
});
