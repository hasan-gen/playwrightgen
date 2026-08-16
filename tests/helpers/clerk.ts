type UserFixtureOptions = {
  id?: string;
  updatedAt?: number;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  primaryEmail?: string | null;
  banned?: boolean;
  locked?: boolean;
};

export function clerkUserData(options: UserFixtureOptions = {}) {
  const id = options.id ?? "user_fixture";
  const primaryEmailId = options.primaryEmail === null ? null : "email_fixture";

  return {
    id,
    primary_email_address_id: primaryEmailId,
    email_addresses: primaryEmailId
      ? [
          {
            id: primaryEmailId,
            email_address: options.primaryEmail ?? "fixture@example.test",
          },
        ]
      : [],
    first_name: options.firstName ?? "Fixture",
    last_name: options.lastName ?? "User",
    username: options.username ?? null,
    image_url: "https://images.example.test/avatar.png",
    banned: options.banned ?? false,
    locked: options.locked ?? false,
    updated_at: options.updatedAt ?? 1_700_000_000_000,
  };
}

type OrganizationFixtureOptions = {
  id?: string;
  name?: string;
  slug?: string;
  creatorUserId?: string | null;
  updatedAt?: number;
};

export function clerkOrganizationData(
  options: OrganizationFixtureOptions = {},
) {
  return {
    id: options.id ?? "org_fixture",
    name: options.name ?? "Fixture organization",
    slug: options.slug ?? "fixture-organization",
    ...(options.creatorUserId === null
      ? {}
      : { created_by: options.creatorUserId ?? "user_fixture" }),
    updated_at: options.updatedAt ?? 1_700_000_000_000,
  };
}

type MembershipFixtureOptions = {
  id?: string;
  userId?: string;
  role?: string;
  updatedAt?: number;
  organization?: OrganizationFixtureOptions;
};

export function clerkMembershipData(
  options: MembershipFixtureOptions = {},
) {
  const userId = options.userId ?? "user_fixture";
  return {
    id: options.id ?? "membership_fixture",
    role: options.role ?? "org:member",
    updated_at: options.updatedAt ?? 1_700_000_000_000,
    organization: clerkOrganizationData({
      creatorUserId: userId,
      ...options.organization,
    }),
    public_user_data: {
      user_id: userId,
      first_name: "Fixture",
      last_name: "Member",
      image_url: "https://images.example.test/member.png",
    },
  };
}
