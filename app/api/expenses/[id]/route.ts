import { getEffectiveBusinessSettings, getExpense, listAuditEvents, updateDraft } from "@/lib/store";
import { validateExpenseDetails } from "@/lib/expense-validation.mjs";
import { discardUnlinkedReceipt, expenseFormValues, storeReceipt } from "@/lib/expense-upload";
import { demoAccessDenial } from "@/lib/demo-access.mjs";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = demoAccessDenial(request, process.env.NODE_ENV === "development");
  if (denied) return denied;
  const { id } = await context.params;
  const expense = await getExpense(id);
  if (!expense) return Response.json({ error: "Expense not found." }, { status: 404 });
  return Response.json({ expense, audit: await listAuditEvents(id) });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = demoAccessDenial(request, process.env.NODE_ENV === "development");
  if (denied) return denied;
  let uploaded: Awaited<ReturnType<typeof storeReceipt>> = null;
  try {
    const { id } = await context.params;
    const existing = await getExpense(id);
    if (!existing) return Response.json({ error: "Expense not found." }, { status: 404 });
    if (existing.status !== "draft" || existing.submitter_id !== "person-noah") throw new Error("Only your own drafts can be edited. A returned claim must be reopened first.");
    const form = await request.formData();
    if (form.get("expectedUpdatedAt") !== existing.updated_at) throw new Error("This draft changed in another window. Reopen it and try again.");
    const intent = String(form.get("intent") ?? "draft");
    if (!["draft", "submit"].includes(intent)) throw new Error("Choose save draft or submit for review.");
    const receipt = form.get("receipt");
    const file = receipt instanceof File && receipt.size > 0 ? receipt : null;
    const details = validateExpenseDetails(expenseFormValues(form), await getEffectiveBusinessSettings(), { complete: intent === "submit", hasReceipt: Boolean(file || existing.receipt_key) });
    uploaded = await storeReceipt(file);
    const expense = await updateDraft(existing, { ...details,
      receiptKey: uploaded?.receiptKey ?? existing.receipt_key,
      receiptName: uploaded?.receiptName ?? existing.receipt_name,
    }, intent === "draft" ? "draft" : "submitted");
    return Response.json({ expense });
  } catch (error) {
    if (uploaded) await discardUnlinkedReceipt(uploaded.receiptKey).catch(() => {});
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save this draft." }, { status: 400 });
  }
}
