import { formatMoney, sumExpensesByCurrency } from "./finance.mjs";
import { paymentsRecordedInMonth } from "./payment-reporting.mjs";
import { describeSchedule } from "./reimbursement.mjs";

export const WORKSPACE_VIEWS = {
  employee: ["overview", "expenses", "attention", "policy"],
  approver: ["overview", "approvals", "attention", "history", "policy"],
  finance: ["overview", "reimbursements", "attention", "insights", "history"],
};

const viewLabels = {
  employee: { overview: "Overview", expenses: "My expenses", attention: "Attention", policy: "Expense policy" },
  approver: { overview: "Overview", approvals: "Approval queue", attention: "Attention", history: "Decision history", policy: "Expense policy" },
  finance: { overview: "Overview", reimbursements: "Reimbursements", attention: "Attention", insights: "Spend insights", history: "Payment history" },
};

const viewTitles = {
  employee: { overview: "Employee overview", expenses: "My expenses", attention: "What needs your attention?", policy: "Expense policy" },
  approver: { overview: "Approver overview", approvals: "Approval queue", attention: "What needs your attention?", history: "Decision history", policy: "Expense policy" },
  finance: { overview: "Finance overview", reimbursements: "Reimbursements", attention: "What needs your attention?", insights: "Spend insights", history: "Payment history" },
};

function validateContext(role, view, asOf) {
  if (!WORKSPACE_VIEWS[role]) throw new Error("Choose a valid demo role.");
  if (!WORKSPACE_VIEWS[role].includes(view)) throw new Error("Choose a valid workspace for this demo role.");
  if (!Number.isFinite(Date.parse(asOf))) throw new Error("The workspace date is invalid.");
}

function actorFor(role, business) {
  const approver = business.approvers[0] ?? { id: "person-maya", name: "Maya Chen" };
  if (role === "employee") return { id: "person-noah", name: "Noah Williams", label: "Employee" };
  if (role === "approver") return { id: approver.id, name: approver.name, label: "Approver" };
  return { id: "person-julian", name: "Julian Hart", label: "Finance" };
}

function totalLabel(expenses, defaultCurrency) {
  const totals = sumExpensesByCurrency(expenses);
  return totals.length
    ? totals.map(({ amountMinor, currency }) => formatMoney(amountMinor, currency)).join(" · ")
    : formatMoney(0n, defaultCurrency);
}

function ageDays(expense, asOf) {
  return Math.max(0, Math.floor((Date.parse(asOf) - Date.parse(expense.updated_at)) / 86_400_000)) || 0;
}

function nextAction(role, expense) {
  if (role === "employee") {
    if (expense.status === "draft") return "Complete draft";
    if (expense.status === "rejected") return "Correct and resubmit";
    if (expense.status === "submitted") return "Track approval";
    if (expense.status === "approved") return "Await scheduling";
    if (expense.status === "scheduled") return "Track reimbursement";
    return "View payment record";
  }
  if (role === "approver") return expense.status === "submitted" ? "Review decision" : "View decision";
  if (expense.status === "approved") return "Schedule reimbursement";
  if (expense.status === "scheduled") return "Record payment";
  return "View payment record";
}

function withOperationalFields(expenses, role, asOf) {
  return expenses.map((expense) => ({
    ...expense,
    age_days: ageDays(expense, asOf),
    next_action: nextAction(role, expense),
  }));
}

function sortOperational(expenses, role) {
  const priorities = role === "employee"
    ? { rejected: 0, draft: 1, submitted: 2, approved: 3, scheduled: 4, paid: 5 }
    : role === "approver" ? { submitted: 0, rejected: 1, approved: 2, scheduled: 3, paid: 4, draft: 5 }
      : { scheduled: 0, approved: 1, paid: 2, submitted: 3, rejected: 4, draft: 5 };
  return [...expenses].sort((a, b) => (priorities[a.status] ?? 9) - (priorities[b.status] ?? 9) || b.updated_at.localeCompare(a.updated_at));
}

