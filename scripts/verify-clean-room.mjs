import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { decimalToMinorUnits } from "../lib/finance.mjs";
import { nextReimbursementDate } from "../lib/reimbursement.mjs";

const sourceRoot = resolve(import.meta.dirname, "..");
const git = process.platform === "win32" ? "git.exe" : "git";
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run this verifier through npm run acceptance:clean-room.");
const keepClone = process.argv.includes("--keep");
const temporaryRoot = await mkdtemp(join(tmpdir(), "keel-clean-room-"));
const cloneRoot = join(temporaryRoot, "repo");
const startedAt = new Date().toISOString();

function run(label, command, args, cwd) {
  console.log(`\n[clean-room] ${label}`);
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, CI: "1" },
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status}.`);
}

function runNpm(label, args, cwd) {
  run(label, process.execPath, [npmCli, ...args], cwd);
}

async function availablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert(address && typeof address === "object");
      const { port } = address;
      server.close((error) => (error ? reject(error) : resolvePort(port)));
    });
  });
}

async function waitForServer(baseUrl, child, logs) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Demo server stopped before it was ready.\n${logs.join("")}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/expenses`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`Demo server did not become ready.\n${logs.join("")}`);
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolveExit) => child.once("exit", resolveExit)),
    new Promise((resolveWait) => setTimeout(resolveWait, 8_000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function withServer(cwd, callback) {
  const port = await availablePort();
  const baseUrl = `http://localhost:${port}`;
  const cli = resolve(cwd, "node_modules", "vinext", "dist", "cli.js");
  const logs = [];
  const serverEnv = { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" };
  delete serverEnv.OPENAI_API_KEY;
  const child = spawn(process.execPath, [cli, "dev", "--host", "127.0.0.1", "--port", String(port)], {
    cwd,
    env: serverEnv,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const collect = (chunk) => {
    logs.push(chunk.toString());
    if (logs.length > 120) logs.shift();
  };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  try {
    await waitForServer(baseUrl, child, logs);
    return await callback(baseUrl);
  } finally {
    await stopServer(child);
  }
}

async function jsonRequest(url, options) {
  const headers = new Headers(options?.headers);
  if (options?.method && !["GET", "HEAD"].includes(options.method.toUpperCase()) && !headers.has("origin")) headers.set("origin", new URL(url).origin);
  const response = await fetch(url, { ...options, headers });
  const payload = await response.json();
  return { response, payload };
}

async function action(baseUrl, expenseId, body, expectedStatus = 200) {
  const current = await jsonRequest(`${baseUrl}/api/expenses/${expenseId}`);
  const result = await jsonRequest(`${baseUrl}/api/expenses/${expenseId}/actions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ expectedUpdatedAt: current.payload.expense.updated_at, ...body }),
  });
  assert.equal(result.response.status, expectedStatus, JSON.stringify(result.payload));
  return result.payload;
}

async function verifyWorkflow(baseUrl, business, marker, amount, expectedOverLimit) {
  const receipt = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/1ygZ6QAAAABJRU5ErkJggg==",
    "base64",
  );
  const form = new FormData();
  form.set("merchant", marker);
  form.set("expenseDate", new Date().toISOString().slice(0, 10));
  form.set("amount", amount);
  form.set("category", "Meals");
  form.set("memo", "Clean-room workflow verification");
  form.set("receipt", new File([receipt], "clean-room.png", { type: "image/png" }));

  const created = await jsonRequest(`${baseUrl}/api/expenses`, { method: "POST", body: form });
  assert.equal(created.response.status, 201, JSON.stringify(created.payload));
  const expense = created.payload.expense;
  assert.equal(expense.currency, business.defaultCurrency);
  assert.equal(expense.amount_minor, decimalToMinorUnits(amount));
  assert.equal(expense.over_limit, expectedOverLimit ? 1 : 0);
  assert.ok(expense.receipt_key);

  const selfApproval = await action(
    baseUrl,
    expense.id,
    { action: "approve", actorRole: "approver", actorId: expense.submitter_id, actorName: expense.submitter_name },
    400,
  );
  assert.match(selfApproval.error, /configured approver|cannot approve/i);

  const approver = business.approvers[0];
  await action(baseUrl, expense.id, {
    action: "approve",
    actorRole: "approver",
    actorId: approver.id,
    actorName: approver.name,
  });
  const schedulingStarted = new Date();
  const scheduled = await action(baseUrl, expense.id, {
    action: "schedule",
    actorRole: "finance",
    actorId: "person-julian",
    actorName: "Julian Hart",
  });
  assert.ok(new Set([nextReimbursementDate(business.reimbursement, schedulingStarted), nextReimbursementDate(business.reimbursement, new Date())]).has(scheduled.expense.reimbursement_date), "The route must use the configured cadence and lead time.");
  await action(baseUrl, expense.id, {
    action: "pay",
    actorRole: "finance",
    actorId: "person-julian",
    actorName: "Julian Hart",
  });

  const detail = await jsonRequest(`${baseUrl}/api/expenses/${expense.id}`);
  assert.equal(detail.response.status, 200);
  const paymentEvent = detail.payload.audit.find((event) => event.event_type === "paid");
  assert.equal(detail.payload.expense.updated_at, paymentEvent.created_at, "The paid record must retain the canonical payment audit timestamp.");
  assert.deepEqual(
    new Set(detail.payload.audit.map((event) => event.event_type)),
    new Set(["submitted", "approved", "scheduled", "paid"]),
  );

  const receiptKey = expense.receipt_key.replace("receipts/", "");
  const storedReceipt = await fetch(`${baseUrl}/api/receipts/${receiptKey}`);
  assert.equal(storedReceipt.status, 200);
  assert.equal(storedReceipt.headers.get("content-type"), "image/png");
  assert.ok(storedReceipt.headers.get("etag"));

  const csvResponse = await fetch(`${baseUrl}/api/export`);
  const csv = await csvResponse.text();
  assert.equal(csvResponse.status, 200);
  assert.match(csv, new RegExp(marker));
  assert.match(csv, new RegExp(amount.replace(".", "\\.")));
  assert.match(csv, new RegExp(`paid,(?:yes|no),${approver.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},`));
  assert.ok(csv.split("\r\n")[0].endsWith(",payment_recorded_at"));
  assert.ok(csv.split("\r\n").find((row) => row.startsWith(`${expense.id},`)).endsWith(`${scheduled.expense.reimbursement_date},${paymentEvent.created_at}`), "Export must distinguish the scheduled date from finance's recording timestamp.");

  return { expenseId: expense.id, reimbursementDate: scheduled.expense.reimbursement_date, paymentRecordedAt: paymentEvent.created_at };
}

async function verifyExactMoneyAndExport(baseUrl, business) {
  const date = new Date().toISOString().slice(0, 10);
  const form = new FormData();
  // Multipart form text uses CRLF line endings on the wire.
  for (const [key, value] of Object.entries({ merchant: "=1+2", expenseDate: date, amount: "90071992547409.91", category: business.categories[0].name, memo: '@SUM(1,2)\r\n"review"', intent: "draft" })) form.set(key, value);
  const created = await jsonRequest(`${baseUrl}/api/expenses`, { method: "POST", body: form });
  assert.equal(created.response.status, 201, JSON.stringify(created.payload));
  assert.equal(created.payload.expense.amount_minor, Number.MAX_SAFE_INTEGER);
  form.set("expectedUpdatedAt", created.payload.expense.updated_at);
  const saved = await jsonRequest(`${baseUrl}/api/expenses/${created.payload.expense.id}`, { method: "PATCH", body: form });
  assert.equal(saved.response.status, 200, JSON.stringify(saved.payload));
  assert.equal(saved.payload.expense.amount_minor, Number.MAX_SAFE_INTEGER);
  assert.equal(saved.payload.expense.merchant, "=1+2");
  assert.equal(saved.payload.expense.memo, '@SUM(1,2)\r\n"review"');
  const csv = await (await fetch(`${baseUrl}/api/export`)).text();
  assert.ok(csv.includes(`${created.payload.expense.id},'=1+2,${date},90071992547409.91,${business.defaultCurrency},`));
  assert.ok(csv.includes('"\'@SUM(1,2)\r\n""review"""'));
  form.set("amount", "90071992547409.92");
  form.set("expectedUpdatedAt", saved.payload.expense.updated_at);
  const rejected = await jsonRequest(`${baseUrl}/api/expenses/${created.payload.expense.id}`, { method: "PATCH", body: form });
  assert.equal(rejected.response.status, 400);
  assert.match(rejected.payload.error, /exact range/);
  const final = await jsonRequest(`${baseUrl}/api/expenses/${created.payload.expense.id}`);
  assert.equal(final.payload.expense.amount_minor, Number.MAX_SAFE_INTEGER);
  assert.equal(final.payload.audit.length, 2, "An invalid amount must not create an audit event.");
  return { exactMaximumRoundTrip: true, unsafeAmountRejected: true, spreadsheetExpressionsNeutralized: true };
}

async function verifyDraftAssistantWorkflow(baseUrl, business) {
  const employee = { actorRole: "employee", actorId: "person-noah", actorName: "Noah Williams" };
  const approver = { actorRole: "approver", actorId: business.approvers[0].id, actorName: business.approvers[0].name };
  const form = new FormData();
  for (const [key, value] of Object.entries({ merchant: "Draft Assistant Rehearsal", expenseDate: "2026-08-27", amount: "42.50", category: "Meals", memo: "", intent: "draft" })) form.set(key, value);
  const created = await jsonRequest(`${baseUrl}/api/expenses`, { method: "POST", body: form });
  assert.equal(created.response.status, 201, JSON.stringify(created.payload));
  let claim = created.payload.expense;
  assert.equal(claim.status, "draft");
  assert.equal(claim.receipt_key, null);
  const digest = await jsonRequest(`${baseUrl}/api/assistant?role=employee`);
  assert.equal(digest.payload.mode, "rules");
  assert.deepEqual(digest.payload.items.find((item) => item.expenseId === claim.id).missing, ["receipt", "business purpose"]);
  await action(baseUrl, claim.id, { action: "submit", ...employee }, 400);

  form.set("expectedUpdatedAt", claim.updated_at);
  form.set("memo", "Business workshop");
  form.set("intent", "submit");
  const noReceipt = await jsonRequest(`${baseUrl}/api/expenses/${claim.id}`, { method: "PATCH", body: form });
  assert.equal(noReceipt.response.status, 400);
  assert.match(noReceipt.payload.error, /Attach the receipt/);
  const receipt = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/1ygZ6QAAAABJRU5ErkJggg==", "base64");
  form.set("receipt", new File([receipt], "draft-rehearsal.png", { type: "image/png" }));
  const submitted = await jsonRequest(`${baseUrl}/api/expenses/${claim.id}`, { method: "PATCH", body: form });
  assert.equal(submitted.response.status, 200, JSON.stringify(submitted.payload));
  claim = submitted.payload.expense;
  assert.equal(claim.status, "submitted");
  assert.ok(claim.receipt_key);
  const staleEdit = await jsonRequest(`${baseUrl}/api/expenses/${claim.id}`, { method: "PATCH", body: form });
  assert.equal(staleEdit.response.status, 400);

  await action(baseUrl, claim.id, { action: "reject", ...approver, note: "Please identify the workshop." });
  const reopened = await action(baseUrl, claim.id, { action: "reopen", ...employee });
  form.set("expectedUpdatedAt", reopened.expense.updated_at);
  form.set("memo", "Aster launch workshop");
  form.delete("receipt");
  const resubmitted = await jsonRequest(`${baseUrl}/api/expenses/${claim.id}`, { method: "PATCH", body: form });
  assert.equal(resubmitted.response.status, 200, JSON.stringify(resubmitted.payload));
  assert.equal(resubmitted.payload.expense.receipt_key, claim.receipt_key);
  // An approval based on the pre-correction screen must not approve revised details.
  await action(baseUrl, claim.id, { action: "approve", ...approver, expectedUpdatedAt: claim.updated_at }, 400);

  const approvals = await Promise.all([1, 2].map(() => jsonRequest(`${baseUrl}/api/expenses/${claim.id}/actions`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "approve", ...approver, expectedUpdatedAt: resubmitted.payload.expense.updated_at }),
  })));
  assert.deepEqual(approvals.map((result) => result.response.status).sort(), [200, 400]);
  const detail = await jsonRequest(`${baseUrl}/api/expenses/${claim.id}`);
  assert.equal(detail.payload.audit.filter((event) => event.event_type === "approved").length, 1);
  assert.equal(detail.payload.audit.filter((event) => event.event_type === "submitted").length, 2);

  const finance = { actorRole: "finance", actorId: "person-julian", actorName: "Julian Hart" };
  await action(baseUrl, claim.id, { action: "schedule", ...finance });
  await action(baseUrl, claim.id, { action: "pay", ...finance });
  const finished = await jsonRequest(`${baseUrl}/api/assistant?role=employee`);
  assert.equal(finished.payload.items.some((item) => item.expenseId === claim.id), false);
  // This complete correction/reimbursement path intentionally never exports CSV.
  return { expenseId: claim.id, withoutCSV: true, duplicateApprovalBlocked: true };
}

async function verifyPrivateAssistantWithoutKey(baseUrl) {
  const headers = { "x-keel-ai-request": "1", origin: baseUrl, "content-type": "application/json" };
  const history = await jsonRequest(`${baseUrl}/api/assistant/answers?role=employee`, { headers });
  assert.equal(history.response.status, 200, JSON.stringify(history.payload));
  assert.deepEqual(history.payload.answers, []);
  const body = { role: "employee", requestId: crypto.randomUUID(), question: "What is missing?" };
  const denied = await jsonRequest(`${baseUrl}/api/assistant/answers`, { method: "POST", headers, body: JSON.stringify(body) });
  assert.equal(denied.response.status, 400);
  assert.match(denied.payload.error, /Confirm/);
  const disconnected = await jsonRequest(`${baseUrl}/api/assistant/answers`, { method: "POST", headers, body: JSON.stringify({ ...body, consent: true }) });
  assert.equal(disconnected.response.status, 503);
  assert.match(disconnected.payload.error, /not connected/);
  const after = await jsonRequest(`${baseUrl}/api/assistant/answers?role=employee`, { headers });
  assert.deepEqual(after.payload.answers, []);
  // The development server may reject a foreign Origin before the JSON route runs.
  const foreign = await fetch(`${baseUrl}/api/assistant/answers?role=employee`, { headers: { ...headers, origin: "https://unrelated.invalid" } });
  assert.equal(foreign.status, 403);
  return { noKeyFailureExplicit: true, noAnswerInvented: true, crossOriginBlocked: true };
}

async function verifyLocalAccessBarrier(baseUrl) {
  const before = (await jsonRequest(`${baseUrl}/api/expenses`)).payload.expenses;
  for (const [path, method] of [["/api/expenses", "POST"], ["/api/expenses/exp-alpine", "PATCH"], ["/api/expenses/exp-alpine/actions", "POST"], ["/api/reset", "POST"]]) {
    for (const headers of [{}, { origin: "https://unrelated.invalid" }]) {
      const response = await fetch(`${baseUrl}${path}`, { method, headers, body: "not valid form or JSON" });
      assert.equal(response.status, 403, `${method} ${path} must reject an untrusted origin before mutation.`);
    }
  }
  for (const path of ["/api/expenses", "/api/expenses/exp-alpine", "/api/export", "/api/assistant", "/api/receipts/unlisted-key"]) {
    const response = await fetch(`${baseUrl}${path}`, { headers: { origin: "https://unrelated.invalid" } });
    assert.equal(response.status, 403);
  }
  const after = (await jsonRequest(`${baseUrl}/api/expenses`)).payload.expenses;
  assert.deepEqual(after, before, "Rejected writes and resets must preserve the ledger.");
  return { originlessWritesBlocked: true, foreignOriginsBlocked: true, ledgerUnchanged: true };
}

try {
  run("clone repository", git, ["clone", "--quiet", sourceRoot, cloneRoot], sourceRoot);
  runNpm("install locked dependencies", ["ci"], cloneRoot);
  runNpm("verify default product", ["run", "check"], cloneRoot);

  const defaultBusiness = JSON.parse(await readFile(join(cloneRoot, "config", "business.json"), "utf8"));
  const defaultEvidence = await withServer(cloneRoot, async (baseUrl) => {
    const initial = await jsonRequest(`${baseUrl}/api/expenses`);
    assert.equal(initial.response.status, 200);
    assert.equal(initial.payload.expenses.length, 8);
    const access = await verifyLocalAccessBarrier(baseUrl);
    assert.equal(initial.payload.expenses.find((expense) => expense.id === "exp-helvetia").reimbursement_date, nextReimbursementDate(defaultBusiness.reimbursement, new Date("2026-08-24T09:00:00Z")));
    const assistant = await verifyPrivateAssistantWithoutKey(baseUrl);
    const workflow = await verifyWorkflow(baseUrl, defaultBusiness, "Clean Room Bistro", "86.40", true);
    const drafts = await verifyDraftAssistantWorkflow(baseUrl, defaultBusiness);
    const financial = await verifyExactMoneyAndExport(baseUrl, defaultBusiness);
    return { workflow, drafts, assistant, financial, access };
  });

  runNpm("delete local database", ["run", "reset"], cloneRoot);
  await withServer(cloneRoot, async (baseUrl) => {
    const restored = await jsonRequest(`${baseUrl}/api/expenses`);
    assert.equal(restored.payload.expenses.length, 8);
    assert.equal(restored.payload.expenses.some((expense) => expense.merchant === "Clean Room Bistro"), false);
  });

  runNpm(
    "apply business-only customization",
    [
      "run",
      "configure",
      "--",
      "--organization",
      "Aster Works",
      "--accent",
      "#82E6D0",
      "--currency",
      "USD",
      "--categories",
      "Rail & travel=1800;Meals=95;Subscriptions=500;Equipment=1200;Projects=400",
      "--approvers",
      "Rina Shah <rina@example.com>;Tom Vale <tom@example.com>",
      "--frequency",
      "fortnightly",
      "--weekday",
      "Thursday",
      "--anchor-date",
      "2026-08-27",
      "--lead-days",
      "3",
    ],
    cloneRoot,
  );
  runNpm("reset for customized policy", ["run", "reset"], cloneRoot);
  runNpm("verify customized product", ["run", "check"], cloneRoot);

  const customBusiness = JSON.parse(await readFile(join(cloneRoot, "config", "business.json"), "utf8"));
  const customEvidence = await withServer(cloneRoot, async (baseUrl) => {
    const home = await (await fetch(baseUrl)).text();
    assert.match(home, /Aster Works/);
    assert.match(home, /#82E6D0/i);
    assert.match(home, /Thursday/);
    const initial = await jsonRequest(`${baseUrl}/api/expenses`);
    assert.deepEqual(new Set(initial.payload.expenses.map((expense) => expense.currency)), new Set(["USD"]));
    assert.equal(initial.payload.expenses.every((expense) => customBusiness.categories.some((category) => category.name === expense.category)), true);
    const access = await verifyLocalAccessBarrier(baseUrl);
    assert.equal(initial.payload.expenses.find((expense) => expense.id === "exp-helvetia").reimbursement_date, nextReimbursementDate(customBusiness.reimbursement, new Date("2026-08-24T09:00:00Z")));
    const assistant = await verifyPrivateAssistantWithoutKey(baseUrl);
    assert.deepEqual(
      new Set(initial.payload.expenses.map((expense) => expense.approver_name).filter(Boolean)),
      new Set(["Rina Shah"]),
    );
    const rejected = await action(
      baseUrl,
      "exp-alpine",
      { action: "approve", actorRole: "approver", actorId: "person-maya", actorName: "Maya Chen" },
      400,
    );
    assert.match(rejected.error, /not a configured approver/i);
    const workflow = await verifyWorkflow(baseUrl, customBusiness, "Aster Clean Room", "96.00", true);
    const drafts = await verifyDraftAssistantWorkflow(baseUrl, customBusiness);
    const financial = await verifyExactMoneyAndExport(baseUrl, customBusiness);
    return { workflow, drafts, assistant, financial, access };
  });

  runNpm("configure monthly reimbursement", ["run", "configure", "--", "--frequency", "monthly", "--day-of-month", "31"], cloneRoot);
  runNpm("verify monthly product", ["run", "check"], cloneRoot);
  const monthlyBusiness = JSON.parse(await readFile(join(cloneRoot, "config", "business.json"), "utf8"));
  const monthlyEvidence = await withServer(cloneRoot, async (baseUrl) => {
    const home = await (await fetch(baseUrl)).text();
    assert.match(home, /Day 31/);
    assert.match(home, /monthly/);
    assert.match(home, /month-end if shorter/);
    const retained = await jsonRequest(`${baseUrl}/api/expenses/${customEvidence.workflow.expenseId}`);
    assert.equal(retained.payload.expense.reimbursement_date, customEvidence.workflow.reimbursementDate, "Changing future cadence must not reschedule an existing payment.");
    const workflow = await verifyWorkflow(baseUrl, monthlyBusiness, "Monthly Clean Room", "96.00", true);
    return { workflow, existingSchedulePreserved: true };
  });

  const status = spawnSync(git, ["status", "--porcelain", "--untracked-files=all"], {
    cwd: cloneRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(status.status, 0);
  const changes = status.stdout.split(/\r?\n/).filter(Boolean);
  assert.deepEqual(changes.map((line) => line.slice(3)), ["config/business.json"]);

  const sha = spawnSync(git, ["rev-parse", "HEAD"], { cwd: cloneRoot, encoding: "utf8", windowsHide: true }).stdout.trim();
  console.log("\n[clean-room] PASS");
  console.log(JSON.stringify({ startedAt, source: basename(sourceRoot), sha, defaultEvidence, customEvidence, monthlyEvidence }, null, 2));
} finally {
  if (keepClone) {
    console.log(`\n[clean-room] Kept temporary clone at ${cloneRoot}`);
  } else {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}
