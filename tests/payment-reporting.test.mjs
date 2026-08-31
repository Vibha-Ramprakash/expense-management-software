import assert from "node:assert/strict";
import test from "node:test";
import { paymentRecordedAt, paymentsRecordedInMonth } from "../lib/payment-reporting.mjs";
import { formatMinorTotal, sumExpensesByCurrency } from "../lib/finance.mjs";

const paid = { id: "paid", status: "paid", updated_at: "2026-08-27T10:30:00.123Z", reimbursement_date: "2026-09-04", expense_date: "2026-07-01", amount_minor: 8640, currency: "EUR" };

test("payment reporting uses the finance recording time, not planned or purchase dates", () => {
  const late = { ...paid, id: "late", reimbursement_date: "2026-07-31" };
  const prior = { ...paid, id: "prior", updated_at: "2026-07-31T23:59:59.999Z", reimbursement_date: "2026-08-01" };
  const scheduled = { ...paid, id: "scheduled", status: "scheduled", reimbursement_date: "2026-08-27" };
  assert.equal(paymentRecordedAt(paid), paid.updated_at);
  assert.equal(paymentRecordedAt(scheduled), null);
  assert.deepEqual(paymentsRecordedInMonth([paid, late, prior, scheduled], "2026-08").map((row) => row.id), ["paid", "late"]);
  assert.deepEqual(paymentsRecordedInMonth([paid, prior], "2026-09"), []);
});

test("recorded payment months have exact UTC boundaries and preserve currency-separated totals", () => {
  const rows = [
    { ...paid, updated_at: "2026-12-31T23:59:59.999Z" },
    { ...paid, updated_at: "2027-01-01T00:00:00.000Z", amount_minor: Number.MAX_SAFE_INTEGER },
    { ...paid, updated_at: "2027-01-31T23:59:59.999Z", amount_minor: Number.MAX_SAFE_INTEGER },
    { ...paid, updated_at: "2027-01-15T12:00:00.000Z", currency: "USD", amount_minor: 1 },
    { ...paid, updated_at: "2027-02-01T00:00:00.000Z" },
  ];
  const totals = sumExpensesByCurrency(paymentsRecordedInMonth(rows, "2027-01"));
  assert.deepEqual(totals.map(({ currency, amountMinor }) => ({ currency, amount: formatMinorTotal(amountMinor) })), [{ currency: "EUR", amount: "180143985094819.82" }, { currency: "USD", amount: "0.01" }]);
});

test("invalid paid timestamps or reporting months cannot silently produce a payment total", () => {
  for (const updated_at of [undefined, "", "invalid", "2026-02-30T00:00:00.000Z", "2026-08-27"]) assert.throws(() => paymentRecordedAt({ ...paid, updated_at }), /audit history/);
  for (const month of ["2026-00", "2026-13", "2026-1", "August", "2026-08-01"]) assert.throws(() => paymentsRecordedInMonth([paid], month), /reporting month/);
  assert.deepEqual(paymentsRecordedInMonth([], "2026-08"), []);
});
