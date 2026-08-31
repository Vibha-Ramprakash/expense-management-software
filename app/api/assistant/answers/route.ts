import { env } from "cloudflare:workers";
import business from "@/config/business.json";
import { listExpenses } from "@/lib/store";
import { getSavedAnswer, listSavedAnswers, publicAnswer, reserveAnswer, finishAnswer, saveInterpretation } from "@/lib/assistant-store";
import { answerExpenseQuestion, ASSISTANT_MODEL, interpretQuestion, validateQuestion } from "@/lib/assistant-query.mjs";
import { assertLocalAIRequest, ExtractionError } from "@/lib/receipt-extraction.mjs";
import { demoAccessDenial } from "@/lib/demo-access.mjs";

export const dynamic = "force-dynamic";
let answering = false;
const headers = { "Cache-Control": "no-store" };

function contextFor(role: string) {
  if (!["employee", "approver", "finance"].includes(role)) throw new ExtractionError("Choose a valid demo role.", 400);
  const approver = business.approvers[0];
  return { role, actorId: role === "employee" ? "person-noah" : role === "approver" ? approver.id : "person-julian", approverName: approver.name, asOf: new Date().toISOString() };
}

function safeError(error: unknown) {
  return { message: error instanceof ExtractionError ? error.message : "The assistant could not finish. Check saved answers before asking again; no claim was changed.", status: error instanceof ExtractionError ? error.status : 500 };
}

export async function GET(request: Request) {
  const denied = demoAccessDenial(request, process.env.NODE_ENV === "development");
  if (denied) return denied;
  try {
    const url = new URL(request.url);
    // A same-origin custom-header GET needs no Origin header. Cross-site callers cannot pass CORS preflight.
    if (process.env.NODE_ENV !== "development" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || request.headers.get("x-keel-ai-request") !== "1" || (request.headers.has("origin") && request.headers.get("origin") !== url.origin)) throw new ExtractionError("Saved AI answers are available only in this computer's local demo.", 403);
    const context = contextFor(url.searchParams.get("role") ?? "employee");
    const id = url.searchParams.get("id");
    if (id) {
      const entry = await getSavedAnswer(id);
      if (!entry || entry.actor_id !== context.actorId || entry.role !== context.role) return Response.json({ error: "Saved answer not found in this demo role." }, { status: 404, headers });
      return Response.json({ entry: publicAnswer(entry) }, { headers });
    }
    return Response.json({ answers: await listSavedAnswers(context.actorId, context.role) }, { headers });
  } catch (error) { const failure = safeError(error); return Response.json({ error: failure.message }, { status: failure.status, headers }); }
}

export async function POST(request: Request) {
  const denied = demoAccessDenial(request, process.env.NODE_ENV === "development");
  if (denied) return denied;
  let acquired = false;
  let reservedId: string | null = null;
  try {
    assertLocalAIRequest(request, process.env.NODE_ENV === "development");
    const reader = request.body?.getReader();
    if (!reader) throw new ExtractionError("Add a question first.", 400);
    const decoder = new TextDecoder();
    let text = "";
    let bytes = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 5000) { await reader.cancel(); throw new ExtractionError("That question is too long.", 413); }
      text += decoder.decode(part.value, { stream: true });
    }
    text += decoder.decode();
    let body;
    try { body = JSON.parse(text); } catch { throw new ExtractionError("The question could not be read.", 400); }
    if (body?.consent !== true) throw new ExtractionError("Confirm that your question may be sent to OpenAI and saved here.", 400);
    const question = validateQuestion(body.question);
    const context = contextFor(body.role);
    if (typeof body.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) throw new ExtractionError("Start a new question from the Keel assistant.", 400);
    const previous = await getSavedAnswer(body.requestId);
    if (previous) {
      if (previous.actor_id !== context.actorId || previous.role !== context.role || previous.question !== question) throw new ExtractionError("This request belongs to another question. Start a new question.", 409);
      return Response.json({ entry: publicAnswer(previous), reused: true }, { status: previous.status === "pending" ? 202 : 200, headers });
    }
    if (typeof env.OPENAI_API_KEY !== "string" || !env.OPENAI_API_KEY.trim()) throw new ExtractionError("AI is not connected. Ask Codex to open private AI setup; never paste a key into chat.", 503);
    if (answering) throw new ExtractionError("The assistant is answering another question. Check saved answers in a moment.", 429);
    answering = acquired = true;
    if (!await reserveAnswer(body.requestId, context.actorId, context.role, question, ASSISTANT_MODEL)) throw new ExtractionError("This question is already reserved or today's 50-question demo limit was reached. Check saved answers before trying again.", 429);
    reservedId = body.requestId;
    const generation = await interpretQuestion({ question, role: context.role, asOf: context.asOf, apiKey: env.OPENAI_API_KEY });
    await saveInterpretation(body.requestId, generation);
    // Read canonical data after interpretation, not from a client-supplied or pre-request snapshot.
    const expenses = await listExpenses();
    const answer = answerExpenseQuestion(expenses ?? [], generation.plan, { ...context, asOf: new Date().toISOString() });
    await finishAnswer(body.requestId, answer);
    const saved = await getSavedAnswer(body.requestId);
    if (!saved) throw new Error("Answer was removed during completion");
    return Response.json({ entry: publicAnswer(saved) }, { headers });
  } catch (error) {
    const failure = safeError(error);
    if (reservedId) await finishAnswer(reservedId, null, failure.message).catch(() => {});
    return Response.json({ error: failure.message }, { status: failure.status, headers });
  } finally { if (acquired) answering = false; }
}
