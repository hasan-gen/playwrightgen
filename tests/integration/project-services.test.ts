import { randomUUID } from "node:crypto";

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import type {
  MembershipRole,
  PrismaClient,
  ProjectMembershipRole,
} from "@/generated/prisma/client";
import {
  archiveProject,
  assignProjectMember,
  changeProjectMemberRole,
  createProject,
  getProject,
  listProjects,
  ProjectDomainError,
  removeProjectMember,
  restoreProject,
  updateProject,
} from "@/lib/services/projects";
import {
  cleanPhase1ATables,
  connectTestDatabase,
  createTestPrismaClient,
  disconnectTestDatabase,
} from "@/tests/helpers/database";

function uniqueValue(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

describe("tenant-safe project domain services", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    await connectTestDatabase(prisma);
  });

  beforeEach(async () => {
    await cleanPhase1ATables(prisma);
  });

  afterAll(async () => {
    if (prisma) {
      await cleanPhase1ATables(prisma);
      await disconnectTestDatabase(prisma);
    }
  });

  async function createWorkspace(options: {
    role?: MembershipRole;
    projectRole?: ProjectMembershipRole;
  } = {}) {
    const user = await prisma.user.create({
      data: { clerkUserId: uniqueValue("clerk-user") },
    });
    const organization = await prisma.organization.create({
      data: {
        clerkOrganizationId: uniqueValue("clerk-org"),
        name: "Project service workspace",
        slug: uniqueValue("workspace"),
      },
    });
    await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: options.role ?? "OWNER",
      },
    });
    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: "Existing project",
        slug: uniqueValue("project"),
        createdByUserId: user.id,
      },
    });
    if (options.projectRole) {
      await prisma.projectMembership.create({
        data: {
          organizationId: organization.id,
          projectId: project.id,
          userId: user.id,
          role: options.projectRole,
        },
      });
    }
    return { organization, project, user };
  }

  function dependencies(workspace: Awaited<ReturnType<typeof createWorkspace>>) {
    return {
      authenticate: async () => ({
        userId: workspace.user.clerkUserId,
        orgId: workspace.organization.clerkOrganizationId,
      }),
      prisma,
    };
  }

  async function addOrganizationMember(
    organizationId: string,
    status: "ACTIVE" | "REMOVED" = "ACTIVE",
  ) {
    const user = await prisma.user.create({
      data: { clerkUserId: uniqueValue("clerk-user") },
    });
    await prisma.membership.create({
      data: {
        organizationId,
        userId: user.id,
        role: "MEMBER",
        status,
      },
    });
    return user;
  }

  it("creates a project and Activity in the same tenant", async () => {
    const workspace = await createWorkspace();
    const project = await createProject(
      {
        name: "Release confidence",
        slug: "release-confidence",
        description: "Delivery readiness",
        requestId: "request-create",
      },
      dependencies(workspace),
    );
    const activity = await prisma.activity.findFirstOrThrow({
      where: { projectId: project.id, action: "PROJECT_CREATED" },
    });

    expect(project.organizationId).toBe(workspace.organization.id);
    expect(project.createdByUserId).toBe(workspace.user.id);
    expect(activity.organizationId).toBe(workspace.organization.id);
    expect(activity.actorUserId).toBe(workspace.user.id);
    expect(activity.requestId).toBe("request-create");
  });

  it("rejects project creation by a non-admin member", async () => {
    const workspace = await createWorkspace({ role: "MEMBER" });
    await expect(
      createProject(
        { name: "Denied", slug: "denied" },
        dependencies(workspace),
      ),
    ).rejects.toMatchObject({ status: 403, code: "permission_denied" });
    expect(await prisma.project.count()).toBe(1);
  });

  it("validates project input before writing", async () => {
    const workspace = await createWorkspace();
    await expect(
      createProject(
        { name: "Invalid", slug: "Not Valid" },
        dependencies(workspace),
      ),
    ).rejects.toBeInstanceOf(ProjectDomainError);
    expect(await prisma.activity.count()).toBe(0);
  });

  it("lists only assigned projects for a regular member", async () => {
    const workspace = await createWorkspace({ role: "MEMBER" });
    const hiddenProject = await prisma.project.create({
      data: {
        organizationId: workspace.organization.id,
        name: "Hidden project",
        slug: uniqueValue("hidden"),
        createdByUserId: workspace.user.id,
      },
    });
    await prisma.projectMembership.create({
      data: {
        organizationId: workspace.organization.id,
        projectId: workspace.project.id,
        userId: workspace.user.id,
        role: "MEMBER",
      },
    });
    const foreign = await createWorkspace();

    const projects = await listProjects({}, dependencies(workspace));
    expect(projects.map((project) => project.id)).toEqual([
      workspace.project.id,
    ]);
    expect(projects.some((project) => project.id === hiddenProject.id)).toBe(false);
    expect(projects.some((project) => project.id === foreign.project.id)).toBe(false);
  });

  it("never reads a project from another organization", async () => {
    const workspace = await createWorkspace();
    const foreign = await createWorkspace();
    await expect(
      getProject(
        { projectId: foreign.project.id },
        dependencies(workspace),
      ),
    ).rejects.toMatchObject({ status: 404, code: "workspace_not_found" });
  });

  it("lets an assigned Project Lead update with Activity", async () => {
    const workspace = await createWorkspace({
      role: "MEMBER",
      projectRole: "PROJECT_LEAD",
    });
    const project = await updateProject(
      {
        projectId: workspace.project.id,
        name: "Updated by lead",
        requestId: "request-update",
      },
      dependencies(workspace),
    );

    expect(project.name).toBe("Updated by lead");
    expect(
      await prisma.activity.count({
        where: { projectId: project.id, action: "PROJECT_UPDATED" },
      }),
    ).toBe(1);
  });

  it("does not let an ordinary assigned member update", async () => {
    const workspace = await createWorkspace({
      role: "MEMBER",
      projectRole: "MEMBER",
    });
    await expect(
      updateProject(
        { projectId: workspace.project.id, name: "Denied" },
        dependencies(workspace),
      ),
    ).rejects.toMatchObject({ status: 403, code: "permission_denied" });
  });

  it("archives and restores without deleting the project", async () => {
    const workspace = await createWorkspace();
    expect(
      (await archiveProject(
        { projectId: workspace.project.id },
        dependencies(workspace),
      )).status,
    ).toBe("ARCHIVED");
    expect(
      (await restoreProject(
        { projectId: workspace.project.id },
        dependencies(workspace),
      )).status,
    ).toBe("ACTIVE");
    expect(
      await prisma.project.count({ where: { id: workspace.project.id } }),
    ).toBe(1);
    expect(
      await prisma.activity.count({
        where: {
          projectId: workspace.project.id,
          action: { in: ["PROJECT_ARCHIVED", "PROJECT_RESTORED"] },
        },
      }),
    ).toBe(2);
  });

  it("does not let a Project Lead archive", async () => {
    const workspace = await createWorkspace({
      role: "MEMBER",
      projectRole: "PROJECT_LEAD",
    });
    await expect(
      archiveProject(
        { projectId: workspace.project.id },
        dependencies(workspace),
      ),
    ).rejects.toMatchObject({ status: 403, code: "permission_denied" });
  });

  it("assigns only active organization members", async () => {
    const workspace = await createWorkspace();
    const activeUser = await addOrganizationMember(workspace.organization.id);
    const removedUser = await addOrganizationMember(
      workspace.organization.id,
      "REMOVED",
    );

    const assignment = await assignProjectMember(
      {
        projectId: workspace.project.id,
        userId: activeUser.id,
        role: "VIEWER",
      },
      dependencies(workspace),
    );
    expect(assignment.status).toBe("ACTIVE");
    await expect(
      assignProjectMember(
        {
          projectId: workspace.project.id,
          userId: removedUser.id,
          role: "VIEWER",
        },
        dependencies(workspace),
      ),
    ).rejects.toMatchObject({
      status: 404,
      code: "organization_member_not_found",
    });
    expect(
      await prisma.projectMembership.count({
        where: { projectId: workspace.project.id },
      }),
    ).toBe(1);
  });

  it("changes project role once and avoids duplicate Activity on no-op", async () => {
    const workspace = await createWorkspace();
    const target = await addOrganizationMember(workspace.organization.id);
    await assignProjectMember(
      {
        projectId: workspace.project.id,
        userId: target.id,
        role: "VIEWER",
      },
      dependencies(workspace),
    );
    await changeProjectMemberRole(
      {
        projectId: workspace.project.id,
        userId: target.id,
        role: "PROJECT_LEAD",
      },
      dependencies(workspace),
    );
    await changeProjectMemberRole(
      {
        projectId: workspace.project.id,
        userId: target.id,
        role: "PROJECT_LEAD",
      },
      dependencies(workspace),
    );

    expect(
      await prisma.activity.count({
        where: {
          projectId: workspace.project.id,
          action: "PROJECT_MEMBER_ROLE_CHANGED",
        },
      }),
    ).toBe(1);
  });

  it("removes project access as a state transition with Activity", async () => {
    const workspace = await createWorkspace();
    const target = await addOrganizationMember(workspace.organization.id);
    await assignProjectMember(
      {
        projectId: workspace.project.id,
        userId: target.id,
        role: "MEMBER",
      },
      dependencies(workspace),
    );
    const removed = await removeProjectMember(
      { projectId: workspace.project.id, userId: target.id },
      dependencies(workspace),
    );

    expect(removed.status).toBe("REMOVED");
    expect(removed.removedAt).not.toBeNull();
    expect(
      await prisma.activity.count({
        where: {
          targetId: removed.id,
          action: "PROJECT_MEMBER_REMOVED",
        },
      }),
    ).toBe(1);
  });

  it("does not let a Project Lead manage project membership", async () => {
    const workspace = await createWorkspace({
      role: "MEMBER",
      projectRole: "PROJECT_LEAD",
    });
    const target = await addOrganizationMember(workspace.organization.id);
    await expect(
      assignProjectMember(
        {
          projectId: workspace.project.id,
          userId: target.id,
          role: "MEMBER",
        },
        dependencies(workspace),
      ),
    ).rejects.toMatchObject({ status: 403, code: "permission_denied" });
  });
});
