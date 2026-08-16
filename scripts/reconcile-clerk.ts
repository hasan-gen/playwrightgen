import { config as loadEnvironment } from "dotenv";
import { createClerkClient } from "@clerk/backend";

import { validateServerClerkEnvironment } from "@/lib/env";
import {
  type ClerkReconciliationSnapshot,
  reconcileClerkOrganizationSnapshot,
} from "@/lib/services/clerk-sync";
import { normalizeDisplayName } from "@/lib/validation/clerk-webhook";

loadEnvironment({ path: ".env.local", quiet: true });
loadEnvironment({ path: ".env", quiet: true });

type ReconciliationArguments = {
  apply: boolean;
  organizationId?: string;
  slug?: string;
};

function parseArguments(argumentsList: string[]): ReconciliationArguments {
  const result: ReconciliationArguments = { apply: false };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--apply") {
      result.apply = true;
      continue;
    }
    if (argument === "--organization-id" || argument === "--slug") {
      const value = argumentsList[index + 1]?.trim();
      if (!value || value.startsWith("--")) {
        throw new Error("A reconciliation scope value is required.");
      }
      if (argument === "--organization-id") {
        result.organizationId = value;
      } else {
        result.slug = value;
      }
      index += 1;
      continue;
    }
    throw new Error("An unsupported reconciliation argument was supplied.");
  }

  if (Boolean(result.organizationId) === Boolean(result.slug)) {
    throw new Error(
      "Supply exactly one of --organization-id or --slug.",
    );
  }

  return result;
}

async function fetchSnapshot(
  argumentsValue: ReconciliationArguments,
): Promise<ClerkReconciliationSnapshot> {
  const { CLERK_SECRET_KEY } = validateServerClerkEnvironment();
  const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });
  const organization = await clerk.organizations.getOrganization(
    argumentsValue.organizationId
      ? { organizationId: argumentsValue.organizationId }
      : { slug: argumentsValue.slug as string },
  );

  const memberships = [];
  const pageSize = 500;
  let offset = 0;

  while (true) {
    const page = await clerk.organizations.getOrganizationMembershipList({
      organizationId: organization.id,
      limit: pageSize,
      offset,
    });
    memberships.push(...page.data);
    if (page.data.length < pageSize) {
      break;
    }
    offset += pageSize;
  }

  const userIds = memberships.map((membership) => {
    const userId = membership.publicUserData?.userId;
    if (!userId) {
      throw new Error("A Clerk membership is missing its user identifier.");
    }
    return userId;
  });
  const users = await Promise.all(
    [...new Set(userIds)].map((userId) => clerk.users.getUser(userId)),
  );

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdBy: organization.createdBy ?? null,
      updatedAt: new Date(organization.updatedAt),
    },
    users: users.map((user) => ({
      id: user.id,
      primaryEmail: user.primaryEmailAddress?.emailAddress ?? null,
      displayName: normalizeDisplayName({
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      }),
      avatarUrl: user.imageUrl || null,
      disabled: user.banned || user.locked,
      updatedAt: new Date(user.updatedAt),
    })),
    memberships: memberships.map((membership) => {
      const userId = membership.publicUserData?.userId;
      if (!userId) {
        throw new Error("A Clerk membership is missing its user identifier.");
      }
      return {
        id: membership.id,
        organizationId: organization.id,
        userId,
        role: membership.role,
        updatedAt: new Date(membership.updatedAt),
      };
    }),
  };
}

async function main() {
  const argumentsValue = parseArguments(process.argv.slice(2));
  const snapshot = await fetchSnapshot(argumentsValue);
  const result = await reconcileClerkOrganizationSnapshot({
    snapshot,
    apply: argumentsValue.apply,
  });

  process.stdout.write(
    `${JSON.stringify({
      mode: result.status,
      organizationId: result.organizationId,
      counts: result.counts,
    })}\n`,
  );
}

main().catch(() => {
  process.stderr.write("Clerk reconciliation failed safely.\n");
  process.exitCode = 1;
});
