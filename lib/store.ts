import { env } from "cloudflare:workers";
import business from "@/config/business.json";
import { nextRevisionTime } from "@/lib/expense-validation.mjs";
import { nextReimbursementDate } from "@/lib/reimbursement.mjs";

export type ExpenseStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "scheduled"
  | "paid";

export type Expense = {
  id: string;
  merchant: string;
  expense_date: string;
  amount_minor: number;
  currency: string;
  category: string;
  memo: string;
  receipt_key: string | null;
  receipt_name: string | null;
  submitter_id: string;
  submitter_name: string;
  status: ExpenseStatus;
  over_limit: number;
  approver_id: string | null;
  approver_name: string | null;
  reimbursement_date: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditEvent = {
  id: string;
  expense_id: string;
  event_type: string;
  actor_id: string;
  actor_name: string;
  note: string;
  created_at: string;
};

export type PolicyLimit = { category: string; limit_minor: number; actor_id: string; actor_name: string; updated_at: string };
export type PolicyEvent = { id:string; category:string; previous_limit_minor:number; new_limit_minor:number; actor_id:string; actor_name:string; note:string; created_at:string };
export type ApproverCommand = { id:string; actor_id:string; actor_name:string; prompt:string; plan_json:string; match_ids_json:string; status:"previewed"|"executed"; result_json:string|null; created_at:string; executed_at:string|null };

const now = () => new Date().toISOString();

export function getDatabase() {
  if (!env.DB) {
    throw new Error("The DB binding is unavailable. Run this app through its normal start command.");
  }
  return env.DB;
}

export function getReceiptBucket() {
  if (!env.RECEIPTS) {
    throw new Error("The RECEIPTS binding is unavailable. Run this app through its normal start command.");
  }
  return env.RECEIPTS;
}

export async function ensureDatabase() {
  const db = getDatabase();

  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      merchant TEXT NOT NULL,
      expense_date TEXT NOT NULL,
      amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
      currency TEXT NOT NULL,
      category TEXT NOT NULL,
      memo TEXT NOT NULL,
      receipt_key TEXT,
      receipt_name TEXT,
      submitter_id TEXT NOT NULL,
      submitter_name TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('draft','submitted','approved','rejected','scheduled','paid')),
      over_limit INTEGER NOT NULL DEFAULT 0 CHECK (over_limit IN (0,1)),
      approver_id TEXT,
      approver_name TEXT,
      reimbursement_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (expense_id) REFERENCES expenses(id)
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_expenses_status_updated ON expenses(status, updated_at DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_audit_expense_created ON audit_events(expense_id, created_at DESC)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS assistant_answers (
      id TEXT PRIMARY KEY NOT NULL, actor_id TEXT NOT NULL, role TEXT NOT NULL,
      question TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('pending','completed','error')),
      model TEXT NOT NULL, answer_json TEXT, generation_json TEXT, error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_assistant_actor_role_created ON assistant_answers(actor_id, role, created_at DESC)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS policy_limits (
      category TEXT PRIMARY KEY, limit_minor INTEGER NOT NULL CHECK (limit_minor > 0),
      actor_id TEXT NOT NULL, actor_name TEXT NOT NULL, updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS policy_events (
      id TEXT PRIMARY KEY, category TEXT NOT NULL, previous_limit_minor INTEGER NOT NULL,
      new_limit_minor INTEGER NOT NULL, actor_id TEXT NOT NULL, actor_name TEXT NOT NULL,
      note TEXT NOT NULL, created_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_policy_events_created ON policy_events(created_at DESC)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS approver_commands (
      id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, actor_name TEXT NOT NULL, prompt TEXT NOT NULL,
      plan_json TEXT NOT NULL, match_ids_json TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('previewed','executed')),
      result_json TEXT, created_at TEXT NOT NULL, executed_at TEXT
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_approver_commands_created ON approver_commands(created_at DESC)"),
  ]);

  // Forward upgrade for an already-running local development copy of assistant history.
  const columns = await db.prepare("PRAGMA table_info(assistant_answers)").all<{ name: string }>();
  if (!columns.results.some((column) => column.name === "generation_json")) {
    try { await db.prepare("ALTER TABLE assistant_answers ADD COLUMN generation_json TEXT").run(); }
    catch (error) {
      const current = await db.prepare("PRAGMA table_info(assistant_answers)").all<{ name: string }>();
      if (!current.results.some((column) => column.name === "generation_json")) throw error;
    }
  }
  const count = await db.prepare("SELECT COUNT(*) AS total FROM expenses").first<{ total: number }>();
  if (!count?.total) await seedDemoData();
}

async function seedDemoData() {
  const db = getDatabase();
  const createdAt = "2026-08-24T09:00:00.000Z";
  const primaryApprover = business.approvers[0] ?? {
    id: "person-maya",
    name: "Maya Chen",
  };
  const seeds = [
    ["exp-alpine", "Alpine Rail", "2026-08-24", 17840, "Travel", "Train to the Zurich client workshop", "submitted", 0, null, null],
    ["exp-field-notes", "Field Notes Café", "2026-08-25", 9420, "Meals", "Team lunch after the launch review", "submitted", 1, null, null],
    ["exp-figma", "Figma", "2026-08-21", 1500, "Software", "Monthly design seat", "approved", 0, primaryApprover.id, primaryApprover.name],
    ["exp-helvetia", "Hotel Helvetia", "2026-08-19", 48600, "Travel", "Two nights for partner planning", "scheduled", 0, primaryApprover.id, primaryApprover.name],
    ["exp-print", "Print Atelier", "2026-08-18", 13250, "Client costs", "Presentation boards for Aster & Co.", "paid", 0, primaryApprover.id, primaryApprover.name],
    ["exp-headphones", "Digitec", "2026-08-23", 23900, "Equipment", "Noise-cancelling headset", "draft", 0, null, null],
    ["exp-lumen-house", "Lumen House Hotel", "2026-08-31", 8640, "Travel", "One night for the Basel planning session", "submitted", 0, null, null],
    ["exp-city-transfer", "City Transfer", "2026-08-30", 4280, "Travel", "Taxi from Zurich station to the client office", "submitted", 0, null, null],
  ] as const;

  const statements = [];
  for (const [index, seed] of seeds.entries()) {
    const [id, merchant, date, amount, category, memo, status, , approverId, approverName] = seed;
    const categoryPolicy = business.categories.find((item) => item.name === category) ?? business.categories[index % business.categories.length];
    const overLimit = amount > categoryPolicy.limitMinor ? 1 : 0;
    const reimbursementDate = status === "scheduled" ? nextReimbursementDate(business.reimbursement, new Date(createdAt)) : status === "paid" ? "2026-08-21" : null;
    statements.push(
      db.prepare(`INSERT OR IGNORE INTO expenses (
        id, merchant, expense_date, amount_minor, currency, category, memo,
        receipt_key, receipt_name, submitter_id, submitter_name, status,
        over_limit, approver_id, approver_name, reimbursement_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        id,
        merchant,
        date,
        amount,
        business.defaultCurrency,
        categoryPolicy.name,
        memo,
        `${merchant.toLowerCase().replaceAll(" ", "-")}-receipt.pdf`,
        "person-noah",
        "Noah Williams",
        status,
        overLimit,
        approverId,
        approverName,
        reimbursementDate,
        createdAt,
        createdAt,
      ),
    );
    statements.push(
      db.prepare(`INSERT OR IGNORE INTO audit_events (
        id, expense_id, event_type, actor_id, actor_name, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(
        `audit-${id}`,
        id,
        status === "draft" ? "created" : status,
        status === "approved"
          ? primaryApprover.id
          : status === "scheduled" || status === "paid"
            ? "person-julian"
            : "person-noah",
        status === "approved"
          ? primaryApprover.name
          : status === "scheduled" || status === "paid"
            ? "Julian Hart"
            : "Noah Williams",
        "Demo record created",
        createdAt,
      ),
    );
  }
  await db.batch(statements);
  await db.prepare("PRAGMA optimize").run();
}

export async function listExpenses() {
  await ensureDatabase();
  const result = await getDatabase()
    .prepare("SELECT * FROM expenses ORDER BY updated_at DESC, created_at DESC")
    .all<Expense>();
  return result.results;
}

export async function getExpense(id: string) {
  await ensureDatabase();
  return getDatabase().prepare("SELECT * FROM expenses WHERE id = ?").bind(id).first<Expense>();
}

export async function listAuditEvents(expenseId: string) {
  await ensureDatabase();
  const result = await getDatabase()
    .prepare("SELECT * FROM audit_events WHERE expense_id = ? ORDER BY created_at DESC")
    .bind(expenseId)
    .all<AuditEvent>();
  return result.results;
}

export async function listAllAuditEvents() {
  await ensureDatabase();
  const result = await getDatabase()
    .prepare("SELECT * FROM audit_events ORDER BY created_at DESC, id DESC")
    .all<AuditEvent>();
  return result.results;
}

export async function getEffectiveBusinessSettings() {
  await ensureDatabase();
  const rows = (await getDatabase().prepare("SELECT * FROM policy_limits ORDER BY category").all<PolicyLimit>()).results;
  const overrides = new Map(rows.map((row) => [row.category, row]));
  return {
    ...business,
    categories: business.categories.map((category) => {
      const override = overrides.get(category.name);
      return { ...category, limitMinor: override?.limit_minor ?? category.limitMinor, source: override ? "approver" : "configuration", updatedAt: override?.updated_at ?? null };
    }),
  };
}

export async function listPolicyEvents() {
  await ensureDatabase();
  return (await getDatabase().prepare("SELECT * FROM policy_events ORDER BY created_at DESC, id DESC LIMIT 20").all<PolicyEvent>()).results;
}

export async function setPolicyLimit(input:{category:string;limitMinor:number;actorId:string;actorName:string;note:string}) {
  await ensureDatabase();
  const configured = business.categories.find((category) => category.name === input.category);
  if (!configured) throw new Error("Choose a configured expense category.");
  if (!Number.isSafeInteger(input.limitMinor) || input.limitMinor <= 0) throw new Error("Enter a positive policy limit.");
  const current = await getDatabase().prepare("SELECT * FROM policy_limits WHERE category = ?").bind(input.category).first<PolicyLimit>();
  const previousLimit = current?.limit_minor ?? configured.limitMinor;
  const updatedAt = now();
  await getDatabase().batch([
    getDatabase().prepare(`INSERT INTO policy_limits (category, limit_minor, actor_id, actor_name, updated_at)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(category) DO UPDATE SET limit_minor=excluded.limit_minor, actor_id=excluded.actor_id, actor_name=excluded.actor_name, updated_at=excluded.updated_at`).bind(input.category,input.limitMinor,input.actorId,input.actorName,updatedAt),
    getDatabase().prepare(`INSERT INTO policy_events (id, category, previous_limit_minor, new_limit_minor, actor_id, actor_name, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(`policy-${crypto.randomUUID()}`,input.category,previousLimit,input.limitMinor,input.actorId,input.actorName,input.note,updatedAt),
    getDatabase().prepare("UPDATE expenses SET over_limit = CASE WHEN amount_minor > ? THEN 1 ELSE 0 END WHERE category = ?").bind(input.limitMinor,input.category),
  ]);
  return getEffectiveBusinessSettings();
}

export async function saveApproverCommand(input:{id:string;actorId:string;actorName:string;prompt:string;plan:unknown;matchIds:string[]}) {
  await ensureDatabase();
  const createdAt = now();
  await getDatabase().prepare(`INSERT INTO approver_commands (id, actor_id, actor_name, prompt, plan_json, match_ids_json, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'previewed', ?)`).bind(input.id,input.actorId,input.actorName,input.prompt,JSON.stringify(input.plan),JSON.stringify(input.matchIds),createdAt).run();
  return getApproverCommand(input.id);
}

export async function getApproverCommand(id:string) {
  await ensureDatabase();
  return getDatabase().prepare("SELECT * FROM approver_commands WHERE id = ?").bind(id).first<ApproverCommand>();
}

export async function finishApproverCommand(id:string,outcome:unknown) {
  const update = await getDatabase().prepare("UPDATE approver_commands SET status='executed', result_json=?, executed_at=? WHERE id=? AND status='previewed'").bind(JSON.stringify(outcome),now(),id).run();
  if (update.meta?.changes !== 1) throw new Error("This command was already confirmed or is no longer available.");
}

export type ExpenseInput = {
  merchant: string;
  expenseDate: string;
  amountMinor: number;
  currency: string;
  category: string;
  memo: string;
  receiptKey: string | null;
  receiptName: string | null;
  overLimit: boolean;
};

export async function createExpense(input: ExpenseInput, status: "draft" | "submitted" = "submitted") {
  await ensureDatabase();
  const db = getDatabase();
  const id = `exp-${crypto.randomUUID()}`;
  const createdAt = now();
  await db.batch([
    db.prepare(`INSERT INTO expenses (
      id, merchant, expense_date, amount_minor, currency, category, memo,
      receipt_key, receipt_name, submitter_id, submitter_name, status,
      over_limit, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      id,
      input.merchant,
      input.expenseDate,
      input.amountMinor,
      input.currency,
      input.category,
      input.memo,
      input.receiptKey,
      input.receiptName,
      "person-noah",
      "Noah Williams",
      status,
      input.overLimit ? 1 : 0,
      createdAt,
      createdAt,
    ),
    db.prepare(`INSERT INTO audit_events (
      id, expense_id, event_type, actor_id, actor_name, note, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(
      `audit-${crypto.randomUUID()}`,
      id,
      status === "draft" ? "draft_saved" : "submitted",
      "person-noah",
      "Noah Williams",
      status === "draft" ? "Draft saved; receipt and business purpose may still be needed" : input.overLimit ? "Submitted above the category limit" : "Submitted with receipt details confirmed",
      createdAt,
    ),
  ]);
  return getExpense(id);
}

export async function transitionExpense(input: {
  id: string;
  from: ExpenseStatus;
  expectedUpdatedAt: string;
  to: ExpenseStatus;
  actorId: string;
  actorName: string;
  note: string;
  reimbursementDate?: string | null;
}) {
  const db = getDatabase();
  const updatedAt = nextRevisionTime(input.expectedUpdatedAt);
  const results = await db.batch([
    db.prepare(`INSERT INTO audit_events (id, expense_id, event_type, actor_id, actor_name, note, created_at)
      SELECT ?, id, ?, ?, ?, ?, ? FROM expenses WHERE id = ? AND status = ? AND updated_at = ?`).bind(
      `audit-${crypto.randomUUID()}`, input.to, input.actorId, input.actorName, input.note, updatedAt,
      input.id, input.from, input.expectedUpdatedAt,
    ),
    db.prepare(`UPDATE expenses
      SET status = ?,
          approver_id = CASE WHEN ? = 'approved' THEN ? ELSE approver_id END,
          approver_name = CASE WHEN ? = 'approved' THEN ? ELSE approver_name END,
          reimbursement_date = COALESCE(?, reimbursement_date),
          updated_at = ?
      WHERE id = ? AND status = ? AND updated_at = ?`).bind(
      input.to,
      input.to,
      input.actorId,
      input.to,
      input.actorName,
      input.reimbursementDate ?? null,
      updatedAt,
      input.id,
      input.from,
      input.expectedUpdatedAt,
    ),
  ]);
  if (results[1].meta?.changes !== 1) throw new Error("This claim changed while you were reviewing it. Refresh and try again.");
  return getExpense(input.id);
}

export async function updateDraft(existing: Expense, input: ExpenseInput, status: "draft" | "submitted") {
  if (existing.status !== "draft" || existing.submitter_id !== "person-noah") throw new Error("Only your own drafts can be edited.");
  const updatedAt = nextRevisionTime(existing.updated_at);
  const db = getDatabase();
  const results = await db.batch([
    db.prepare(`INSERT INTO audit_events (id, expense_id, event_type, actor_id, actor_name, note, created_at)
      SELECT ?, id, ?, ?, ?, ?, ? FROM expenses WHERE id = ? AND status = 'draft' AND updated_at = ? AND submitter_id = ?`).bind(
      `audit-${crypto.randomUUID()}`, status === "submitted" ? "submitted" : "draft_saved", "person-noah", "Noah Williams",
      status === "submitted" ? "Submitted after completing receipt details" : "Draft updated", updatedAt,
      existing.id, existing.updated_at, "person-noah",
    ),
    db.prepare(`UPDATE expenses SET merchant = ?, expense_date = ?, amount_minor = ?, currency = ?, category = ?, memo = ?,
      receipt_key = ?, receipt_name = ?, over_limit = ?, status = ?, updated_at = ?
      WHERE id = ? AND status = 'draft' AND updated_at = ? AND submitter_id = ?`).bind(
      input.merchant, input.expenseDate, input.amountMinor, input.currency, input.category, input.memo,
      input.receiptKey, input.receiptName, input.overLimit ? 1 : 0, status, updatedAt,
      existing.id, existing.updated_at, "person-noah",
    ),
  ]);
  if (results[1].meta?.changes !== 1) throw new Error("This draft changed in another window. Reopen it and try again.");
  return getExpense(existing.id);
}

export async function resetDemoData() {
  await ensureDatabase();
  const db = getDatabase();
  await db.batch([
    db.prepare("DELETE FROM approver_commands"),
    db.prepare("DELETE FROM policy_events"),
    db.prepare("DELETE FROM policy_limits"),
    db.prepare("DELETE FROM assistant_answers"),
    db.prepare("DELETE FROM audit_events"),
    db.prepare("DELETE FROM expenses"),
  ]);
  await seedDemoData();
  return listExpenses();
}
