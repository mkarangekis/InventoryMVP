import { authorizeOperationsRequest } from "@/operations/auth/server";
import { getOperationsEnvironment } from "@/operations/config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await authorizeOperationsRequest(request);
  if (!authorization.ok) return authorization.response;

  return Response.json(
    {
      allowed: true,
      role: authorization.principal.role,
      environment: getOperationsEnvironment(),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
