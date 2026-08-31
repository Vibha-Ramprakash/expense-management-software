import { env } from "cloudflare:workers";
import business from "@/config/business.json";
import { assertLocalAIRequest, extractReceipt, ExtractionError, MAX_RECEIPT_BYTES } from "@/lib/receipt-extraction.mjs";
import { demoAccessDenial } from "@/lib/demo-access.mjs";

export const dynamic = "force-dynamic";
let extracting = false;

export async function POST(request: Request) {
  const denied = demoAccessDenial(request, process.env.NODE_ENV === "development");
  if (denied) return denied;
  let acquired = false;
  try {
    assertLocalAIRequest(request, process.env.NODE_ENV === "development");
    if (extracting) throw new ExtractionError("Another receipt is being read. Please wait for it to finish.", 429);
    if (Number(request.headers.get("content-length") ?? 0) > MAX_RECEIPT_BYTES + 64 * 1024) {
      throw new ExtractionError("Receipts must be 8 MB or smaller.", 413);
    }
    extracting = true;
    acquired = true;
    const form = await request.formData();
    if (form.get("consent") !== "yes") throw new ExtractionError("Confirm that this receipt may be sent to OpenAI for extraction.", 400);
    const receipt = form.get("receipt");
    if (!(receipt instanceof File) || receipt.size === 0 || receipt.size > MAX_RECEIPT_BYTES) {
      throw new ExtractionError("Choose a receipt up to 8 MB.", 400);
    }
    const extraction = await extractReceipt({
      bytes: new Uint8Array(await receipt.arrayBuffer()), mimeType: receipt.type,
      apiKey: env.OPENAI_API_KEY,
      categories: business.categories.map((item) => item.name), currency: business.defaultCurrency,
    });
    return Response.json({ extraction }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof ExtractionError ? error.message : "Unable to read this receipt. Please try again." }, {
      status: error instanceof ExtractionError ? error.status : 500,
      headers: { "Cache-Control": "no-store" },
    });
  } finally {
    if (acquired) extracting = false;
  }
}
