import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { describeSchedule } from "../lib/reimbursement.mjs";

const business = JSON.parse(
  await readFile(new URL("../config/business.json", import.meta.url), "utf8"),
);

function escapePattern(value) {
  // Configuration is escaped text in server-rendered HTML, not raw markup.
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" };
  return value.replace(/[&<>"']/g, (character) => entities[character]).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Keel expense workflow", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, new RegExp(`<title>${escapePattern(business.productName)} — Expense management<\\/title>`, "i"));
  assert.match(html, /Employee overview/);
  assert.match(html, /Add an expense/);
  assert.match(html, /My expenses/);
  assert.match(html, /Expense policy/);
  assert.match(html, /Owner demo · simulated roles/);
  assert.match(html, /Recorded paid this month/);
  assert.match(html, /Finance record · UTC/);
  assert.match(html, new RegExp(escapePattern(describeSchedule(business.reimbursement).heading)));
  assert.match(html, new RegExp(escapePattern(describeSchedule(business.reimbursement).note)));
  assert.doesNotMatch(html, />Settled</);
  assert.match(html, /Choose a receipt to enable extraction/);
  assert.match(html, /Save draft/);
  assert.match(html, /Send this receipt to OpenAI/);
  assert.match(html, /Manual entry and draft saving remain available/);
  assert.doesNotMatch(html, /unit-test-not-a-real-key|OPENAI_API_KEY=/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
  assert.doesNotMatch(html, /Receipts in|Money back|Every claim|detective work|clean line from approval|Let the receipt do the typing|Policy stays in the workflow|Drop your next receipt/i);
});

test("uses literal product headings for every role and entry state", async () => {
  const source = await readFile(new URL("../components/KeelApp.tsx", import.meta.url), "utf8");
  const formSource = await readFile(new URL("../components/ReceiptForm.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const heading of ["Employee overview", "Approver overview", "Finance overview", "Approval queue", "Reimbursements", "What needs your attention?", "Expense policy"]) {
    assert.match(source, new RegExp(escapePattern(heading)));
  }
  assert.match(formSource, /Complete expense/);
  assert.match(formSource, /Add expense/);
  assert.match(styles, /\.demo-switcher a\s*\{[^}]*min-height:\s*38px/s);
  assert.match(styles, /body:has\(\.expense-dialog\[open\]\)\s*\{\s*overflow:\s*hidden;/);
});

test("includes the active supported business configuration in the rendered shell", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, new RegExp(escapePattern(business.organizationName)));
  assert.match(html, new RegExp(escapePattern(business.accentColor), "i"));
  for (const category of business.categories) {
    assert.match(html, new RegExp(escapePattern(category.name)));
  }
  const approverHtml = await (await render("/workspace/approver/overview")).text();
  assert.match(approverHtml, new RegExp(escapePattern(business.approvers[0].name)));
  const financeHtml = await (await render("/workspace/finance/overview")).text();
  assert.match(financeHtml, new RegExp(escapePattern(describeSchedule(business.reimbursement).heading)));
  assert.match(financeHtml, new RegExp(escapePattern(business.reimbursement.frequency), "i"));
});

test("server-renders distinct role navigation and the attention question desk", async () => {
  const approver = await (await render("/workspace/approver/approvals")).text();
  assert.match(approver, /Approver(?:<!-- -->)? workspace/);
  assert.match(approver, /Approval queue/);
  assert.match(approver, /Decision history/);
  assert.doesNotMatch(approver, /Add an expense/);

  const finance = await (await render("/workspace/finance/reimbursements")).text();
  assert.match(finance, /Finance(?:<!-- -->)? workspace/);
  assert.match(finance, /Spend insights/);
  assert.match(finance, /Payment history/);
  assert.doesNotMatch(finance, /Add an expense/);

  const attention = await (await render("/workspace/employee/attention")).text();
  assert.match(attention, /What needs your attention\?/);
  assert.match(attention, /Ask about your claims/);
  assert.match(attention, /Saved answers for this demo role/);
  assert.match(attention, /Receipt files and the claim ledger are not sent/);
});
