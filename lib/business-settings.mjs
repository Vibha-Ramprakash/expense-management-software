import { assertMinorUnits, decimalToMinorUnits } from "./finance.mjs";
import { validateSchedule } from "./reimbursement.mjs";

export function parseCategories(value) {
  return value.split(";").map((item) => {
    const parts = item.split("=");
    if (parts.length !== 2 || !parts[0].trim()) throw new Error("Categories must look like Travel=1200;Meals=75");
    return { name: parts[0].trim(), limitMinor: decimalToMinorUnits(parts[1]) };
  });
}

export function parseApprovers(value) {
  return value.split(";").map((item, index) => {
    const match = item.trim().match(/^(.+?)\s*<([^<>\s]+@[^<>\s]+)>$/);
    if (!match) throw new Error("Approvers must look like Maya Chen <maya@example.com>");
    return { id: `approver-${index + 1}-${match[1].toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name: match[1].trim(), email: match[2].toLowerCase() };
  });
}

export function validateBusinessSettings(settings) {
  if (!settings.organizationName?.trim()) throw new Error("Organization name cannot be empty.");
  if (!/^#[0-9a-f]{6}$/i.test(settings.accentColor)) throw new Error("Accent color must be a six-digit hex color.");
  const currency = settings.defaultCurrency;
  if (!Intl.supportedValuesOf("currency").includes(currency)) throw new Error("Choose a recognized three-letter operating currency such as EUR, USD or CHF.");
  const precision = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions();
  if (precision.minimumFractionDigits !== 2 || precision.maximumFractionDigits !== 2) throw new Error(`${currency} does not use two decimal places. This version requires a two-decimal operating currency; do not relabel the amounts.`);
  if (!settings.categories?.length) throw new Error("Add at least one expense category.");
  const names = new Set();
  for (const category of settings.categories) {
    if (!category.name?.trim() || category.name.length > 120) throw new Error("Each category needs a name of at most 120 characters.");
    const name = category.name.trim().toLowerCase();
    if (names.has(name)) throw new Error("Category names must be unique.");
    names.add(name);
    assertMinorUnits(category.limitMinor);
  }
  if (!settings.approvers?.length) throw new Error("Add at least one approver.");
  const emails = new Set();
  const ids = new Set();
  for (const approver of settings.approvers) {
    if (!approver.id || !approver.name?.trim() || !/^[^<>\s]+@[^<>\s]+$/.test(approver.email)) throw new Error("Each approver needs a name and email address.");
    if (emails.has(approver.email.toLowerCase()) || ids.has(approver.id)) throw new Error("Approver email addresses and IDs must be unique.");
    emails.add(approver.email.toLowerCase());
    ids.add(approver.id);
  }
  return { ...settings, organizationName: settings.organizationName.trim(), accentColor: settings.accentColor.toUpperCase(), reimbursement: validateSchedule(settings.reimbursement) };
}
