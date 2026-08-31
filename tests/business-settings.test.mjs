import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseCategories, validateBusinessSettings } from "../lib/business-settings.mjs";

const current = JSON.parse(await readFile(new URL("../config/business.json", import.meta.url), "utf8"));
const settings = () => ({ ...structuredClone(current), defaultCurrency: "EUR", categories: [{ name: "Meals", limitMinor: 7500 }], reimbursement: { frequency: "weekly", weekday: "Friday", leadDays: 2 } });

test("business limits use exact cents and reject silent rounding and duplicate categories", () => {
  assert.deepEqual(parseCategories("Meals=0.29;Equipment=90071992547409.91"), [{ name: "Meals", limitMinor: 29 }, { name: "Equipment", limitMinor: Number.MAX_SAFE_INTEGER }]);
  for (const value of ["Meals=1.005", "Meals=1e3", "Meals=90071992547409.92", "Meals=0", "Meals=12=30", "=12"]) assert.throws(() => parseCategories(value));
  const duplicate = settings();
  duplicate.categories = parseCategories("Meals=75;meals=90");
  assert.throws(() => validateBusinessSettings(duplicate), /unique/);
  assert.throws(() => validateBusinessSettings({ ...settings(), categories: [] }), /at least one/);
});

test("unsupported currency precision and invalid approvers cannot become business settings", () => {
  for (const defaultCurrency of ["EUR", "USD", "CHF", "GBP", "INR"]) assert.equal(validateBusinessSettings({ ...settings(), defaultCurrency }).defaultCurrency, defaultCurrency);
  for (const defaultCurrency of ["JPY", "BHD", "KWD"]) assert.throws(() => validateBusinessSettings({ ...settings(), defaultCurrency }), /two decimal/);
  assert.throws(() => validateBusinessSettings({ ...settings(), defaultCurrency: "ZZZ" }), /recognized/);
  assert.throws(() => validateBusinessSettings({ ...settings(), approvers: [] }), /at least one/);
  const approvers = [current.approvers[0], { ...current.approvers[0], id: "duplicate-email" }];
  assert.throws(() => validateBusinessSettings({ ...settings(), approvers }), /unique/);
});

test("the real configurator preserves the original file after invalid settings and saves supported cadences", async () => {
  const root = await mkdtemp(join(tmpdir(), "keel-settings-test-"));
  try {
    for (const folder of ["scripts", "lib", "config"]) await mkdir(join(root, folder));
    for (const file of ["scripts/configure.mjs", "lib/business-settings.mjs", "lib/finance.mjs", "lib/reimbursement.mjs", "config/business.json"]) await copyFile(new URL(`../${file}`, import.meta.url), join(root, file));
    const original = await readFile(join(root, "config/business.json"), "utf8");
    const run = (...args) => spawnSync(process.execPath, [join(root, "scripts/configure.mjs"), ...args], { encoding: "utf8", timeout: 10000, windowsHide: true });
    for (const args of [
      ["--frequency", "daily"], ["--currency", "JPY"], ["--categories", "Meals=1.005"],
      ["--frequency", "weekly", "--weekday", "Frday"], ["--frequency", "fortnightly", "--anchor-date", "2026-02-30"],
      ["--frequency", "monthly", "--day-of-month", "32"], ["--frequency", "weekly", "--day-of-month", "1"],
      ["--organization"], ["--organization", "One", "--organization", "Two"], ["--unknown", "value"], ["--lead-days", ""],
    ]) {
      const result = run(...args);
      assert.equal(result.status, 1, `${args}: ${result.stderr}`);
      assert.match(result.stderr, /Setup not saved/);
      assert.equal(await readFile(join(root, "config/business.json"), "utf8"), original);
    }
    let result = run("--frequency", "monthly", "--day-of-month", "31", "--lead-days", "2");
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(await readFile(join(root, "config/business.json"), "utf8")).reimbursement, { frequency: "monthly", leadDays: 2, dayOfMonth: 31 });
    result = run("--frequency", "fortnightly", "--weekday", "Thursday", "--anchor-date", "2026-08-27");
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(await readFile(join(root, "config/business.json"), "utf8")).reimbursement, { frequency: "fortnightly", weekday: "Thursday", leadDays: 2, anchorDate: "2026-08-27" });
    result = run("--frequency", "weekly", "--weekday", "Friday");
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(await readFile(join(root, "config/business.json"), "utf8")).reimbursement, { frequency: "weekly", weekday: "Friday", leadDays: 2 });
  } finally { await rm(root, { recursive: true, force: true }); }
});
