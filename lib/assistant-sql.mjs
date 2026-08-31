// Shared with the SQLite regression test so quota/duplicate checks exercise the production statement.
export const RESERVE_ANSWER_SQL = `INSERT OR IGNORE INTO assistant_answers (id, actor_id, role, question, status, model, created_at, updated_at)
  SELECT ?, ?, ?, ?, 'pending', ?, ?, ? WHERE (SELECT COUNT(*) FROM assistant_answers WHERE actor_id = ? AND role = ? AND created_at >= ?) < 50`;
