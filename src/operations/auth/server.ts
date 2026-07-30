import "server-only";

import { isOperationsCenterEnabled } from "@/config/flags";
import { isDemoEmail } from "@/lib/demo";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveOperationsAccess } from "@/operations/domain/access";
import type { OperationsPrincipal } from "@/operations/domain/types";

type OperationsAuthorization =
  | { ok: true; principal: OperationsPrincipal }
  | { ok: false; response: Response };

const responseForAccessFailure = (
  code:
    | "feature_disabled"
    | "unauthenticated"
    | "tenant_required"
    | "demo_denied"
    | "permission_denied",
): Response => {
  if (code === "feature_disabled") {
    return Response.json(
      { error: "not_found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (code === "unauthenticated") {
    return Response.json(
      { error: "unauthenticated" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { error: "forbidden" },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
};

export const authorizeOperationsRequest = async (
  request: Request,
): Promise<OperationsAuthorization> => {
  const featureEnabled = isOperationsCenterEnabled();
  if (!featureEnabled) {
    return {
      ok: false,
      response: responseForAccessFailure("feature_disabled"),
    };
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;

  if (!token) {
    return {
      ok: false,
      response: responseForAccessFailure("unauthenticated"),
    };
  }

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(token);

  if (userError || !userData.user) {
    return {
      ok: false,
      response: responseForAccessFailure("unauthenticated"),
    };
  }

  const profile = await supabaseAdmin
    .from("user_profiles")
    .select("tenant_id, role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profile.error) {
    return {
      ok: false,
      response: Response.json(
        { error: "authorization_unavailable" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }

  const access = resolveOperationsAccess({
    featureEnabled,
    userId: userData.user.id,
    tenantId: profile.data?.tenant_id ?? null,
    profileRole: profile.data?.role ?? null,
    operationsRole:
      typeof userData.user.app_metadata?.operations_center_role === "string"
        ? userData.user.app_metadata.operations_center_role
        : null,
    isDemo: isDemoEmail(userData.user.email),
  });

  if (!access.allowed) {
    return {
      ok: false,
      response: responseForAccessFailure(access.code),
    };
  }

  return {
    ok: true,
    principal: {
      userId: userData.user.id,
      tenantId: profile.data!.tenant_id,
      role: access.role,
      email: userData.user.email ?? null,
      authenticatedAt: userData.user.last_sign_in_at ?? null,
    },
  };
};
