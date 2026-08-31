import assert from "node:assert/strict";
import test from "node:test";
import { buildAttentionDigest } from "../lib/attention.mjs";
import { assertReadyForSubmission, nextRevisionTime, validateExpenseDetails } from "../lib/expense-validation.mjs";
import { assertTransition } from "../lib/finance.mjs";

const business = { defaultCurrency: "EUR", categories: [{ name: "Meals", limitMinor: 7500 }] };
const valid = { merchant: "Example Café", expenseDate: "2026-08-27", amount: "82.40", category: "Meals", memo: "Client workshop" };
const row = { id: "a", merchant: "Example Café", expense_date: "2026-08-27", amount_minor: 8240, currency: "EUR", category: "Meals", memo: "", receipt_key: null, submitter_id: "me", status: "draft", over_limit: 1, updated_at: "2026-08-24T09:00:00Z", reimbursement_date: null };
const context = { role: "employee", actorId: "me", approverName: "Maya", asOf: "2026-08-27T10:00:00Z" };

test("drafts retain positive money/date/category invariants but may lack a receipt or purpose", () => {
  const draft = validateExpenseDetails({ ...valid, memo: "" }, business, { complete: false });
  assert.equal(draft.amountMinor, 8240);
  assert.equal(draft.overLimit, true);
  assert.throws(() => validateExpenseDetails({ ...valid, amount: "0" }, business, { complete: false }), /positive integer/);
  assert.throws(() => validateExpenseDetails({ ...valid, expenseDate: "2026-02-30" }, business, { complete: false }), /valid expense date/);
  assert.throws(() => validateExpenseDetails({ ...valid, category: "Other" }, business, { complete: false }), /configured expense categories/);
  assert.throws(() => validateExpenseDetails({ ...valid, amount: "82,40" }, business, { complete: false }), /decimal point/);
});

test("submission cannot bypass missing receipt, purpose or currency checks", () => {
  assert.throws(() => validateExpenseDetails(valid, business), /Attach the receipt/);
  assert.throws(() => validateExpenseDetails({ ...valid, memo: "" }, business, { hasReceipt: true }), /business purpose/);
  assert.throws(() => validateExpenseDetails({ ...valid, currency: "USD" }, business, { hasReceipt: true }), /converting/);
  assert.throws(() => assertReadyForSubmission(row, business), /business purpose/);
  assert.doesNotThrow(() => assertReadyForSubmission({ ...row, memo: "Workshop", receipt_key: "receipts/proof" }, business));
});

test("only the submitter may reopen a returned claim or submit a draft", () => {
  assert.doesNotThrow(() => assertTransition({ from: "rejected", to: "draft", actorRole: "employee", actorId: "me", submitterId: "me" }));
  assert.throws(() => assertTransition({ from: "rejected", to: "draft", actorRole: "finance", actorId: "me", submitterId: "me" }), /submitting employee/);
  assert.throws(() => assertTransition({ from: "draft", to: "submitted", actorRole: "employee", actorId: "other", submitterId: "me" }), /submitting employee/);
});

test("revision tokens advance even when two edits happen within one millisecond", () => {
  const old = "2026-08-27T10:00:00.000Z";
  assert.equal(nextRevisionTime(old, Date.parse(old)), "2026-08-27T10:00:00.001Z");
});

test("employee attention only names saved own active claims and real missing fields", () => {
  const digest = buildAttentionDigest([row, { ...row, id: "private", submitter_id: "other" }, { ...row, id: "paid", status: "paid" }], context);
  assert.equal(digest.mode, "rules");
  assert.equal(digest.counts.all, 1);
  assert.deepEqual(digest.items[0].missing, ["receipt", "business purpose"]);
  assert.equal(digest.items[0].href, "/#claim=a");
  assert.doesNotMatch(JSON.stringify(digest), /private/);
  assert.match(digest.limitation, /Unrecorded purchases/);
});

test("approver attention excludes self-approval and explains policy exceptions", () => {
  const digest = buildAttentionDigest([{ ...row, status: "submitted" }, { ...row, id: "own", status: "submitted", submitter_id: "manager" }], { ...context, role: "approver", actorId: "manager" });
  assert.equal(digest.counts.approvals, 1);
  assert.match(digest.items[0].reason, /3 days/);
  assert.match(digest.items[0].reason, /Above the category limit/);
});

test("finance attention prioritizes overdue payments without claiming money moved", () => {
  const digest = buildAttentionDigest([
    { ...row, id: "approved", status: "approved" },
    { ...row, id: "late", status: "scheduled", reimbursement_date: "2026-08-26" },
    { ...row, id: "today", status: "scheduled", reimbursement_date: "2026-08-27" },
    { ...row, id: "future", status: "scheduled", reimbursement_date: "2026-08-28" }, row,
  ], { ...context, role: "finance" });
  assert.equal(digest.counts.reimbursements, 4);
  assert.equal(digest.items[0].expenseId, "late");
  assert.match(digest.items[0].reason, /has not transferred money/);
  assert.equal(digest.items.at(-1).expenseId, "future");
  assert.throws(() => buildAttentionDigest([], { ...context, role: "admin" }), /valid demo role/);
});

test("attention disappears immediately after its canonical task is completed", () => {
  assert.equal(buildAttentionDigest([row], context).counts.missing, 1);
  const submitted = { ...row, status: "submitted", receipt_key: "receipts/proof", memo: "Workshop" };
  assert.equal(buildAttentionDigest([submitted], context).counts.missing, 0);
  assert.equal(buildAttentionDigest([{ ...submitted, status: "paid" }], context).counts.all, 0);
});
