import { decimalToMinorUnits, formatMinorUnits } from "./finance.mjs";

export function validateExpenseDetails(values, business, { complete = true, hasReceipt = false } = {}) {
  const text = (key, max) => {
    const value = String(values[key] ?? "").trim();
    if (value.length > max) throw new Error(`${key} is too long.`);
    return value;
  };
  const merchant = text("merchant", 160);
  const expenseDate = text("expenseDate", 10);
  const category = text("category", 120);
  const memo = text("memo", 2000);
  const amount = text("amount", 20);
  if (!merchant) throw new Error("Add the merchant before saving this claim.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate) || !Number.isFinite(Date.parse(`${expenseDate}T00:00:00Z`)) || new Date(`${expenseDate}T00:00:00Z`).toISOString().slice(0, 10) !== expenseDate) {
    throw new Error("Choose a valid expense date.");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) throw new Error("Enter the amount without grouping separators, using a decimal point if needed.");
  const amountMinor = decimalToMinorUnits(amount);
  const policy = business.categories.find((item) => item.name === category);
  if (!policy) throw new Error("Choose one of the configured expense categories.");
  if (values.currency && values.currency !== business.defaultCurrency) throw new Error("This workspace does not support converting that receipt currency.");
  if (complete && !memo) throw new Error("Add a business purpose before submitting.");
  if (complete && !hasReceipt) throw new Error("Attach the receipt before submitting. You can save a draft while you find it.");
  return { merchant, expenseDate, amountMinor, currency: business.defaultCurrency, category, memo, overLimit: amountMinor > policy.limitMinor };
}

export function assertReadyForSubmission(expense, business) {
  return validateExpenseDetails({
    merchant: expense.merchant, expenseDate: expense.expense_date,
    amount: formatMinorUnits(expense.amount_minor),
    category: expense.category, memo: expense.memo, currency: expense.currency,
  }, business, { hasReceipt: Boolean(expense.receipt_key) });
}

export function nextRevisionTime(previous, currentTime = Date.now()) {
  return new Date(Math.max(currentTime, Date.parse(previous) + 1)).toISOString();
}
