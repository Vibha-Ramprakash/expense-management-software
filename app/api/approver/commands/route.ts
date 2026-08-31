import { env } from "cloudflare:workers";
import business from "@/config/business.json";
import { assertConfiguredApprover, formatMoney } from "@/lib/finance.mjs";
import { assertLocalAIRequest, ExtractionError } from "@/lib/receipt-extraction.mjs";
import { demoAccessDenial } from "@/lib/demo-access.mjs";
import { interpretApproverCommand, matchingSubmittedClaims, validateApproverPrompt } from "@/lib/approver-command.mjs";
import { finishApproverCommand, getApproverCommand, getEffectiveBusinessSettings, getExpense, listExpenses, saveApproverCommand, setPolicyLimit, transitionExpense, type Expense } from "@/lib/store";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

function actor(body:{actorId?:string;actorName?:string}) {
  if (!body.actorId || !body.actorName) throw new ExtractionError("Choose the Approver demo role.", 400);
  assertConfiguredApprover({ actorId: body.actorId, actorName: body.actorName, approvers: business.approvers });
  return { id: body.actorId, name: body.actorName };
}

export async function POST(request:Request) {
  const denied = demoAccessDenial(request, process.env.NODE_ENV === "development");
  if (denied) return denied;
  try {
    assertLocalAIRequest(request, process.env.NODE_ENV === "development");
    const body = await request.json() as {mode?:string;prompt?:string;consent?:boolean;commandId?:string;actorId?:string;actorName?:string};
    const approver = actor(body);
    if (body.mode === "preview") {
      if (body.consent !== true) throw new ExtractionError("Confirm that this instruction may be sent to OpenAI and saved in the local demo.", 400);
      const prompt = validateApproverPrompt(body.prompt);
      const settings = await getEffectiveBusinessSettings();
      const plan = await interpretApproverCommand({ prompt, categories: settings.categories.map((item:{name:string}) => item.name), defaultCurrency: settings.defaultCurrency, apiKey: env.OPENAI_API_KEY });
      if (plan.kind === "unsupported") return Response.json({ preview: { kind: "unsupported", summary: "That instruction is outside the guarded demo commands. Nothing was changed.", matches: [] } }, { headers });
      const expenses = await listExpenses();
      const matches = matchingSubmittedClaims(expenses, plan, approver.id);
      const id = `command-${crypto.randomUUID()}`;
      await saveApproverCommand({ id, actorId: approver.id, actorName: approver.name, prompt, plan, matchIds: matches.map((item:Expense) => item.id) });
      const summary = plan.kind === "set_limit" ? `Set ${plan.category} to ${formatMoney(plan.amountMinor,plan.currency)} per claim.` : `Approve ${matches.length} submitted ${plan.category} claim${matches.length===1?"":"s"} ${plan.comparison === "below" ? "below" : "at or below"} ${formatMoney(plan.amountMinor,plan.currency)}.`;
      return Response.json({ preview: { id, ...plan, summary, matches: matches.map((item:Expense) => ({ id:item.id,merchant:item.merchant,amountMinor:item.amount_minor,currency:item.currency,category:item.category,updatedAt:item.updated_at })) } }, { headers });
    }
    if (body.mode !== "execute" || typeof body.commandId !== "string") throw new ExtractionError("Preview a command before confirming it.", 400);
    const saved = await getApproverCommand(body.commandId);
    if (!saved || saved.actor_id !== approver.id || saved.actor_name !== approver.name || saved.status !== "previewed") throw new ExtractionError("This command is unavailable or was already confirmed.", 409);
    const plan = JSON.parse(saved.plan_json);
    const previewIds = new Set(JSON.parse(saved.match_ids_json));
    if (plan.kind === "set_limit") {
      await setPolicyLimit({ category:plan.category, limitMinor:plan.amountMinor, actorId:approver.id, actorName:approver.name, note:`Confirmed AI command: “${saved.prompt}”` });
      const result = { kind:"set_limit",updated:1 };
      await finishApproverCommand(saved.id,result);
      return Response.json({ result }, { headers });
    }
    const currentMatches = matchingSubmittedClaims(await listExpenses(),plan,approver.id).filter((item:Expense) => previewIds.has(item.id));
    const approved:string[]=[];
    for (const candidate of currentMatches) {
      const expense = await getExpense(candidate.id);
      if (!expense || expense.status !== "submitted" || expense.updated_at !== candidate.updated_at) continue;
      await transitionExpense({ id:expense.id,from:"submitted",expectedUpdatedAt:expense.updated_at,to:"approved",actorId:approver.id,actorName:approver.name,note:`Approved after confirmed command: “${saved.prompt}”` });
      approved.push(expense.id);
    }
    const result = { kind:"approve_matching",approved };
    await finishApproverCommand(saved.id,result);
    return Response.json({ result }, { headers });
  } catch (error) {
    const status = error instanceof ExtractionError ? error.status : 400;
    return Response.json({ error:error instanceof Error?error.message:"Unable to process this command. Nothing was changed." }, { status, headers });
  }
}
