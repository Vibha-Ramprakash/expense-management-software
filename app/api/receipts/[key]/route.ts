import { getReceiptBucket } from "@/lib/store";
import { demoAccessDenial } from "@/lib/demo-access.mjs";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const denied = demoAccessDenial(request, process.env.NODE_ENV === "development");
  if (denied) return denied;
  const { key } = await context.params;
  const object = await getReceiptBucket().get(`receipts/${key}`);
  if (!object) return new Response("Receipt not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, max-age=300");
  return new Response(object.body, { headers });
}
