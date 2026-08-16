import { randomUUID } from "node:crypto";

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import * as databaseHelpers from "@/tests/helpers/database";

const testDatabaseConfigured = Boolean(
  process.env.TEST_DATABASE_URL?.trim(),
);
const dedicatedDatabaseCommand =
  process.env.npm_lifecycle_event === "test:database";

function uniqueValue(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPostgresForeignKeyRestrictionCode(value: unknown): boolean {
  return value === "23001" || value === "23503";
}

function isForeignKeyRestrictionError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  if (error.code === "P2003") {
    return true;
  }

  if (error.code !== "P2039" || !isRecord(error.meta)) {
    return false;
  }

  const driverAdapterError = error.meta.driverAdapterError;
  if (!isRecord(driverAdapterError) || !isRecord(driverAdapterError.cause)) {
    return false;
  }

  return (
    driverAdapterError.cause.kind === "postgres" &&
    (isPostgresForeignKeyRestrictionCode(
      driverAdapterError.cause.originalCode,
    ) || isPostgresForeignKeyRestrictionCode(driverAdapterError.cause.code))
  );
}

if (!testDatabaseConfigured) {
  const prerequisiteSuite = dedicatedDatabaseCommand ? describe : describe.skip;

  prerequisiteSuite(
    "Phase 1A database integration tests require TEST_DATABASE_URL",
    () => {
      it("uses a physically separate PostgreSQL test database", () => {
        if (dedicatedDatabaseCommand) {
          throw new Error(
            "TEST_DATABASE_URL is required for npm run test:database.",
          );
        }
      });
    },
  );
} else {
  describe("Phase 1A PostgreSQL schema", () => {
    let prisma: PrismaClient;

    beforeAll(async () => {
      prisma = databaseHelpers.createTestPrismaClient();
      await databaseHelpers.connectTestDatabase(prisma);
    });

    beforeEach(async () => {
      await databaseHelpers.cleanPhase1ATables(prisma);
    });

    afterAll(async () => {
      if (prisma) {
        await databaseHelpers.cleanPhase1ATables(prisma);
        await databaseHelpers.disconnectTestDatabase(prisma);
      }
    });

    async function createFoundationRecords() {
      const user = await prisma.user.create({
        data: {
          clerkUserId: uniqueValue("clerk-user"),
          primaryEmail: `${uniqueValue("user")}@example.test`,
        },
      });
      const organization = await prisma.organization.create({
        data: {
          clerkOrganizationId: uniqueValue("clerk-org"),
          name: "Test organization",
          slug: uniqueValue("organization"),
        },
      });
      const membership = await prisma.membership.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: "OWNER",
        },
      });
      const project = await prisma.project.create({
        data: {
          organizationId: organization.id,
          name: "Test project",
          slug: uniqueValue("project"),
          createdByUserId: user.id,
        },
      });

      return { membership, organization, project, user };
    }

    it("creates a user, organization, membership, and project", async () => {
      const records = await createFoundationRecords();

      expect(records.membership.organizationId).toBe(records.organization.id);
      expect(records.membership.userId).toBe(records.user.id);
      expect(records.project.organizationId).toBe(records.organization.id);
    });

    it("rejects a duplicate global organization slug", async () => {
      const slug = uniqueValue("duplicate-organization");

      await prisma.organization.create({
        data: {
          clerkOrganizationId: uniqueValue("clerk-org"),
          name: "First organization",
          slug,
        },
      });

      await expect(
        prisma.organization.create({
          data: {
            clerkOrganizationId: uniqueValue("clerk-org"),
            name: "Second organization",
            slug,
          },
        }),
      ).rejects.toMatchObject({ code: "P2002" });
    });

    it("rejects a duplicate organization and user membership", async () => {
      const { organization, user } = await createFoundationRecords();

      await expect(
        prisma.membership.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            role: "ADMIN",
          },
        }),
      ).rejects.toMatchObject({ code: "P2002" });
    });

    it("rejects a duplicate organization, project, and user project membership", async () => {
      const { organization, project, user } =
        await createFoundationRecords();
      const data = {
        organizationId: organization.id,
        projectId: project.id,
        userId: user.id,
        role: "PROJECT_LEAD" as const,
      };

      await prisma.projectMembership.create({ data });

      await expect(
        prisma.projectMembership.create({ data }),
      ).rejects.toMatchObject({ code: "P2002" });
    });

    it("allows the same project slug in different organizations", async () => {
      const user = await prisma.user.create({
        data: { clerkUserId: uniqueValue("clerk-user") },
      });
      const sharedSlug = uniqueValue("shared-project");
      const firstOrganization = await prisma.organization.create({
        data: {
          clerkOrganizationId: uniqueValue("clerk-org"),
          name: "First organization",
          slug: uniqueValue("organization"),
        },
      });
      const secondOrganization = await prisma.organization.create({
        data: {
          clerkOrganizationId: uniqueValue("clerk-org"),
          name: "Second organization",
          slug: uniqueValue("organization"),
        },
      });

      const projects = await Promise.all([
        prisma.project.create({
          data: {
            organizationId: firstOrganization.id,
            name: "First project",
            slug: sharedSlug,
            createdByUserId: user.id,
          },
        }),
        prisma.project.create({
          data: {
            organizationId: secondOrganization.id,
            name: "Second project",
            slug: sharedSlug,
            createdByUserId: user.id,
          },
        }),
      ]);

      expect(projects).toHaveLength(2);
    });

    it("rejects a cross-organization project membership", async () => {
      const first = await createFoundationRecords();
      const second = await createFoundationRecords();

      await expect(
        prisma.projectMembership.create({
          data: {
            organizationId: first.organization.id,
            projectId: first.project.id,
            userId: second.user.id,
            role: "MEMBER",
          },
        }),
      ).rejects.toMatchObject({ code: "P2003" });
    });

    it("rejects an activity whose project belongs to another organization", async () => {
      const first = await createFoundationRecords();
      const second = await createFoundationRecords();

      await expect(
        prisma.activity.create({
          data: {
            organizationId: first.organization.id,
            projectId: second.project.id,
            actorUserId: first.user.id,
            source: "USER",
            action: "PROJECT_UPDATED",
            targetType: "PROJECT",
            targetId: second.project.id,
          },
        }),
      ).rejects.toMatchObject({ code: "P2003" });
    });

    it("rejects a requirement whose project belongs to another organization", async () => {
      const first = await createFoundationRecords();
      const second = await createFoundationRecords();

      await expect(
        prisma.requirement.create({
          data: {
            organizationId: first.organization.id,
            projectId: second.project.id,
            title: "Cross-tenant requirement",
            description: "Must be rejected by the composite foreign key.",
            acceptanceCriteria: "No row is created.",
            ownerUserId: first.user.id,
            createdByUserId: first.user.id,
          },
        }),
      ).rejects.toMatchObject({ code: "P2003" });
    });

    it("rejects Requirement traceability across projects at the database boundary", async () => {
      const { organization, project, user } = await createFoundationRecords();
      const secondProject = await prisma.project.create({
        data: {
          organizationId: organization.id,
          name: "Second project",
          slug: uniqueValue("second-project"),
          createdByUserId: user.id,
        },
      });
      const requirement = await prisma.requirement.create({
        data: {
          organizationId: organization.id,
          projectId: project.id,
          title: "First-project requirement",
          description: "Must remain in its project.",
          acceptanceCriteria: "Cross-project links are rejected.",
          ownerUserId: user.id,
          createdByUserId: user.id,
        },
      });
      const testCase = await prisma.testCase.create({
        data: {
          organizationId: organization.id,
          projectId: secondProject.id,
          title: "Second-project test",
          objective: "Must remain in its project.",
          preconditions: "",
          steps: ["Act"],
          expectedResults: ["Observe"],
          ownerUserId: user.id,
          createdByUserId: user.id,
        },
      });

      await expect(
        prisma.requirementTestCase.create({
          data: {
            organizationId: organization.id,
            projectId: project.id,
            requirementId: requirement.id,
            testCaseId: testCase.id,
            createdByUserId: user.id,
          },
        }),
      ).rejects.toMatchObject({ code: "P2003" });
    });

    it("archives a project without removing its row or relationships", async () => {
      const { organization, project, user } =
        await createFoundationRecords();

      await prisma.projectMembership.create({
        data: {
          organizationId: organization.id,
          projectId: project.id,
          userId: user.id,
          role: "PROJECT_LEAD",
        },
      });
      await prisma.activity.create({
        data: {
          organizationId: organization.id,
          projectId: project.id,
          actorUserId: user.id,
          source: "USER",
          action: "PROJECT_ARCHIVED",
          targetType: "PROJECT",
          targetId: project.id,
        },
      });

      const archivedProject = await prisma.project.update({
        where: { id: project.id },
        data: {
          status: "ARCHIVED",
          archivedAt: new Date(),
          archivedByUserId: user.id,
        },
        include: {
          activities: true,
          projectMemberships: true,
        },
      });

      expect(archivedProject.status).toBe("ARCHIVED");
      expect(archivedProject.projectMemberships).toHaveLength(1);
      expect(archivedProject.activities).toHaveLength(1);
    });

    it("models activity records without update or delete fields or helpers", async () => {
      const { organization, project, user } =
        await createFoundationRecords();
      const activity = await prisma.activity.create({
        data: {
          organizationId: organization.id,
          projectId: project.id,
          actorUserId: user.id,
          source: "USER",
          action: "PROJECT_CREATED",
          targetType: "PROJECT",
          targetId: project.id,
          metadata: { checkpoint: "phase-1a" },
        },
      });

      expect(activity).not.toHaveProperty("updatedAt");
      expect(activity).not.toHaveProperty("deletedAt");
      expect(databaseHelpers).not.toHaveProperty("updateActivity");
      expect(databaseHelpers).not.toHaveProperty("deleteActivity");
    });

    it("uses restrictive foreign keys for referenced parent records", async () => {
      const { organization } = await createFoundationRecords();
      let deletionError: unknown;

      try {
        await prisma.organization.delete({ where: { id: organization.id } });
      } catch (error: unknown) {
        deletionError = error;
      }

      expect(isForeignKeyRestrictionError(deletionError)).toBe(true);

      expect(
        await prisma.organization.findUnique({
          where: { id: organization.id },
        }),
      ).not.toBeNull();
    });
  });
}
