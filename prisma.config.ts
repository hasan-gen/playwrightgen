import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

function readOptionalEnvironmentVariable(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function assertPostgresUrl(name: string, value: string): string {
  if (!/^postgres(?:ql)?:\/\//i.test(value)) {
    throw new Error(
      `Invalid Prisma environment configuration. ${name} must be a PostgreSQL connection URL.`,
    );
  }

  return value;
}

function resolvePrismaCliDatabaseUrl(): string | undefined {
  if (process.env.NODE_ENV === "test") {
    const testDatabaseUrl = readOptionalEnvironmentVariable("TEST_DATABASE_URL");

    if (!testDatabaseUrl) {
      throw new Error(
        "Invalid Prisma test configuration. TEST_DATABASE_URL is required.",
      );
    }

    return assertPostgresUrl("TEST_DATABASE_URL", testDatabaseUrl);
  }

  const directUrl = readOptionalEnvironmentVariable("DIRECT_URL");
  if (directUrl) {
    return assertPostgresUrl("DIRECT_URL", directUrl);
  }

  const databaseUrl = readOptionalEnvironmentVariable("DATABASE_URL");
  if (databaseUrl) {
    return assertPostgresUrl("DATABASE_URL", databaseUrl);
  }

  return undefined;
}

const prismaCliDatabaseUrl = resolvePrismaCliDatabaseUrl();
const shadowDatabaseUrl = readOptionalEnvironmentVariable("SHADOW_DATABASE_URL");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: prismaCliDatabaseUrl
    ? {
        url: prismaCliDatabaseUrl,
        ...(shadowDatabaseUrl
          ? {
              shadowDatabaseUrl: assertPostgresUrl(
                "SHADOW_DATABASE_URL",
                shadowDatabaseUrl,
              ),
            }
          : {}),
      }
    : undefined,
});
