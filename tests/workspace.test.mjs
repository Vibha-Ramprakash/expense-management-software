import assert from "node:assert/strict";
import test from "node:test";
import business from "../config/business.json" with { type: "json" };
import { buildWorkspace, WORKSPACE_VIEWS } from "../lib/workspace.mjs";

const base = {
  currency: business.defaultCurrency,
  category: business.categories[0].name,
  memo: "Client work",
  receipt_key: "receipts/test.png",
  receipt_name: "test.png",
  submitter_id: "person-noah",
  submitter_name: "Noah Williams",
  over_limit: 0,
  approver_id: null,
  approver_name: null,
  reimbursement_date: null,
  created_at: "2026-08-20T09:00:00.000Z",
  updated_at: "2026-08-27T09:00:00.000Z",
};

const expenses = [
  { ...base, id: "draft", merchant: "Draft shop", expense_date: "2026-08-26", amount_minor: 1000, status: "draft" },
  { ...base, id: "submitted", merchant: "Review cafe", expense_date: "2026-08-25", amount_minor: 9500, status: "submitted", over_limit: 1 },
  { ...base, id: "approved", merchant: "Ready rail", expense_date: "2026-08-24", amount_minor: 2100, status: "approved", approver_id: business.approvers[0].id, approver_name: business.approvers[0].name },
  { ...base, id: "scheduled", merchant: "Scheduled hotel", expense_date: "2026-08-23", amount_minor: 3300, status: "scheduled", approver_id: business.approvers[0].id, approver_name: business.approvers[0].name, reimbursement_date: "2026-08-29" },
  { ...base, id: "paid", merchant: "Paid print", expense_date: "2026-08-22", amount_minor: 4400, status: "paid", approver_id: business.approvers[0].id, approver_name: business.approvers[0].name, reimbursement_date: "2026-08-28", updated_at: "2026-08-30T09:00:00.000Z" },
];

const audits = [
  { id: "a-submitted", expense_id: "submitted", event_type: "submitted", actor_id: "person-noah", actor_name: "Noah Williams", note: "Submitted", created_at: "2026-08-27T09:00:00.000Z" },
  { id: "a-approved", expense_id: "approved", event_type: "approved", actor_id: business.approvers[0].id, actor_name: business.approvers[0].name, note: "Approved for client work", created_at: "2026-08-28T09:00:00.000Z" },
  { id: "a-scheduled", expense_id: "scheduled", event_type: "scheduled", actor_id: "person-julian", actor_name: "Julian Hart", note: "Reference FIN-42", created_at: "2026-08-29T09:00:00.000Z" },
  { id: "a-paid", expense_id: "paid", event_type: "paid", actor_id: "person-julian", actor_name: "Julian Hart", note: "Recorded only", created_at: "2026-08-30T09:00:00.000Z" },
];

const context = { business, asOf: "2026-08-31T12:00:00.000Z" };

test("workspace routes are explicit and role specific", () => {
  assert.deepEqual(WORKSPACE_VIEWS.employee, ["overview", "expenses", "attention", "policy"]);
  assert.deepEqual(WORKSPACE_VIEWS.approver, ["overview", "approvals", "attention", "history", "policy"]);
  assert.deepEqual(WORKSPACE_VIEWS.finance, ["overview", "reimbursements", "attention", "insights", "history"]);
  assert.throws(() => buildWorkspace(expenses, audits, { ...context, role: "employee", view: "approvals" }), /valid workspace/);
});

test("employee, approver and finance receive different queues and metrics", () => {
  const employee = buildWorkspace(expenses, audits, { ...context, role: "employee", view: "expenses" });
  const approver = buildWorkspace(expenses, audits, { ...context, role: "approver", view: "approvals" });
  const finance = buildWorkspace(expenses, audits, { ...context, role: "finance", view: "reimbursements" });

  assert.deepEqual(employee.expenses.map((item) => item.id), ["draft", "submitted", "approved", "scheduled", "paid"]);
  assert.deepEqual(approver.expenses.map((item) => item.id), ["submitted"]);
  assert.deepEqual(finance.expenses.map((item) => item.id), ["scheduled", "approved"]);
  assert.deepEqual(employee.metrics.map((item) => item.label), ["Needs my input", "Awaiting decision", "Scheduled reimbursement", "Recorded paid this month"]);
  assert.deepEqual(approver.metrics.map((item) => item.label), ["Awaiting my decision", "Above policy limit", "Oldest waiting", "Approved this month"]);
  assert.deepEqual(finance.metrics.map((item) => item.label), ["Ready to schedule", "Scheduled to record", "Overdue", "Recorded paid this month"]);
});

test("history, notes and insights are derived from canonical records", () => {
  const approver = buildWorkspace(expenses, audits, { ...context, role: "approver", view: "history" });
  const finance = buildWorkspace(expenses, audits, { ...context, role: "finance", view: "insights" });
  assert.deepEqual(approver.expenses.map((item) => item.id), ["approved"]);
  assert.match(approver.recentActivity[0].note, /Approved/);
  assert.equal(finance.insights.policyExceptions, 1);
  assert.equal(finance.insights.calendar[0].date, "2026-08-29");
  assert.ok(finance.insights.categories.some((item) => item.category === business.categories[0].name));
  assert.equal(finance.metrics[2].value, "1");
});
