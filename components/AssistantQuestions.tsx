"use client";

import { ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

type Entry = {
  id: string; question: string; status: "pending" | "completed" | "error"; error: string | null; createdAt: string;
  answer: null | { asOf: string; interpretation: string; summary: string; totalMatches: number; hasMore: boolean; limitation: string; totals: { currency: string; amount: string }[]; items: { expenseId: string; merchant: string; reason: string; nextAction: string; href: string }[] };
};

export function AssistantQuestions({ role, revision, onOpen }: { role: string; revision: string; onOpen: (id: string) => void }) {
  const [question, setQuestion] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [entry, setEntry] = useState<Entry | null>(null);
  const [answerRevision, setAnswerRevision] = useState("");
  const [notice, setNotice] = useState("");
  const [focusToken, setFocusToken] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [history, setHistory] = useState<{ revision: number; entries?: Entry[]; error?: string } | null>(null);
  const request = useRef<AbortController | null>(null);
  const attempt = useRef<{ id: string; question: string } | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const answerHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (focusToken) { answerHeading.current?.focus(); answerHeading.current?.scrollIntoView({ block: "nearest" }); }
  }, [focusToken]);
  useEffect(() => {
    if (!historyOpen) return;
    const controller = new AbortController();
    fetch(`/api/assistant/answers?role=${role}`, { headers: { "x-keel-ai-request": "1" }, cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Unable to load saved answers.");
        if (!controller.signal.aborted) {
          setHistory({ revision: historyRevision, entries: payload.answers });
          setEntry((current) => current ? payload.answers.find((saved: Entry) => saved.id === current.id) ?? current : current);
          const recovered = payload.answers.find((saved: Entry) => saved.id === attempt.current?.id);
          if (recovered && recovered.status !== "pending") attempt.current = null;
        }
      }).catch((reason) => { if (!controller.signal.aborted) setHistory({ revision: historyRevision, error: reason instanceof Error ? reason.message : "Unable to load saved answers." }); });
    return () => controller.abort();
  }, [role, historyOpen, historyRevision]);

  useEffect(() => {
    let controller: AbortController | null = null;
    const followAnswer = () => {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const id = params.get("answer");
      if (!id) return;
      if (params.get("role") !== role) { setError("This saved link belongs to another demo role. Select that role to open its answer."); return; }
      controller?.abort();
      controller = new AbortController();
      const active = controller;
      fetch(`/api/assistant/answers?role=${role}&id=${encodeURIComponent(id)}`, { headers: { "x-keel-ai-request": "1" }, cache: "no-store", signal: active.signal })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error ?? "Saved answer not found.");
          if (!active.signal.aborted) { setEntry(payload.entry); setAnswerRevision(""); setError(""); setNotice("Saved answer opened. This is a timestamped snapshot."); setFocusToken((value) => value + 1); }
        }).catch((reason) => { if (!active.signal.aborted) setError(reason instanceof Error ? reason.message : "Unable to open this answer."); });
    };
    followAnswer();
    window.addEventListener("hashchange", followAnswer);
    return () => { controller?.abort(); window.removeEventListener("hashchange", followAnswer); };
  }, [role]);

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent || request.current || !question.trim()) return;
    const controller = new AbortController();
    request.current = controller;
    if (attempt.current?.question !== question.trim()) attempt.current = { id: crypto.randomUUID(), question: question.trim() };
    const thisAttempt = attempt.current;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/assistant/answers", { method: "POST", headers: { "content-type": "application/json", "x-keel-ai-request": "1" }, signal: controller.signal,
        body: JSON.stringify({ requestId: thisAttempt.id, question: thisAttempt.question, role, consent: true }) });
      const payload = await response.json();
      if (!response.ok || !payload.entry) throw new Error(payload.error ?? "Unable to answer. Check saved answers before retrying.");
      if (controller.signal.aborted) return;
      setEntry(payload.entry); setAnswerRevision(payload.reused ? "" : revision); setConsent(false);
      if (payload.entry.status !== "pending") attempt.current = null;
      setNotice(payload.entry.status === "pending" ? "The question is saved; its answer is still pending." : "Saved answer ready.");
      setFocusToken((value) => value + 1);
      setHistoryRevision((value) => value + 1);
    } catch (reason) {
      if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : "Unable to answer. Check saved answers before retrying."); setHistoryRevision((value) => value + 1); }
    } finally { if (request.current === controller) { request.current = null; setBusy(false); } }
  }

  function prepareAgain(saved: Entry) {
    if (busy) return;
    attempt.current = null;
    setQuestion(saved.question); setConsent(false); setError("");
    input.current?.focus();
  }

  return <div className="assistant-questions">
    <p className="sr-only" role="status">{busy ? "Checking your question. No claim will be changed." : notice}</p>
    <h3>Ask about your claims</h3>
    <p>AI interprets your question; Keel supplies the facts. Ask one standalone question at a time.</p>
    <form onSubmit={ask}>
      <label htmlFor="assistant-question">Your question</label>
      <textarea id="assistant-question" ref={input} value={question} maxLength={800} rows={2} required disabled={busy} placeholder="Which approvals have been waiting at least three days?" onChange={(event) => { setQuestion(event.target.value); setConsent(false); }} />
      <label className="receipt-check"><input type="checkbox" checked={consent} disabled={busy} onChange={(event) => setConsent(event.target.checked)} /><span>Send this question to OpenAI and save the question and answer in Keel. It may contain personal information. AI usage is billed to the connected account. Receipt files and the claim ledger are not sent.</span></label>
      <div className="assistant-question-actions">
        <button className="primary-button" type="submit" disabled={busy || !consent || !question.trim()}>{busy ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}{busy ? "Checking your question…" : "Ask assistant"}</button>
        {busy && <button className="secondary-button" type="button" onClick={() => { request.current?.abort(); request.current = null; setBusy(false); setError("Stopped waiting. The answer may still be saved; check saved answers before asking again."); }}>Stop waiting</button>}
      </div>
      <p className="extraction-hint">Needs the private AI connection. The quick questions above work without it. An AI question never approves a claim, sends a reminder or pays anyone.</p>
    </form>
    {error && <p className="receipt-error" role="alert">{error}</p>}
    {entry && <section className="assistant-answer" aria-label="Saved assistant answer">
      <h4 ref={answerHeading} tabIndex={-1}>{entry.question}</h4>
      <p className="assistant-snapshot">{entry.answer ? `Facts checked ${new Date(entry.answer.asOf).toLocaleString("en-GB")}.` : `Question saved ${new Date(entry.createdAt).toLocaleString("en-GB")}; no completed answer yet.`} {answerRevision !== revision ? "Claims may have changed. " : ""}This is a timestamped answer, not a live balance.</p>
      {entry.status === "pending" ? <p>The request is recorded, but its answer is not confirmed yet. Refresh saved answers without making another AI call. If it remains unfinished after a restart, explicitly ask again.</p> : entry.status === "error" ? <p role="alert">{entry.error}</p> : entry.answer && <>
        <p><strong>Interpreted as:</strong> {entry.answer.interpretation}</p>
        <p>{entry.answer.summary} {entry.answer.totals.map((total) => `${total.currency} ${total.amount}`).join(" · ")}</p>
        <ul className="attention-list">{entry.answer.items.map((item) => <li key={item.expenseId}><div><strong>{item.merchant}</strong><p>{item.reason}</p></div><a href={item.href} onClick={(event) => { event.preventDefault(); onOpen(item.expenseId); }}>{item.nextAction}<ArrowRight size={15} /></a></li>)}</ul>
        {entry.answer.hasMore && <p>Showing the first 25 claims; totals include all {entry.answer.totalMatches}. Narrow the question with a merchant or status to see fewer matches.</p>}
        <p>{entry.answer.limitation}</p>
      </>}
      <div className="assistant-question-actions"><button className="secondary-button" type="button" disabled={busy} onClick={() => prepareAgain(entry)}>Prepare this question again</button><a href={`#answer=${entry.id}&role=${role}`}>Link to saved answer</a></div>
    </section>}
    <details className="assistant-history" onToggle={(event) => setHistoryOpen(event.currentTarget.open)}>
      <summary>Saved answers for this demo role</summary>
      {historyOpen && <>
        <button className="secondary-button" type="button" onClick={() => setHistoryRevision((value) => value + 1)}><RefreshCw size={15} />Refresh saved answers (no AI call)</button>
        {history?.revision !== historyRevision ? <p role="status">Loading saved answers…</p> : history.error ? <p role="alert">{history.error}</p> : !history.entries?.length ? <p>No saved questions yet.</p> : <ul>{history.entries.map((saved) => <li key={saved.id}><button type="button" className="saved-answer-link" onClick={() => { setEntry(saved); setAnswerRevision(""); setNotice("Saved answer opened. This is a timestamped snapshot."); setFocusToken((value) => value + 1); }}>{saved.question}<span>{saved.status} · {new Date(saved.createdAt).toLocaleString("en-GB")}</span></button></li>)}</ul>}
        <p>The 20 most recent questions are listed. Saved links retrieve older answers. Resetting the demo also clears this history. For a link belonging to another role, select that demo role first.</p>
      </>}
    </details>
  </div>;
}
