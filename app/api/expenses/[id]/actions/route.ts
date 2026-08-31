import business from "@/config/business.json";
import { assertConfiguredApprover, assertTransition } from "@/lib/finance.mjs";
import { assertReadyForSubmission } from "@/lib/expense-validation.mjs";
import { nextReimbursementDate } from "@/lib/reimbursement.mjs";
import { demoAccessDenial } from "@/lib/demo-access.mjs";
import { getEffectiveBusinessSettings, getExpense, transitionExpense, type ExpenseStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

const actionTargets: Record<string, ExpenseStatus> = {
  submit: "submitted",
  reopen: "draft",
  approve: "approved",
  reject: "rejected",
  schedule: "scheduled",
  pay: "paid",
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = demoAccessDenial(request, process.env.NODE_ENV === "development");
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const expense = await getExpense(id);
    if (!expense) return Response.json({ error: "Expense not found." }, { status: 404 });

    const body = (await request.json()) as {
      action?: string;
      expectedUpdatedAt?: string;
      actorRole?: string;
      actorId?: string;
      actorName?: string;
      note?: string;
    };
    const to = actionTargets[body.action ?? ""];
    if (!to) throw new Error("Unknown workflow action.");
    if (body.expectedUpdatedAt !== expense.updated_at) throw new Error("This claim changed. Reopen it and review the latest details before acting.");
    if (!body.actorId || !body.actorName || !body.actorRole) throw new Error("Choose a demo role first.");
    if (body.actorRole === "approver") {
      assertConfiguredApprover({
        actorId: body.actorId,
        actorName: body.actorName,
        approvers: business.approvers,
      });
    }

    if (body.actorRole === "employee" && (body.actorId !== "person-noah" || body.actorName !== "Noah Williams")) throw new Error("Choose the configured employee demo identity.");
    if (body.actorRole === "finance" && (body.actorId !== "person-julian" || body.actorName !== "Julian Hart")) throw new Error("Choose the configured finance demo identity.");

    assertTransition({
      from: expense.status,
      to,
      actorRole: body.actorRole,
      submitterId: expense.submitter_id,
      actorId: body.actorId,
    });

    if (to === "submitted") assertReadyForSubmission(expense, await getEffectiveBusinessSettings());

    const note = String(body.note ?? "").trim();
    if (note.length > 500) throw new Error("Keep the note under 500 characters.");
    if (to === "rejected" && !note) throw new Error("Add a decision note explaining what the employee needs to change.");

    const updated = await transitionExpense({
      id,
      from: expense.status,
      expectedUpdatedAt: expense.updated_at,
      to,
      actorId: body.actorId,
      actorName: body.actorName,
      note: note || `${body.actorName} marked this expense ${to}`,
      reimbursementDate: to === "scheduled" ? nextReimbursementDate(business.reimbursement) : undefined,
    });
    return Response.json({ expense: updated });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to update this expense." },
      { status: 400 },
    );
  }
}
