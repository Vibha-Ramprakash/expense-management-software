import assert from "node:assert/strict";
import test from "node:test";
import { nextReimbursementDate, validateSchedule, describeSchedule } from "../lib/reimbursement.mjs";

const at = (date) => new Date(`${date}T22:59:00Z`);
test("weekly schedules honor UTC calendar lead days, including year boundaries and eligible same-day runs", () => {
  const policy = { frequency: "weekly", weekday: "Friday", leadDays: 2 };
  assert.equal(nextReimbursementDate(policy, at("2026-08-26")), "2026-08-28");
  assert.equal(nextReimbursementDate(policy, at("2026-08-27")), "2026-09-04");
  assert.equal(nextReimbursementDate(policy, at("2026-12-30")), "2027-01-01");
  assert.equal(nextReimbursementDate({ ...policy, leadDays: 0 }, at("2026-08-28")), "2026-08-28");
  assert.equal(nextReimbursementDate(policy, new Date("2026-08-27T01:00:00+02:00")), "2026-08-28");
});

test("fortnightly schedules keep the first-date anchor and never degrade into weekly runs", () => {
  const policy = { frequency: "fortnightly", weekday: "Thursday", anchorDate: "2026-08-27", leadDays: 3 };
  assert.equal(nextReimbursementDate(policy, at("2026-08-24")), "2026-08-27");
  assert.equal(nextReimbursementDate(policy, at("2026-08-27")), "2026-09-10");
  assert.equal(nextReimbursementDate(policy, at("2026-09-08")), "2026-09-24");
  assert.equal(nextReimbursementDate(policy, at("2026-01-01")), "2026-08-27");
  assert.match(describeSchedule(policy).note, /2026-08-27/);
});

test("monthly schedules clamp short months without permanently shifting later runs", () => {
  const policy = { frequency: "monthly", dayOfMonth: 31, leadDays: 0 };
  assert.equal(nextReimbursementDate(policy, at("2026-02-01")), "2026-02-28");
  assert.equal(nextReimbursementDate(policy, at("2028-02-01")), "2028-02-29");
  assert.equal(nextReimbursementDate(policy, at("2026-03-01")), "2026-03-31");
  assert.equal(nextReimbursementDate({ ...policy, leadDays: 1 }, at("2026-02-28")), "2026-03-31");
  assert.equal(nextReimbursementDate({ ...policy, leadDays: 2 }, at("2026-12-31")), "2027-01-31");
  assert.equal(nextReimbursementDate({ ...policy, dayOfMonth: 15 }, at("2026-08-16")), "2026-09-15");
  assert.deepEqual(describeSchedule(policy), { heading: "Day 31", badge: "31", note: "monthly · month-end if shorter" });
});

test("invalid schedule choices cannot silently become another cadence or weekday", () => {
  const policy = { frequency: "weekly", weekday: "Friday", leadDays: 2 };
  assert.throws(() => validateSchedule({ ...policy, frequency: "daily" }), /Choose weekly/);
  assert.throws(() => validateSchedule({ ...policy, weekday: "Frday" }), /weekday/);
  for (const leadDays of [-1, 31, 1.5, NaN]) assert.throws(() => validateSchedule({ ...policy, leadDays }), /Lead time/);
  for (const dayOfMonth of [0, 32, 3.5, undefined]) assert.throws(() => validateSchedule({ frequency: "monthly", leadDays: 2, dayOfMonth }), /monthly reimbursement day/);
  assert.throws(() => validateSchedule({ ...policy, frequency: "fortnightly" }), /calendar date/);
  assert.throws(() => validateSchedule({ ...policy, frequency: "fortnightly", anchorDate: "2026-02-30" }), /calendar date/);
  assert.throws(() => validateSchedule({ ...policy, frequency: "fortnightly", anchorDate: "2026-08-27" }), /selected weekday/);
  assert.equal(validateSchedule({ ...policy, weekday: "friday" }).weekday, "Friday");
  assert.throws(() => nextReimbursementDate(policy, new Date("invalid")), /invalid/);
});
