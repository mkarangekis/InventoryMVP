import { createClient, type User } from "@supabase/supabase-js";
import {
  createOperationsOwnerProvisionPlan,
  hashOperationsOwnerProvisionPlan,
} from "../../src/operations/auth/provisioning";

const readArgument = (name: string): string | null => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
};

const hasArgument = (name: string): boolean => process.argv.includes(name);

const requiredArgument = (name: string): string => {
  const value = readArgument(name);
  if (!value) throw new Error(`Missing required argument: ${name}`);
  return value;
};

const run = async () => {
  const environment = requiredArgument("--environment");
  if (environment !== "staging" && environment !== "production") {
    throw new Error("--environment must be staging or production.");
  }

  const plan = createOperationsOwnerProvisionPlan({
    email: requiredArgument("--email"),
    tenantId: requiredArgument("--tenant-id"),
    environment,
    siteUrl: requiredArgument("--site-url"),
  });
  const payloadHash = hashOperationsOwnerProvisionPlan(plan);
  const apply = hasArgument("--apply");

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          plan,
          payloadHash,
          nextStep:
            "Review the plan, then rerun with --apply, --confirmation <payloadHash>, and --approval-record <id>.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const confirmation = requiredArgument("--confirmation");
  const approvalRecord = requiredArgument("--approval-record");
  if (confirmation !== payloadHash) {
    throw new Error("The confirmation hash does not match the exact plan.");
  }
  if (approvalRecord === "pending") {
    throw new Error("A completed approval record is required.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be supplied through a secure environment.",
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let existingUser: User | null = null;
  const usersPerPage = 200;
  for (let page = 1; page <= 100; page += 1) {
    const response = await admin.auth.admin.listUsers({
      page,
      perPage: usersPerPage,
    });
    if (response.error) throw response.error;
    existingUser =
      response.data.users.find(
        (user) => user.email?.trim().toLowerCase() === plan.email,
      ) ?? null;
    if (existingUser || response.data.users.length < usersPerPage) break;
    if (page === 100) {
      throw new Error("User search exceeded the bounded page limit.");
    }
  }
  if (existingUser) {
    throw new Error(
      "That email already exists. Refusing to elevate an existing account.",
    );
  }

  const tenant = await admin
    .from("tenants")
    .select("id")
    .eq("id", plan.tenantId)
    .maybeSingle();
  if (tenant.error) throw tenant.error;
  if (!tenant.data) throw new Error("The approved tenant does not exist.");

  let invitedUserId: string | null = null;
  let profileCreated = false;

  try {
    const invitation = await admin.auth.admin.inviteUserByEmail(plan.email, {
      redirectTo: plan.redirectUrl,
      data: { account_purpose: "operations_administrator" },
    });
    if (invitation.error || !invitation.data.user) {
      throw invitation.error ?? new Error("Supabase returned no invited user.");
    }
    invitedUserId = invitation.data.user.id;

    const profile = await admin.from("user_profiles").insert({
      id: invitedUserId,
      tenant_id: plan.tenantId,
      email: plan.email,
      role: plan.profileRole,
    });
    if (profile.error) throw profile.error;
    profileCreated = true;

    const metadata = await admin.auth.admin.updateUserById(invitedUserId, {
      app_metadata: {
        ...invitation.data.user.app_metadata,
        operations_center_role: plan.operationsRole,
      },
    });
    if (metadata.error) throw metadata.error;

    console.log(
      JSON.stringify(
        {
          status: "invited",
          environment: plan.environment,
          userId: invitedUserId,
          email: plan.email,
          tenantId: plan.tenantId,
          redirectUrl: plan.redirectUrl,
          payloadHash,
          approvalRecord,
          passwordHandledByCodex: false,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    if (profileCreated && invitedUserId) {
      await admin.from("user_profiles").delete().eq("id", invitedUserId);
    }
    if (invitedUserId) {
      await admin.auth.admin.deleteUser(invitedUserId);
    }
    throw error;
  }
};

void run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
