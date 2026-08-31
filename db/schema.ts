import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id").notNull().primaryKey(),
    merchant: text("merchant").notNull(),
    expenseDate: text("expense_date").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    category: text("category").notNull(),
    memo: text("memo").notNull(),
    receiptKey: text("receipt_key"),
    receiptName: text("receipt_name"),
    submitterId: text("submitter_id").notNull(),
    submitterName: text("submitter_name").notNull(),
    status: text("status").notNull(),
    overLimit: integer("over_limit", { mode: "boolean" }).notNull(),
    approverId: text("approver_id"),
    approverName: text("approver_name"),
    reimbursementDate: text("reimbursement_date"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    check("expenses_id_not_null", sql`${table.id} is not null`),
    check("expenses_amount_positive", sql`${table.amountMinor} > 0`),
    check(
      "expenses_status_valid",
      sql`${table.status} in ('draft','submitted','approved','rejected','scheduled','paid')`,
    ),
    check("expenses_over_limit_boolean", sql`${table.overLimit} in (0, 1)`),
    index("idx_expenses_status_updated").on(table.status, table.updatedAt),
  ],
);

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").notNull().primaryKey(),
    expenseId: text("expense_id").notNull().references(() => expenses.id),
    eventType: text("event_type").notNull(),
    actorId: text("actor_id").notNull(),
    actorName: text("actor_name").notNull(),
    note: text("note").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    check("audit_events_id_not_null", sql`${table.id} is not null`),
    index("idx_audit_expense_created").on(table.expenseId, table.createdAt),
  ],
);

export const assistantAnswers = sqliteTable("assistant_answers", {
  id: text("id").notNull().primaryKey(),
  actorId: text("actor_id").notNull(),
  role: text("role").notNull(),
  question: text("question").notNull(),
  status: text("status").notNull(),
  model: text("model").notNull(),
  answerJson: text("answer_json"),
  generationJson: text("generation_json"),
  error: text("error"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  check("assistant_status_valid", sql`${table.status} in ('pending','completed','error')`),
  index("idx_assistant_actor_role_created").on(table.actorId, table.role, table.createdAt),
]);

export const policyLimits = sqliteTable("policy_limits", {
  category: text("category").notNull().primaryKey(),
  limitMinor: integer("limit_minor").notNull(),
  actorId: text("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [check("policy_limit_positive", sql`${table.limitMinor} > 0`)]);

export const policyEvents = sqliteTable("policy_events", {
  id: text("id").notNull().primaryKey(),
  category: text("category").notNull(),
  previousLimitMinor: integer("previous_limit_minor").notNull(),
  newLimitMinor: integer("new_limit_minor").notNull(),
  actorId: text("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  note: text("note").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_policy_events_created").on(table.createdAt)]);

export const approverCommands = sqliteTable("approver_commands", {
  id: text("id").notNull().primaryKey(),
  actorId: text("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  prompt: text("prompt").notNull(),
  planJson: text("plan_json").notNull(),
  matchIdsJson: text("match_ids_json").notNull(),
  status: text("status").notNull(),
  resultJson: text("result_json"),
  createdAt: text("created_at").notNull(),
  executedAt: text("executed_at"),
}, (table) => [
  check("approver_command_status_valid", sql`${table.status} in ('previewed','executed')`),
  index("idx_approver_commands_created").on(table.createdAt),
]);
