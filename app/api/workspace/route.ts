import { demoAccessDenial } from "@/lib/demo-access.mjs";
import { getEffectiveBusinessSettings, listAllAuditEvents, listExpenses, listPolicyEvents } from "@/lib/store";
import { buildWorkspace, WORKSPACE_VIEWS } from "@/lib/workspace.mjs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = demoAccessDenial(request, process.env.NODE_ENV === "development");
  if (denied) return denied;
  try {
    const parameters = new URL(request.url).searchParams;
    const role = parameters.get("role") ?? "employee";
    const view = parameters.get("view") ?? "overview";
    if (!Object.hasOwn(WORKSPACE_VIEWS, role)) throw new Error("Choose a valid demo role.");
    const business = await getEffectiveBusinessSettings();
    const workspace = buildWorkspace(await listExpenses(), await listAllAuditEvents(), { role, view, business, policyEvents: await listPolicyEvents() });
    return Response.json(workspace, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load this workspace." }, { status: 400 });
  }
}
