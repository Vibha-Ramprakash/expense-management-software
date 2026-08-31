import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { answerExpenseQuestion, interpretQuestion, validateQueryPlan, validateQuestion, ASSISTANT_MODEL } from "../lib/assistant-query.mjs";
import { RESERVE_ANSWER_SQL } from "../lib/assistant-sql.mjs";

const context = { role: "employee", actorId: "person-noah", approverName: "Maya Chen", asOf: "2026-08-27T12:00:00.000Z" };
const plan = { requestType: "query", topic: "all", status: "active", focus: "all", minAgeDays: 0, merchant: null };
const claim = { id: "mine", merchant: "Rail & travel", status: "submitted", submitter_id: "person-noah", amount_minor: 4250, currency: "EUR", memo: "Workshop", receipt_key: "receipt", over_limit: 0, updated_at: "2026-08-22T12:00:00.000Z", reimbursement_date: null };
const provider = (value, extra = {}) => new Response(JSON.stringify({ id: "resp_test", status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(value) }] }], usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 }, ...extra }));

test("AI interprets a question without receiving the ledger, receipts, or action tools", async () => {
  let calls = 0;
  const result = await interpretQuestion({ question: "What needs approval?", role: "employee", asOf: context.asOf, apiKey: "test-key-not-real", fetchImpl: async (_url, options) => {
    calls++;
    const body = JSON.parse(options.body);
    assert.equal(body.model, ASSISTANT_MODEL);
    assert.equal(body.store, false);
    assert.equal(body.tools, undefined);
    assert.equal(body.text.format.strict, true);
    assert.deepEqual(JSON.parse(body.input[0].content[0].text), { question: "What needs approval?", role: "employee", asOf: context.asOf });
    return provider({ ...plan, topic: "approvals" });
  } });
  assert.equal(calls, 1);
  assert.equal(result.plan.topic, "approvals");
  assert.deepEqual(result.usage, { inputTokens: 100, outputTokens: 20, totalTokens: 120 });
  assert.equal(result.providerId, "resp_test");
  assert.equal(result.estimatedCost, null);
});

test("missing key, malformed questions, refused and incomplete provider responses fail honestly", async () => {
  let calls = 0;
  await assert.rejects(interpretQuestion({ question: "What is next?", role: "employee", apiKey: "", fetchImpl: async () => { calls++; } }), /not connected/);
  assert.equal(calls, 0);
  for (const value of [null, "", "x".repeat(801)]) assert.throws(() => validateQuestion(value));
  for (const response of [provider(plan, { status: "incomplete" }), provider(plan, { output: [{ type: "message", content: [{ type: "refusal", refusal: "private provider text" }] }] }), new Response("private provider text", { status: 401 }), new Response("not JSON")]) {
    await assert.rejects(interpretQuestion({ question: "What is next?", role: "employee", apiKey: "test-key-not-real", fetchImpl: async () => response }), (error) => !error.message.includes("private provider text"));
  }
});

test("untrusted model plans cannot inject queries, actions, prose, IDs or invented merchants", () => {
  for (const value of [{ ...plan, sql: "DELETE FROM expenses" }, { ...plan, status: "approve" }, { ...plan, merchant: "someone else's receipt" }, { ...plan, minAgeDays: -1 }, { ...plan, minAgeDays: 0.1 }, { ...plan, summary: "Payment sent" }]) assert.throws(() => validateQueryPlan(value, "What is missing?"));
  assert.equal(validateQueryPlan({ ...plan, merchant: "rail" }, "How is Rail doing?").merchant, "rail");
});

test("canonical answers enforce role scope before filtering or totaling", () => {
  const rows = [claim, { ...claim, id: "other", submitter_id: "other", amount_minor: 999999 }];
  const employee = answerExpenseQuestion(rows, plan, context);
  assert.deepEqual(employee.items.map((item) => item.expenseId), ["mine"]);
  assert.deepEqual(employee.totals, [{ currency: "EUR", amount: "42.50" }]);
  const approver = answerExpenseQuestion(rows, plan, { ...context, role: "approver" });
  assert.deepEqual(approver.items.map((item) => item.expenseId), ["other"]);
  assert.equal(answerExpenseQuestion(rows, plan, { ...context, role: "finance" }).totalMatches, 0);
  assert.throws(() => answerExpenseQuestion(rows, plan, { ...context, role: "admin" }));
});

