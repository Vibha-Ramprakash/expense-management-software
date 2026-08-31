import { ensureDatabase, getDatabase } from "@/lib/store";
import { RESERVE_ANSWER_SQL } from "@/lib/assistant-sql.mjs";

export type SavedAnswer = { id: string; actor_id: string; role: string; question: string; status: "pending" | "completed" | "error"; model: string; answer_json: string | null; generation_json: string | null; error: string | null; created_at: string; updated_at: string };

export async function getSavedAnswer(id: string) {
  await ensureDatabase();
  return getDatabase().prepare("SELECT * FROM assistant_answers WHERE id = ?").bind(id).first<SavedAnswer>();
}

export async function listSavedAnswers(actorId: string, role: string) {
  await ensureDatabase();
  const result = await getDatabase().prepare("SELECT * FROM assistant_answers WHERE actor_id = ? AND role = ? ORDER BY created_at DESC, id DESC LIMIT 20").bind(actorId, role).all<SavedAnswer>();
  return result.results.map(publicAnswer);
}

export function publicAnswer(row: SavedAnswer) {
  const generation = row.generation_json ? JSON.parse(row.generation_json) : null;
  return { id: row.id, question: row.question, status: row.status, model: row.model, answer: row.answer_json ? JSON.parse(row.answer_json) : null, usage: generation?.usage ?? null, estimatedCost: null, error: row.error, createdAt: row.created_at };
}

export async function saveInterpretation(id: string, generation: unknown) {
  await getDatabase().prepare("UPDATE assistant_answers SET generation_json = ?, updated_at = ? WHERE id = ? AND status = 'pending'").bind(JSON.stringify(generation), new Date().toISOString(), id).run();
}

export async function reserveAnswer(id: string, actorId: string, role: string, question: string, model: string) {
  await ensureDatabase();
  const now = new Date().toISOString();
  const result = await getDatabase().prepare(RESERVE_ANSWER_SQL)
    .bind(id, actorId, role, question, model, now, now, actorId, role, `${now.slice(0, 10)}T00:00:00.000Z`).run();
  return result.meta?.changes === 1;
}

export async function finishAnswer(id: string, answer: unknown, error: string | null = null) {
  await getDatabase().prepare("UPDATE assistant_answers SET status = ?, answer_json = ?, error = ?, updated_at = ? WHERE id = ? AND status = 'pending'")
    .bind(error ? "error" : "completed", answer ? JSON.stringify(answer) : null, error, new Date().toISOString(), id).run();
}