function categoryTotals(expenses) {
  const sums = new Map();
  for (const expense of expenses) {
    const key = `${expense.category}\u0000${expense.currency}`;
    const current = sums.get(key) ?? { category: expense.category, currency: expense.currency, amountMinor: 0n, count: 0 };
    current.amountMinor += BigInt(expense.amount_minor);
    current.count += 1;
    sums.set(key, current);
  }
  return Array.from(sums.values())
    .sort((a, b) => a.category.localeCompare(b.category) || a.currency.localeCompare(b.currency))
    .map((item) => ({ category: item.category, currency: item.currency, count: item.count, total: formatMoney(item.amountMinor, item.currency) }));
}

function reimbursementCalendar(expenses, defaultCurrency) {
  const dates = new Map();
  for (const expense of expenses.filter((item) => item.status === "scheduled" && item.reimbursement_date)) {
    const key = `${expense.reimbursement_date}\u0000${expense.currency}`;
    const current = dates.get(key) ?? { date: expense.reimbursement_date, currency: expense.currency, amountMinor: 0n, count: 0 };
    current.amountMinor += BigInt(expense.amount_minor);
    current.count += 1;
    dates.set(key, current);
  }
  const result = Array.from(dates.values()).sort((a, b) => a.date.localeCompare(b.date) || a.currency.localeCompare(b.currency));
  return result.length
    ? result.map((item) => ({ date: item.date, currency: item.currency, count: item.count, total: formatMoney(item.amountMinor, item.currency) }))
    : [{ date: null, currency: defaultCurrency, count: 0, total: formatMoney(0n, defaultCurrency) }];
}

