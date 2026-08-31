import { csvEscape, formatMinorUnits } from "@/lib/finance.mjs";
import { listExpenses } from "@/lib/store";
import { demoAccessDenial } from "@/lib/demo-access.mjs";
import { paymentRecordedAt } from "@/lib/payment-reporting.mjs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = demoAccessDenial(request, process.env.NODE_ENV === "development");
  if (denied) return denied;
  const expenses = await listExpenses();
  const header = [
    "expense_id",
    "merchant",
    "expense_date",
    "amount",
    "currency",
    "category",
    "business_purpose",
    "submitter",
    "status",
    "over_limit",
    "approver",
    "reimbursement_date",
    "payment_recorded_at",
  ];
  const rows = expenses.map((expense) => [
    expense.id,
    expense.merchant,
    expense.expense_date,
    formatMinorUnits(expense.amount_minor),
    expense.currency,
    expense.category,
    expense.memo,
    expense.submitter_name,
    expense.status,
    expense.over_limit ? "yes" : "no",
    expense.approver_name ?? "",
    expense.reimbursement_date ?? "",
    paymentRecordedAt(expense) ?? "",
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="keel-expenses-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
