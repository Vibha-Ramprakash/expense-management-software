import assert from "node:assert/strict";
import test from "node:test";
import {
  assertMinorUnits,
  assertConfiguredApprover,
  assertTransition,
  canTransition,
  csvEscape,
  decimalToMinorUnits,
  formatMinorUnits,
  formatMinorTotal,
  formatMoney,
  sumExpensesByCurrency,
} from "../lib/finance.mjs";

test("converts decimal input to integer minor units without floating-point math", () => {
  assert.equal(decimalToMinorUnits("19.90"), 1990);
  assert.equal(decimalToMinorUnits("1200"), 120000);
  assert.throws(() => decimalToMinorUnits("4.999"), /two decimal places/);
  assert.throws(() => assertMinorUnits(0), /positive integer/);
  assert.equal(formatMinorUnits(1990), "19.90");
});

test("allows only the documented workflow order", () => {
  assert.equal(canTransition("submitted", "approved"), true);
  assert.equal(canTransition("submitted", "paid"), false);
  assert.equal(canTransition("paid", "draft"), false);
});

test("prevents self-approval and role bypasses", () => {
  assert.throws(
    () => assertTransition({ from: "submitted", to: "approved", actorRole: "approver", submitterId: "same", actorId: "same" }),
    /cannot approve/i,
  );
  assert.throws(
    () => assertTransition({ from: "approved", to: "scheduled", actorRole: "employee", submitterId: "a", actorId: "b" }),
    /Only finance/,
  );
  assert.equal(
    assertTransition({ from: "submitted", to: "approved", actorRole: "approver", submitterId: "a", actorId: "b" }),
    true,
  );
});

test("accepts only an approver from the active business configuration", () => {
  const approvers = [{ id: "approver-rina", name: "Rina Shah" }];
  assert.equal(
    assertConfiguredApprover({ actorId: "approver-rina", actorName: "Rina Shah", approvers }),
    true,
  );
  assert.throws(
    () => assertConfiguredApprover({ actorId: "person-maya", actorName: "Maya Chen", approvers }),
    /not a configured approver/,
  );
});

test("escapes ledger CSV values safely", () => {
  assert.equal(csvEscape('Meals, "team"'), '"Meals, ""team"""');
  assert.equal(csvEscape("Travel"), "Travel");
});

test("round-trips every cent at the exact storage boundary without floating-point rounding", () => {
  for (let offset = 0; offset < 300; offset++) {
    const minor = Number.MAX_SAFE_INTEGER - offset;
    const integer = BigInt(minor);
    const expected = `${integer / 100n}.${String(integer % 100n).padStart(2, "0")}`;
    assert.equal(formatMinorUnits(minor), expected);
    assert.equal(decimalToMinorUnits(expected), minor);
  }
  assert.equal(formatMoney(Number.MAX_SAFE_INTEGER, "EUR"), "€90,071,992,547,409.91");
  assert.equal(formatMoney(0, "EUR"), "€0.00");
  assert.equal(formatMoney(1, "CHF"), "CHF 0.01");
  assert.throws(() => decimalToMinorUnits("90071992547409.92"), /supported exact range/);
  for (const invalid of ["1,23", "1,000", "1e3", "0.001", "-1.00", "Infinity"]) assert.throws(() => decimalToMinorUnits(invalid));
});

test("aggregate displays remain exact beyond safe storage integers and do not combine currencies", () => {
  const totals = sumExpensesByCurrency([
    { currency: "USD", amount_minor: 1 },
    { currency: "EUR", amount_minor: Number.MAX_SAFE_INTEGER },
    { currency: "EUR", amount_minor: Number.MAX_SAFE_INTEGER },
  ]);
  assert.deepEqual(totals, [{ currency: "EUR", amountMinor: 18014398509481982n }, { currency: "USD", amountMinor: 1n }]);
  assert.equal(formatMinorTotal(totals[0].amountMinor), "180143985094819.82");
  assert.equal(formatMoney(totals[0].amountMinor, "EUR"), "€180,143,985,094,819.82");
  assert.throws(() => formatMinorTotal(Number.MAX_SAFE_INTEGER + 1));
  assert.throws(() => formatMinorTotal(-1n));
  assert.throws(() => sumExpensesByCurrency([{ currency: "EUR", amount_minor: 0 }]));
});

test("CSV neutralizes spreadsheet expressions without changing ordinary text or amounts", () => {
  for (const value of ["=1+2", "+1", "-1", "@SUM(A1)", "  =1+2", "\u0000=1+2", "\t=1+2", "\ttext"]) assert.equal(csvEscape(value), `'${value}`);
  assert.equal(csvEscape('=HYPERLINK("https://example.invalid","label")'), '"\'=HYPERLINK(""https://example.invalid"",""label"")"');
  assert.equal(csvEscape("\r=1+2"), '"\'\r=1+2"');
  assert.equal(csvEscape("\n=1+2"), '"\'\n=1+2"');
  assert.equal(csvEscape("90.01"), "90.01");
  assert.equal(csvEscape("Name + Co"), "Name + Co");
});
