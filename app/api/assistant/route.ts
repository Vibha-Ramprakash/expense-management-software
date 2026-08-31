import business from "@/config/business.json";
import { listExpenses } from "@/lib/store";
import { buildAttentionDigest } from "@/lib/attention.mjs";
import { demoAccessDenial } from "@/lib/demo-access.mjs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = demoAccessDenial(request, process.env.NODE_ENV === "development");
  if (denied) return denied;
  const role = new URL(request.url).searchParams.get("role") ?? "employee";
  if (!["employee", "approver", "finance"].includes(role)) return Response.json({ error: "Choose a valid demo role." }, { status: 400 });
  const approver = business.approvers[0];
  const actorId = role === "employee" ? "person-noah" : role === "approver" ? approver.id : "person-julian";
  const digest = buildAttentionDigest(await listExpenses() ?? [], { role, actorId, approverName: approver.name });
  return Response.json(digest, { headers: { "Cache-Control": "no-store" } });
}
