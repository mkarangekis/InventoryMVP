import { authorizeOperationsRequest } from "@/operations/auth/server";
import { isOperationsOverviewEnabled } from "@/config/flags";
import { buildRepositoryEvidenceOverview } from "@/operations/fixtures/repository-evidence";
import { redactOperationsArtifact } from "@/operations/security/redaction";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await authorizeOperationsRequest(request);
  if (!authorization.ok) return authorization.response;

  if (!isOperationsOverviewEnabled()) {
    return Response.json(
      { error: "module_disabled" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    redactOperationsArtifact(buildRepositoryEvidenceOverview()),
    {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
