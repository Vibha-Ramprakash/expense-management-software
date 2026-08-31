import { env } from "cloudflare:workers";
import { validateReceiptBytes } from "@/lib/receipt-extraction.mjs";
import { getDatabase } from "@/lib/store";

export function expenseFormValues(form: FormData) {
  return Object.fromEntries(["merchant", "expenseDate", "amount", "category", "memo", "currency"].map((key) => [key, String(form.get(key) ?? "")]));
}

export async function storeReceipt(receipt: File | null) {
  if (!receipt || receipt.size === 0) return null;
  if (receipt.size > 8 * 1024 * 1024) throw new Error("Receipts must be 8 MB or smaller.");
  const bytes = new Uint8Array(await receipt.arrayBuffer());
  validateReceiptBytes(bytes, receipt.type);
  const key = `receipts/${crypto.randomUUID()}`;
  await env.RECEIPTS.put(key, bytes, {
    httpMetadata: { contentType: receipt.type },
    customMetadata: { originalName: receipt.name.slice(0, 255) },
  });
  return { receiptKey: key, receiptName: receipt.name.slice(0, 255) };
}

export async function discardUnlinkedReceipt(key: string) {
  // Only an upload created by this request may be removed on a failed write.
  const linked = await getDatabase().prepare("SELECT id FROM expenses WHERE receipt_key = ? LIMIT 1").bind(key).first();
  if (!linked) await env.RECEIPTS.delete(key);
}