function visibleActivity(expenses, audits, role, actor) {
  const byId = new Map(expenses.map((expense) => [expense.id, expense]));
  return audits
    .filter((event) => {
      const expense = byId.get(event.expense_id);
      if (!expense) return false;
      if (role === "employee") return expense.submitter_id === actor.id;
      if (role === "approver") return expense.submitter_id !== actor.id && (event.actor_id === actor.id || event.event_type === "submitted");
      return ["approved", "scheduled", "paid"].includes(event.event_type) || event.actor_id === actor.id;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 12)
    .map((event) => ({ ...event, merchant: byId.get(event.expense_id)?.merchant ?? "Expense" }));
}

export function buildWorkspace(expenses, audits, { role, view, business, policyEvents = /** @type {any[]} */ ([]), asOf = new Date().toISOString() }) {
  validateContext(role, view, asOf);
  const actor = actorFor(role, business);
  const today = asOf.slice(0, 10);
  const month = today.slice(0, 7);
  const employeeExpenses = expenses.filter((expense) => expense.submitter_id === actorFor("employee", business).id);
  const pendingApprovals = expenses.filter((expense) => expense.status === "submitted" && expense.submitter_id !== actor.id);
  const financeExpenses = expenses.filter((expense) => ["approved", "scheduled", "paid"].includes(expense.status));
  const decisionIds = new Set(audits.filter((event) => event.actor_id === actor.id && ["approved", "rejected"].includes(event.event_type)).map((event) => event.expense_id));

  let scoped = role === "employee" ? employeeExpenses : role === "approver" ? pendingApprovals : financeExpenses;
  if (role === "approver" && view === "history") scoped = expenses.filter((expense) => decisionIds.has(expense.id));
  if (role === "approver" && view === "policy") scoped = pendingApprovals.filter((expense) => expense.over_limit);
  if (role === "finance" && view === "history") scoped = financeExpenses.filter((expense) => expense.status === "paid");
  if (role === "finance" && view === "reimbursements") scoped = financeExpenses.filter((expense) => expense.status !== "paid");
  if (role === "employee" && view === "overview") scoped = employeeExpenses.slice(0, 5);
  if (role === "approver" && view === "overview") scoped = pendingApprovals.slice(0, 5);
  if (role === "finance" && view === "overview") scoped = financeExpenses.filter((expense) => expense.status !== "paid").slice(0, 5);

  const overdue = financeExpenses.filter((expense) => expense.status === "scheduled" && expense.reimbursement_date && expense.reimbursement_date < today);
  const paidThisMonth = paymentsRecordedInMonth(expenses, month);
  const approverApprovalsThisMonth = audits.filter((event) => event.actor_id === actor.id && event.event_type === "approved" && event.created_at.startsWith(`${month}-`)).length;
  const schedule = describeSchedule(business.reimbursement);

  const metrics = role === "employee" ? [
    { key: "input", label: "Needs my input", value: String(employeeExpenses.filter((expense) => ["draft", "rejected"].includes(expense.status)).length), note: "Drafts and returned claims" },
    { key: "decision", label: "Awaiting decision", value: String(employeeExpenses.filter((expense) => expense.status === "submitted").length), note: `With ${business.approvers[0]?.name ?? "the approver"}` },
    { key: "scheduled", label: "Scheduled reimbursement", value: totalLabel(employeeExpenses.filter((expense) => expense.status === "scheduled"), business.defaultCurrency), note: `${schedule.heading} · ${schedule.note} · planned, not transferred` },
    { key: "paid", label: "Recorded paid this month", value: totalLabel(paidThisMonth.filter((expense) => expense.submitter_id === actor.id), business.defaultCurrency), note: "Finance record · UTC", emphasis: true },
  ] : role === "approver" ? [
    { key: "decision", label: "Awaiting my decision", value: String(pendingApprovals.length), note: "Assigned claims" },
    { key: "limit", label: "Above policy limit", value: String(pendingApprovals.filter((expense) => expense.over_limit).length), note: "Explicit decision required" },
    { key: "oldest", label: "Oldest waiting", value: `${Math.max(0, ...pendingApprovals.map((expense) => ageDays(expense, asOf)))}d`, note: "Since last submission" },
    { key: "approved", label: "Approved this month", value: String(approverApprovalsThisMonth), note: "Audit events · UTC", emphasis: true },
  ] : [
    { key: "ready", label: "Ready to schedule", value: totalLabel(financeExpenses.filter((expense) => expense.status === "approved"), business.defaultCurrency), note: "Approved claims" },
    { key: "scheduled", label: "Scheduled to record", value: totalLabel(financeExpenses.filter((expense) => expense.status === "scheduled"), business.defaultCurrency), note: schedule.heading },
    { key: "overdue", label: "Overdue", value: String(overdue.length), note: "Payment not recorded" },
    { key: "paid", label: "Recorded paid this month", value: totalLabel(paidThisMonth, business.defaultCurrency), note: "Finance record · UTC", emphasis: true },
  ];

  const navigation = WORKSPACE_VIEWS[role].map((id) => ({
    id,
    label: viewLabels[role][id],
    count: role === "employee" && id === "expenses" ? employeeExpenses.length
      : role === "approver" && id === "approvals" ? pendingApprovals.length
        : role === "finance" && id === "reimbursements" ? financeExpenses.filter((expense) => expense.status !== "paid").length
          : undefined,
  }));

  const primaryExpense = role === "approver" ? pendingApprovals[0]
    : role === "finance" ? [...overdue, ...financeExpenses.filter((expense) => expense.status === "approved" || (expense.status === "scheduled" && !overdue.includes(expense)))][0]
      : null;

  return {
    source: "canonical_records",
    role,
    view,
    actor,
    title: viewTitles[role][view],
    navigation,
    metrics,
    expenses: withOperationalFields(sortOperational(scoped, role), role, asOf),
    duplicateCandidates: role === "employee" ? employeeExpenses : [],
    policy: {
      currency: business.defaultCurrency,
      categories: business.categories.map((category) => ({ name:category.name,limitMinor:category.limitMinor,source:category.source ?? "configuration",updatedAt:category.updatedAt ?? null })),
      events: role === "approver" ? policyEvents.slice(0,10) : [],
    },
    recentActivity: visibleActivity(expenses, audits, role, actor),
    insights: {
      categories: categoryTotals(financeExpenses),
      calendar: reimbursementCalendar(financeExpenses, business.defaultCurrency),
      policyExceptions: pendingApprovals.filter((expense) => expense.over_limit).length,
      reimbursementTimeline: withOperationalFields(employeeExpenses.filter((expense) => ["approved", "scheduled", "paid"].includes(expense.status)), role, asOf),
      schedule,
    },
    primaryAction: role === "employee" ? { kind: "add", label: "Add expense" }
      : primaryExpense ? { kind: "open", label: role === "approver" ? "Review next" : primaryExpense.status === "scheduled" ? "Record payment" : "Schedule next", expenseId: primaryExpense.id }
        : null,
    asOf,
  };
}
