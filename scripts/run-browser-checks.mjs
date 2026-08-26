import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const nextBinary = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);
const playwrightBinary = fileURLToPath(
  new URL("../node_modules/@playwright/test/cli.js", import.meta.url),
);
const origin = "http://127.0.0.1:3000";
const server = spawn(
  process.execPath,
  [nextBinary, "dev", "--hostname", "127.0.0.1", "--port", "3000"],
  { stdio: "inherit", windowsHide: true },
);

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error("Browser-check web server exited before becoming ready.");
    }
    try {
      const response = await fetch(origin, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // The server is still starting.
    }
    await delay(250);
  }
  throw new Error("Browser-check web server did not become ready in time.");
}

function stopServer() {
  if (!server.pid || server.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync(
      "taskkill.exe",
      ["/PID", String(server.pid), "/T", "/F"],
      { stdio: "ignore", windowsHide: true },
    );
    return;
  }
  server.kill("SIGTERM");
}

let exitCode = 1;
try {
  await waitForServer();
  exitCode = await new Promise((resolve, reject) => {
    const checks = spawn(process.execPath, [playwrightBinary, "test"], {
      stdio: "inherit",
      windowsHide: true,
    });
    checks.on("error", reject);
    checks.on("exit", (code) => resolve(code ?? 1));
  });
} finally {
  stopServer();
}

process.exit(exitCode);
