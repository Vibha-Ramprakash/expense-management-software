import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { parseApprovers, parseCategories, validateBusinessSettings } from "../lib/business-settings.mjs";
import { formatMinorUnits } from "../lib/finance.mjs";

const configPath = resolve(import.meta.dirname, "..", "config", "business.json");
const supported = new Set(["organization", "accent", "currency", "categories", "approvers", "frequency", "weekday", "lead-days", "anchor-date", "day-of-month"]);

function wholeNumber(value) {
  if (!/^\d+$/.test(String(value).trim())) throw new Error("Schedule days must be whole numbers, not blank values or fractions.");
  return Number(value);
}

async function configure() {
  const current = JSON.parse(await readFile(configPath, "utf8"));
  const args = process.argv.slice(2);
  const options = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index].slice(2);
    if (!args[index].startsWith("--") || !supported.has(name)) throw new Error("Unknown setup option: " + args[index]);
    if (options.has(name)) throw new Error("Setup option supplied twice: " + name);
    if (args[index + 1] === undefined || args[index + 1].startsWith("--")) throw new Error("Add a value for " + name + ".");
    options.set(name, args[index + 1]);
  }
  let settings;
  if (args.length) {
    const schedule = current.reimbursement;
    const frequency = (options.get("frequency") ?? schedule.frequency).trim().toLowerCase();
    if (frequency === "monthly" && (options.has("weekday") || options.has("anchor-date"))) throw new Error("Monthly reimbursement uses day-of-month, not weekday or anchor-date.");
    if (frequency !== "monthly" && options.has("day-of-month")) throw new Error("day-of-month is only used for monthly reimbursement.");
    if (frequency !== "fortnightly" && options.has("anchor-date")) throw new Error("anchor-date is only used for fortnightly reimbursement.");
    settings = {
      ...current,
      organizationName: options.get("organization") ?? current.organizationName,
      accentColor: options.get("accent") ?? current.accentColor,
      defaultCurrency: (options.get("currency") ?? current.defaultCurrency).trim().toUpperCase(),
      categories: options.has("categories") ? parseCategories(options.get("categories")) : current.categories,
      approvers: options.has("approvers") ? parseApprovers(options.get("approvers")) : current.approvers,
      reimbursement: { frequency,
        leadDays: wholeNumber(options.get("lead-days") ?? schedule.leadDays),
        weekday: options.get("weekday") ?? schedule.weekday,
        anchorDate: options.get("anchor-date") ?? schedule.anchorDate,
        dayOfMonth: frequency === "monthly" ? wholeNumber(options.get("day-of-month") ?? schedule.dayOfMonth) : undefined,
      },
    };
  } else {
    const rl = createInterface({ input, output });
    console.log("\nKeel business setup\nAnswer with business details only. Press Enter to keep the current value.\n");
    const ask = async (question, fallback = "") => (await rl.question(question + (fallback !== "" ? " [" + fallback + "]" : "") + ": ")).trim() || String(fallback);
    try {
      settings = { ...current,
        organizationName: await ask("Organization name", current.organizationName),
        accentColor: await ask("Brand accent color (hex)", current.accentColor),
        defaultCurrency: (await ask("Operating currency (two-decimal, e.g. EUR, USD, CHF)", current.defaultCurrency)).toUpperCase(),
        categories: parseCategories(await ask("Categories and per-expense limits (Name=amount;Name=amount)", current.categories.map((category) => category.name + "=" + formatMinorUnits(category.limitMinor)).join(";"))),
        approvers: parseApprovers(await ask("Approvers (Name <email>;Name <email>)", current.approvers.map((approver) => approver.name + " <" + approver.email + ">").join(";"))),
      };
      const frequency = (await ask("How often should reimbursements run? weekly, fortnightly (every two weeks), or monthly", current.reimbursement.frequency)).toLowerCase();
      settings.reimbursement = { frequency, leadDays: wholeNumber(await ask("Finance lead time in calendar days", current.reimbursement.leadDays)) };
      if (frequency === "monthly") {
        settings.reimbursement.dayOfMonth = wholeNumber(await ask("Which day of the month (1–31)? Short months use their last day", current.reimbursement.dayOfMonth ?? ""));
      } else {
        settings.reimbursement.weekday = await ask("Reimbursement weekday", current.reimbursement.weekday ?? "");
        if (frequency === "fortnightly") settings.reimbursement.anchorDate = await ask("First date in the every-two-weeks schedule (YYYY-MM-DD)", current.reimbursement.anchorDate ?? "");
      }
    } finally { rl.close(); }
  }
  const next = validateBusinessSettings(settings);
  await writeFile(configPath, JSON.stringify(next, null, 2) + "\n");
  console.log("\nSaved " + next.organizationName + ". Run npm run check, then npm run dev to review the customized demo.");
}

try { await configure(); }
catch (error) { console.error("Setup not saved: " + error.message); process.exitCode = 1; }