test("action and unsupported requests never produce financial mutations or fabricated success", () => {
  const original = structuredClone(claim);
  for (const requestType of ["action", "unsupported"]) {
    const answer = answerExpenseQuestion([claim], { ...plan, requestType }, context);
    assert.equal(answer.items.length, 0);
    assert.equal(answer.totals.length, 0);
    assert.match(answer.limitation, /cannot.*approve.*transfer money/);
  }
  assert.deepEqual(claim, original);
});

test("age, missing proof, overdue schedule and paid queries use canonical state", () => {
  const rows = [structuredClone(claim), { ...claim, id: "draft", status: "draft", receipt_key: null }, { ...claim, id: "due", status: "scheduled", reimbursement_date: "2026-08-26" }, { ...claim, id: "paid", status: "paid" }];
  assert.deepEqual(answerExpenseQuestion(rows, { ...plan, topic: "missing" }, context).items.map((item) => item.expenseId), ["draft"]);
  assert.equal(answerExpenseQuestion(rows, { ...plan, topic: "approvals", focus: "aged", minAgeDays: 6 }, context).totalMatches, 0);
  const due = answerExpenseQuestion(rows, { ...plan, focus: "overdue_payment" }, context);
  assert.deepEqual(due.items.map((item) => item.expenseId), ["due"]);
  const paid = answerExpenseQuestion(rows, { ...plan, topic: "reimbursements", status: "paid" }, context);
  assert.deepEqual(paid.items.map((item) => item.expenseId), ["paid"]);
  assert.match(paid.items[0].reason, /did not transfer/);
  rows[0].status = "paid";
  assert.equal(answerExpenseQuestion(rows, { ...plan, topic: "approvals" }, context).totalMatches, 0);
});

test("totals remain exact beyond safe aggregate numbers and never combine currencies", () => {
  const rows = [{ ...claim, amount_minor: Number.MAX_SAFE_INTEGER }, { ...claim, id: "two", amount_minor: 1 }, { ...claim, id: "usd", currency: "USD", amount_minor: 5 }];
  assert.deepEqual(answerExpenseQuestion(rows, plan, context).totals, [{ currency: "EUR", amount: "90071992547409.92" }, { currency: "USD", amount: "0.05" }]);
  const many = answerExpenseQuestion(Array.from({ length: 30 }, (_, i) => ({ ...claim, id: String(i) })), plan, context);
  assert.equal(many.items.length, 25); assert.equal(many.totalMatches, 30); assert.equal(many.hasMore, true);
  assert.deepEqual(many.totals, [{ currency: "EUR", amount: "1275.00" }]);
});

test("SQLite reservations prevent repeated IDs and cap daily question attempts without losing existing answers", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(await readFile(new URL("../drizzle/20260827091308_lyrical_runaways/migration.sql", import.meta.url), "utf8"));
    db.exec(await readFile(new URL("../drizzle/20260827091626_minor_demogoblin/migration.sql", import.meta.url), "utf8"));
    const reserve = (id, actor = "noah", date = "2026-08-27") => db.prepare(RESERVE_ANSWER_SQL).run(id, actor, "employee", "What is next?", ASSISTANT_MODEL, `${date}T12:00:00.000Z`, `${date}T12:00:00.000Z`, actor, "employee", `${date}T00:00:00.000Z`).changes;
    assert.equal(reserve("one"), 1);
    db.prepare("UPDATE assistant_answers SET status='completed', answer_json=?, generation_json=? WHERE id='one'").run(JSON.stringify({ summary: "Saved snapshot" }), JSON.stringify({ plan, usage: { totalTokens: 120 } }));
    assert.equal(reserve("one"), 0);
    assert.equal(db.prepare("SELECT answer_json FROM assistant_answers WHERE id='one'").get().answer_json, '{"summary":"Saved snapshot"}');
    for (let i = 1; i < 50; i++) assert.equal(reserve(`q-${i}`), 1);
    assert.equal(reserve("limited"), 0);
    assert.equal(reserve("other-person", "other"), 1);
    assert.equal(reserve("tomorrow", "noah", "2026-08-28"), 1);
    assert.throws(() => db.prepare("UPDATE assistant_answers SET status='paid' WHERE id='one'").run());
    assert.match(db.prepare("EXPLAIN QUERY PLAN SELECT * FROM assistant_answers WHERE actor_id=? AND role=? ORDER BY created_at DESC LIMIT 20").get("noah", "employee").detail, /idx_assistant_actor_role_created/);
  } finally { db.close(); }
});
