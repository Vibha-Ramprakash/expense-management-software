export const EXPENSE_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "scheduled",
  "paid",
];

const transitions = {
  draft: ["submitted"],
  submitted: ["approved", "rejected"],
  approved: ["scheduled"],
  rejected: ["draft"],
  scheduled: ["paid"],
  paid: [],
};

export function assertMinorUnits(value) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Amount must be a positive integer in minor currency units.");
  }
  return value;
}

export function decimalToMinorUnits(value) {
  const normalized = String(value).trim();
  if (normalized.length > 20 || !/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Enter a positive amount with no more than two decimal places.");
  }
  const [whole, decimals = ""] = normalized.split(".");
  const minor = BigInt(whole) * 100n + BigInt(decimals.padEnd(2, "0"));
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Amount exceeds the supported exact range.");
  return assertMinorUnits(Number(minor));
}

export function canTransition(from, to) {
  return transitions[from]?.includes(to) ?? false;
}

export function assertTransition({ from, to, actorRole, submitterId, actorId }) {
  if (!canTransition(from, to)) {
    throw new Error(`Expense cannot move from ${from} to ${to}.`);
  }

  if ((to === "approved" || to === "rejected") && actorRole !== "approver") {
    throw new Error("Only an approver can approve or reject an expense.");
  }

  if ((to === "approved" || to === "rejected") && submitterId === actorId) {
    throw new Error("Submitters cannot approve or reject their own expenses.");
  }

  if ((to === "scheduled" || to === "paid") && actorRole !== "finance") {
    throw new Error("Only finance can schedule or mark a reimbursement as paid.");
  }

  if ((to === "submitted" || to === "draft") && (actorRole !== "employee" || actorId !== submitterId)) {
    throw new Error("Only the submitting employee can submit or reopen this expense.");
  }

  return true;
}

export function assertConfiguredApprover({ actorId, actorName, approvers }) {
  const configured = approvers.some(
    (approver) => approver.id === actorId && approver.name === actorName,
  );
  if (!configured) throw new Error("This person is not a configured approver.");
  return true;
}

export function csvEscape(value) {
  const original = String(value ?? "");
  // Quoting alone does not stop spreadsheet formula execution. Prefix only
  // potentially executable text; canonical data remains unchanged in storage.
  // eslint-disable-next-line no-control-regex -- Deliberately recognize leading control characters for spreadsheet safety.
  const text = /^[\s\u0000-\u001f\u007f]*[=+\-@]/u.test(original) || /^[\t\r\n]/.test(original)
    ? `'${original}` : original;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function formatMinorUnits(amountMinor) {
  assertMinorUnits(amountMinor);
  return formatMinorTotal(BigInt(amountMinor));
}

export function formatMinorTotal(amountMinor) {
  if (typeof amountMinor !== "bigint" && (!Number.isSafeInteger(amountMinor) || amountMinor < 0)) throw new Error("Total must contain exact nonnegative minor units.");
  const value = BigInt(amountMinor);
  if (value < 0n) throw new Error("Total cannot be negative.");
  return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
}

export function formatMoney(amountMinor, currency) {
  const decimal = formatMinorTotal(amountMinor);
  const [whole, fraction] = decimal.split(".");
  // Format the integer part as BigInt, then insert the exact cents. Never
  // divide a large Number before passing it to Intl.
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .formatToParts(BigInt(whole)).map((part) => part.type === "fraction" ? fraction : part.value).join("");
}

export function sumExpensesByCurrency(expenses) {
  const sums = new Map();
  for (const expense of expenses) {
    assertMinorUnits(expense.amount_minor);
    sums.set(expense.currency, (sums.get(expense.currency) ?? 0n) + BigInt(expense.amount_minor));
  }
  return Array.from(sums, ([currency, amountMinor]) => ({ currency, amountMinor })).sort((a, b) => a.currency.localeCompare(b.currency));
}
