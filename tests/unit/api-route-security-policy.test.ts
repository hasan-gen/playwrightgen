import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import { describe, expect, it } from "vitest";

import { API_ROUTE_SECURITY_POLICY } from "@/lib/security/api-route-policy";

const apiRoot = resolve(process.cwd(), "app", "api");

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  });
}

function routeName(path: string) {
  return relative(apiRoot, path).split(sep).join("/");
}

describe("API route security inventory", () => {
  it("requires every API route to declare an explicit security boundary", () => {
    const actual = routeFiles(apiRoot).map(routeName).sort();
    const declared = Object.keys(API_ROUTE_SECURITY_POLICY).sort();
    expect(actual).toEqual(declared);
  });

  it("requires every declared route to retain its boundary marker", () => {
    for (const [route, policy] of Object.entries(API_ROUTE_SECURITY_POLICY)) {
      const source = readFileSync(join(apiRoot, ...route.split("/")), "utf8");
      expect(source, `${route} lost ${policy.boundary}`).toContain(
        policy.requiredMarker,
      );
    }
  });
});
