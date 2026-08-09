import "server-only";

import { z } from "zod";

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

const requiredValue = z.string().trim().min(1);
const postgresUrl = requiredValue.refine(
  (value) => /^postgres(?:ql)?:\/\//i.test(value),
  "Must be a PostgreSQL connection URL.",
);

export const databaseEnvironmentSchema = z.object({
  DATABASE_URL: postgresUrl,
});

export const migrationEnvironmentSchema = z.object({
  DATABASE_URL: postgresUrl,
  DIRECT_URL: postgresUrl.optional(),
});

export const testDatabaseEnvironmentSchema = z.object({
  TEST_DATABASE_URL: postgresUrl,
});

export const publicClerkEnvironmentSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: requiredValue,
});

export const serverClerkEnvironmentSchema = z.object({
  CLERK_SECRET_KEY: requiredValue,
});

export class EnvironmentValidationError extends Error {
  readonly variableNames: readonly string[];

  constructor(scope: string, variableNames: readonly string[]) {
    super(
      `Invalid ${scope} environment configuration. Check: ${variableNames.join(", ")}.`,
    );
    this.name = "EnvironmentValidationError";
    this.variableNames = variableNames;
  }
}

function validateEnvironment<TSchema extends z.ZodType>(
  schema: TSchema,
  source: EnvironmentSource,
  scope: string,
): z.output<TSchema> {
  const result = schema.safeParse(source);

  if (!result.success) {
    const variableNames = Array.from(
      new Set(
        result.error.issues
          .map((issue) => issue.path[0])
          .filter(
            (segment): segment is string => typeof segment === "string",
          ),
      ),
    ).sort();

    throw new EnvironmentValidationError(
      scope,
      variableNames.length > 0 ? variableNames : ["required variables"],
    );
  }

  return result.data;
}

export function validateDatabaseEnvironment(
  source: EnvironmentSource = process.env,
) {
  return validateEnvironment(
    databaseEnvironmentSchema,
    source,
    "database",
  );
}

export function validateMigrationEnvironment(
  source: EnvironmentSource = process.env,
) {
  return validateEnvironment(
    migrationEnvironmentSchema,
    source,
    "database migration",
  );
}

export function validateTestDatabaseEnvironment(
  source: EnvironmentSource = process.env,
) {
  return validateEnvironment(
    testDatabaseEnvironmentSchema,
    source,
    "test database",
  );
}

export function validatePublicClerkEnvironment(
  source: EnvironmentSource = process.env,
) {
  return validateEnvironment(
    publicClerkEnvironmentSchema,
    source,
    "public Clerk",
  );
}

export function validateServerClerkEnvironment(
  source: EnvironmentSource = process.env,
) {
  return validateEnvironment(
    serverClerkEnvironmentSchema,
    source,
    "server Clerk",
  );
}
