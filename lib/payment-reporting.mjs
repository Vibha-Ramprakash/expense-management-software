// Paid is terminal: its last update and the paid audit event share the same
// server timestamp. This records a finance action, not bank settlement.
export function paymentRecordedAt(expense) {
  if (expense.status !== "paid") return null;
  const value = expense.updated_at;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new Error("A paid claim has no valid payment-recording timestamp. Review its audit history before reporting it.");
  }
  return value;
}

export function paymentsRecordedInMonth(expenses, month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Choose a reporting month in YYYY-MM form.");
  return expenses.filter((expense) => paymentRecordedAt(expense)?.startsWith(`${month}-`));
}
