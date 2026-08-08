import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { validateDatabaseEnvironment } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  phase1APrisma?: PrismaClient;
};

let productionPrisma: PrismaClient | undefined;

function createPrismaClient(): PrismaClient {
  const { DATABASE_URL } = validateDatabaseEnvironment();
  const adapter = new PrismaPg({ connectionString: DATABASE_URL });

  return new PrismaClient({ adapter });
}

export function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.phase1APrisma ??= createPrismaClient();
    return globalForPrisma.phase1APrisma;
  }

  productionPrisma ??= createPrismaClient();
  return productionPrisma;
}
