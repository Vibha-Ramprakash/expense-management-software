import { createExpense, getEffectiveBusinessSettings, listExpenses } from "@/lib/store";
import { validateExpenseDetails } from "@/lib/expense-validation.mjs";
import { discardUnlinkedReceipt, expenseFormValues, storeReceipt } from "@/lib/expense-upload";
import { demoAccessDenial } from "@/lib/demo-access.mjs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = demoAccessDenial(request, process.env.NODE_ENV === "development");
  if (denied) return denied;
  return Response.json({ expenses: await listExpenses() });
}

export async function POST(request: Request) {
  const denied = demoAccessDenial(request, process.env.NODE_ENV === "development");
  if (denied) return denied;
  let uploaded: Awaited<ReturnType<typeof storeReceipt>> = null;
  try {
    const form = await request.formData();
    const intent = String(form.get("intent") ?? "submit");
    if (!["draft", "submit"].includes(intent)) throw new Error("Choose save draft or submit for review.");
    const receipt = form.get("receipt");
    const file = receipt instanceof File && receipt.size > 0 ? receipt : null;
    const details = validateExpenseDetails(expenseFormValues(form), await getEffectiveBusinessSettings(), { complete: intent === "submit", hasReceipt: Boolean(file) });
    uploaded = await storeReceipt(file);
    const expense = await createExpense({ ...details, receiptKey: uploaded?.receiptKey ?? null, receiptName: uploaded?.receiptName ?? null }, intent === "draft" ? "draft" : "submitted");
    return Response.json({ expense }, { status: 201 });
  } catch (error) {
    if (uploaded) await discardUnlinkedReceipt(uploaded.receiptKey).catch(() => {});
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to submit this expense." },
      { status: 400 },
    );
  }
}
