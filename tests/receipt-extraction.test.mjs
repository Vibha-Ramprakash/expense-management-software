import assert from "node:assert/strict";
import test from "node:test";
import { assertLocalAIRequest, extractReceipt, MAX_RECEIPT_BYTES, normalizeExtraction, validateReceiptBytes } from "../lib/receipt-extraction.mjs";

const policy = { categories: ["Meals", "Travel"], currency: "EUR" };
const receipt = { isReceipt: true, merchant: "Example Café", expenseDate: "2026-08-27", amount: "82.40", currency: "EUR", category: "Meals", warnings: [] };
const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
const options = { ...policy, bytes: png, mimeType: "image/png", apiKey: "unit-test-not-a-real-key" };
const completed = (value) => Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(value) }] }] });

test("extracts structured receipt suggestions without creating an expense", async () => {
  let calls = 0;
  const result = await extractReceipt({ ...options, fetchImpl: async (url, init) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    const body = JSON.parse(init.body);
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.equal(body.input[0].content[1].type, "input_image");
    assert.match(body.input[0].content[1].image_url, /^data:image\/png;base64,/);
    assert.equal(body.tools, undefined);
    assert.match(body.instructions, /untrusted data/);
    return completed(receipt);
  } });
  assert.equal(calls, 1);
  assert.equal(result.amount, "82.40");
  assert.equal(result.requiresReview, true);
  assert.equal(result.currencyMismatch, false);
});

test("PDF input uses inline file data and does not upload a persistent provider file", async () => {
  await extractReceipt({ ...options, mimeType: "application/pdf", bytes: new TextEncoder().encode("%PDF-1.7\n"), fetchImpl: async (_url, init) => {
    const input = JSON.parse(init.body).input[0].content[1];
    assert.equal(input.type, "input_file");
    assert.equal(input.filename, "receipt.pdf");
    assert.match(input.file_data, /^data:application\/pdf;base64,/);
    return completed(receipt);
  } });
});

test("an absent key fails honestly without calling any provider", async () => {
  await assert.rejects(extractReceipt({ ...options, apiKey: "", fetchImpl: () => { throw new Error("must not call"); } }), /not connected yet/);
});

test("rejects unsupported, spoofed, empty and oversized receipt files", () => {
  assert.throws(() => validateReceiptBytes(png, "application/pdf"), /valid PDF/);
  assert.throws(() => validateReceiptBytes(png, "text/html"), /valid PDF/);
  assert.throws(() => validateReceiptBytes(new Uint8Array(), "image/png"), /between 1 byte/);
  assert.throws(() => validateReceiptBytes(new Uint8Array(MAX_RECEIPT_BYTES + 1), "image/png"), /8 MB/);
});

test("never silently converts or relabels a foreign or unknown currency", () => {
  const foreign = normalizeExtraction({ ...receipt, currency: "USD" }, policy);
  assert.equal(foreign.currencyMismatch, true);
  assert.equal(foreign.amount, null);
  assert.match(foreign.warnings.join(" "), /do not relabel/);
  const unknown = normalizeExtraction({ ...receipt, currency: null }, policy);
  assert.equal(unknown.amount, null);
  assert.match(unknown.warnings.join(" "), /currency is unclear/);
});

test("ambiguous or invalid facts remain blank, not guessed", () => {
  for (const amount of ["82,40", "1,200.00", "1e4", "-8.00", "0", "0.001", "900719925474099100"]) {
    assert.equal(normalizeExtraction({ ...receipt, amount }, policy).amount, null);
  }
  const result = normalizeExtraction({ ...receipt, expenseDate: "2026-02-30", category: "Invented", merchant: "" }, policy);
  assert.equal(result.expenseDate, null);
  assert.equal(result.category, null);
  assert.equal(result.merchant, null);
  assert.throws(() => normalizeExtraction({ ...receipt, isReceipt: false }, policy), /readable receipt/);
});

test("provider failures are sanitized and never returned as fabricated receipt details", async () => {
  for (const status of [401, 403, 429, 500]) {
    await assert.rejects(extractReceipt({ ...options, fetchImpl: async () => new Response("private provider account details", { status }) }), (error) => {
      assert.doesNotMatch(error.message, /private provider/);
      assert.equal(error.status, 502);
      return true;
    });
  }
  await assert.rejects(extractReceipt({ ...options, fetchImpl: async () => { throw new Error("network details"); } }), /could not be reached/);
  await assert.rejects(extractReceipt({ ...options, fetchImpl: async () => Response.json({ status: "incomplete" }) }), /did not finish/);
  await assert.rejects(extractReceipt({ ...options, fetchImpl: async () => Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "refusal", refusal: "no" }] }] }) }), /could not process/);
  await assert.rejects(extractReceipt({ ...options, fetchImpl: async () => Response.json({ status: "completed", output: [] }) }), /incomplete details/);
});

test("live AI is restricted to same-origin local development until authentication exists", () => {
  const request = (url, origin = new URL(url).origin, marker = "1") => new Request(url, { method: "POST", headers: { origin, "x-keel-ai-request": marker } });
  assert.doesNotThrow(() => assertLocalAIRequest(request("http://localhost:3000/api/receipts/extract"), true));
  assert.throws(() => assertLocalAIRequest(request("http://localhost:3000/api/receipts/extract"), false), /secure employee accounts/);
  assert.throws(() => assertLocalAIRequest(request("https://keel.example/api/receipts/extract"), true), /local demo/);
  assert.throws(() => assertLocalAIRequest(request("http://localhost:3000/api/receipts/extract", "https://evil.example"), true), /from the Keel app/);
  assert.throws(() => assertLocalAIRequest(request("http://localhost:3000/api/receipts/extract", "http://localhost:3000", ""), true), /from the Keel app/);
});
