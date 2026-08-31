const roles = ["employee", "approver", "finance"];
const activeStatuses = ["draft", "submitted", "rejected", "approved", "scheduled"];

export function buildAttentionDigest(expenses, { role, actorId, approverName, asOf = new Date().toISOString() }) {
  if (!roles.includes(role)) throw new Error("Choose a valid demo role.");
  if (!actorId || !Number.isFinite(Date.parse(asOf))) throw new Error("The attention context is invalid.");
  const today = asOf.slice(0, 10);
  const visible = expenses.filter((expense) => {
    if (!activeStatuses.includes(expense.status)) return false;
    if (role === "employee") return expense.submitter_id === actorId;
    if (role === "approver") return expense.status === "submitted" && expense.submitter_id !== actorId;
    return expense.status === "approved" || expense.status === "scheduled";
  });
  const items = visible.map((expense) => {
    const ageDays = Math.max(0, Math.floor((Date.parse(asOf) - Date.parse(expense.updated_at)) / 86400000)) || 0;
    const missing = [];
    if (!expense.receipt_key) missing.push("receipt");
    if (!expense.memo.trim()) missing.push("business purpose");
    let kind;
    let reason;
    let nextAction;
    let priority = 2;
    if (expense.status === "draft" || expense.status === "rejected") {
      kind = "missing";
      reason = expense.status === "rejected" ? "Returned for changes. Review the approver's note and reopen it." : missing.length ? `Still needs ${missing.join(" and ")}.` : "Details are ready; this draft has not been submitted.";
      nextAction = expense.status === "rejected" ? "Review requested changes" : "Complete draft";
      priority = 1;
    } else if (expense.status === "submitted") {
      kind = "approvals";
      reason = role === "approver" ? `Waiting for your decision for ${ageDays} day${ageDays === 1 ? "" : "s"}.` : `Waiting for ${approverName}'s review for ${ageDays} day${ageDays === 1 ? "" : "s"}.`;
      if (missing.length) reason += ` Missing ${missing.join(" and ")}; the claim may need to be returned.`;
      if (expense.over_limit) reason += " Above the category limit; an explicit decision is required.";
      nextAction = role === "approver" ? "Review claim" : "View approval status";
      priority = expense.over_limit || ageDays >= 3 ? 1 : 2;
    } else if (expense.status === "approved") {
      kind = "reimbursements";
      reason = "Approved, but finance has not scheduled reimbursement yet.";
      nextAction = role === "finance" ? "Schedule reimbursement" : "View reimbursement";
    } else {
      kind = "reimbursements";
      const date = expense.reimbursement_date;
      const overdue = Boolean(date && date < today);
      reason = overdue ? `Scheduled for ${date}; payment has not been recorded.` : date === today ? "Scheduled for today; payment has not been recorded." : `Scheduled for ${date ?? "an unrecorded date"}.`;
      reason += " Keel has not transferred money.";
      nextAction = role === "finance" ? "Review payment status" : "View reimbursement";
      priority = overdue || date === today ? 0 : 3;
    }
    return { expenseId: expense.id, merchant: expense.merchant, kind, reason, nextAction, priority, ageDays,
      missing, status: expense.status, amountMinor: expense.amount_minor, currency: expense.currency,
      href: `/#claim=${encodeURIComponent(expense.id)}` };
  }).sort((a, b) => a.priority - b.priority || b.ageDays - a.ageDays || a.expenseId.localeCompare(b.expenseId));
  const counts = { all: items.length, missing: 0, approvals: 0, reimbursements: 0 };
  for (const item of items) counts[item.kind]++;
  return { source: "canonical_records", mode: "rules", asOf, role, counts, items,
    limitation: "These quick answers are computed from saved claims without AI. Unrecorded purchases, actual bank transfers and external reminder delivery are not visible." };
}
