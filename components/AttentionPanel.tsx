"use client";

import { ArrowRight, ClipboardCheck, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { AssistantQuestions } from "@/components/AssistantQuestions";

type Topic = "all" | "missing" | "approvals" | "reimbursements";
type Digest = {
  asOf: string;
  counts: Record<Topic, number>;
  limitation: string;
  items: { expenseId: string; merchant: string; kind: Topic; reason: string; nextAction: string; amountMinor: number; currency: string; href: string }[];
};

export function AttentionPanel({ role, revision, onOpen }: { role: string; revision: string; onOpen: (id: string) => void }) {
  const [topic, setTopic] = useState<Topic>("all");
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState<{ key: string; digest?: Digest; error?: string }>({ key: "" });
  const key = `${role}:${revision}:${refresh}`;
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/assistant?role=${encodeURIComponent(role)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Unable to check your claims.");
        if (!controller.signal.aborted) setState({ key, digest: payload });
      })
      .catch((error) => { if (!controller.signal.aborted) setState({ key, error: error instanceof Error ? error.message : "Unable to check your claims." }); });
    return () => controller.abort();
  }, [key, role]);
  const current = state.key === key;
  const digest = current ? state.digest : undefined;
  const items = digest?.items.filter((item) => topic === "all" || item.kind === topic) ?? [];

  return <section className="attention-panel" id="assistant" aria-labelledby="assistant-title">
    <div className="section-heading">
      <div><h2 id="assistant-title"><ClipboardCheck size={21} />What needs your attention?</h2><p>Live workflow facts, plus an AI-assisted question desk.</p></div>
      <button className="icon-button" type="button" aria-label="Refresh assistant" onClick={() => setRefresh((value) => value + 1)}><RefreshCw size={17} /></button>
    </div>
    <div className="filter-row" role="group" aria-label="Assistant questions">
      {([["all", "What is next?"], ["missing", "What is missing?"], ["approvals", "Pending approvals"], ["reimbursements", "Reimbursements"]] as const).map(([value, label]) =>
        <button type="button" key={value} className={topic === value ? "active" : ""} aria-pressed={topic === value} onClick={() => setTopic(value)}>{label}{digest && <span>{digest.counts[value]}</span>}</button>)}
    </div>
    {!current ? <div className="table-state" role="status"><Loader2 className="spin" size={18} />Checking saved claims…</div>
      : state.error ? <div className="assistant-error" role="alert"><p>{state.error}</p><button className="secondary-button" onClick={() => setRefresh((value) => value + 1)}>Try again</button></div>
        : items.length === 0 ? <p className="assistant-empty">No saved claims need this step in the selected demo role.</p>
          : <ul className="attention-list">{items.map((item) => <li key={item.expenseId}>
            <div><strong>{item.merchant}</strong><p>{item.reason}</p></div>
            <a href={item.href} onClick={(event) => { event.preventDefault(); onOpen(item.expenseId); }} aria-label={`${item.nextAction}: ${item.merchant}`}>{item.nextAction}<ArrowRight size={15} /></a>
          </li>)}</ul>}
    {digest && <p className="assistant-disclosure">Checked {new Date(digest.asOf).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. {digest.limitation}</p>}
    <AssistantQuestions key={role} role={role} revision={revision} onOpen={onOpen} />
  </section>;
}
