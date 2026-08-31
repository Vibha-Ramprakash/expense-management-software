import { resetDemoData } from "@/lib/store";
import { demoAccessDenial } from "@/lib/demo-access.mjs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = demoAccessDenial(request, process.env.NODE_ENV === "development");
  if (denied) return denied;
  return Response.json({ expenses: await resetDemoData() });
}
