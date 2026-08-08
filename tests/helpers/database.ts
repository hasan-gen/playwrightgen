import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { validateTestDatabaseEnvironment } from "@/lib/env";

const obviousProductionToken =
  /(^|[-_.])(prod|production|live)([-_.]|$)/i;
const explicitTestToken = /(^|[-_.])(test|testing)([-_.]|$)/i;

function getValidatedTestDatabaseUrl(): string {
  const { TEST_DATABASE_URL } = validateTestDatabaseEnvironment();
  const parsedUrl = new URL(TEST_DATABASE_URL);
  const databaseName = decodeURIComponent(parsedUrl.pathname.slice(1));
  const targetIdentity = `${parsedUrl.hostname} ${databaseName}`;

  if (obviousProductionToken.test(targetIdentity)) {
    throw new Error(
      "Refusing to use TEST_DATABASE_URL because it appears to target production.",
    );
  }

  if (!explicitTestToken.test(targetIdentity)) {
    throw new Error(
      "TEST_DATABASE_URL must identify a dedicated test database using a test marker in its host or database name.",
    );
  }

  return TEST_DATABASE_URL;
}

export function createTestPrismaClient(): PrismaClient {
  const connectionString = getValidatedTestDatabaseUrl();
  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter });
}

export async function connectTestDatabase(
  client: PrismaClient,
): Promise<void> {
  await client.$connect();
}

export async function disconnectTestDatabase(
  client: PrismaClient,
): Promise<void> {
  await client.$disconnect();
}

export async function cleanPhase1ATables(
  client: PrismaClient,
): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error(
      "Phase 1A database cleanup is allowed only when NODE_ENV is test.",
    );
  }

  await client.$transaction([
    client.activity.deleteMany(),
    client.projectMembership.deleteMany(),
    client.project.deleteMany(),
    client.membership.deleteMany(),
    client.organization.deleteMany(),
    client.user.deleteMany(),
  ]);
}
