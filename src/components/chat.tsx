"use client";

import { AlertTriangle, Info, Lightbulb, ListChecks, Loader2, MessageSquarePlus, PlayCircle, Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import type { ChatAnswer } from "@/server/chat/answer";
import { pushRecent } from "./ask-box";
import { ActivityCard, BookmarkButton, MilestoneCard, SourceCard, VideoList } from "./content";
import { Button, Card, Code, SectionTitle } from "./ui/primitives";

type Turn = { id: string; question: string; answer?: ChatAnswer; error?: string };

export function AnswerView({ a, lang, onFollowUp }: { a: ChatAnswer; lang: Lang; onFollowUp: (q: string) => void }) {
  const d = t(lang);
  // answers are rendered in the language of the question, not necessarily the UI language
  const al = a.language;
  const ad = t(al);
  return (
    <div className="space-y-4" lang={al} data-testid="answer" data-status={a.status} data-milestone={a.milestone?.code ?? ""}>
      <Card className="bg-white">
        <SectionTitle icon={<Lightbulb size={20} />}>{ad.explanation}</SectionTitle>
        <p className="leading-relaxed" data-testid="explanation">{a.explanation}</p>
        {a.age ? <p className="mt-2 text-xs text-muted">{ad.approxAge}: {a.age.text}</p> : null}
        {a.explanationSource === "extractive" ? <p className="mt-2 flex items-center gap-1 text-xs text-muted"><Info size={13} aria-hidden /> {ad.extractiveNote}</p> : null}
      </Card>

      {a.safetyNote ? (
        <div className="flex gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100" role="note" data-testid="safety-note">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden /> <p>{a.safetyNote}</p>
        </div>
      ) : null}

      {a.milestone ? (
        <section>
          <SectionTitle>{ad.relevantMilestone}</SectionTitle>
          <MilestoneCard m={a.milestone} lang={al} />
          <div className="mt-2 flex justify-end"><BookmarkButton itemType="milestone" itemKey={a.milestone.code} lang={al} /></div>
        </section>
      ) : null}

      {a.activities.length ? (
        <section>
          <SectionTitle icon={<ListChecks size={20} />}>{ad.recommendedActivities}</SectionTitle>
          <div className="space-y-3">{a.activities.map((x) => <ActivityCard key={x.code} a={x} lang={al} />)}</div>
        </section>
      ) : null}

      {a.milestone ? (
        <section>
          <SectionTitle icon={<PlayCircle size={20} />}>{ad.videos}</SectionTitle>
          {a.videos.length ? <p className="mb-2 text-xs text-muted">{a.videoMatch === "activity" ? ad.activityVideos : ad.milestoneLevelVideos}</p> : null}
          <VideoList videos={a.videos} lang={al} notice={a.videoNotice} highlightedIds={a.videos.filter((v) => v.highlighted).map((v) => v.videoId)} />
        </section>
      ) : null}

      {a.sources.length ? (
        <section>
          <SectionTitle>{ad.source}</SectionTitle>
          <SourceCard sources={a.sources} lang={al} />
          {a.sourceNotice ? <p className="mt-2 text-xs text-muted" data-testid="source-notice">{a.sourceNotice}</p> : null}
        </section>
      ) : null}

      {a.evidence.length ? (
        <details className="rounded-2xl bg-white p-3 ring-1 ring-sage-100" data-testid="evidence">
          <summary className="cursor-pointer text-sm font-medium text-sage-700">{ad.evidenceTitle} ({a.evidence.length})</summary>
          <ul className="mt-2 space-y-2 text-sm">
            {a.evidence.map((e, i) => (
              <li key={i} className="border-s-2 border-sage-200 ps-3">
                <p className="text-xs text-muted">{ad.quotedFromHandbook} · {e.section}{e.page ? <> · {ad.page} <Code>{e.page}</Code></> : null}</p>
                <blockquote className="leading-relaxed">{e.text}</blockquote>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {a.followUps.length ? (
        <section>
          <SectionTitle>{ad.followUps}</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {a.followUps.map((f) => (
              <button key={f} type="button" onClick={() => onFollowUp(f)} className="rounded-full bg-sky-50 px-3 py-2 text-start text-sm text-sky-700 ring-1 ring-sky-100 hover:bg-sky-100" data-testid="follow-up">
                {f}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <p className="text-xs text-muted" data-testid="disclaimer">{a.disclaimer}</p>
      {a.milestone ? <p className="sr-only">{d.milestoneCode} <Code>{a.milestone.code}</Code></p> : null}
    </div>
  );
}

export function ChatClient({ lang }: { lang: Lang }) {
  const d = t(lang);
  const params = useSearchParams();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  const ask = useCallback(async (question: string) => {
    const q = question.trim();
    if (q.length < 2 || busy) return;
    const id = crypto.randomUUID();
    setTurns((ts) => [...ts, { id, question: q }]);
    setInput("");
    setBusy(true);
    pushRecent(q);
    try {
      sessionStorage.setItem("kidsai.lastQuestion", q);
    } catch {
      /* storage unavailable */
    }
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, language: lang, conversationId }),
      });
      if (!res.ok) {
        const msg = res.status === 429 ? d.rateLimited : d.errorGeneric;
        setTurns((ts) => ts.map((x) => (x.id === id ? { ...x, error: msg } : x)));
        return;
      }
      const answer = (await res.json()) as ChatAnswer;
      setConversationId(answer.conversationId);
      setTurns((ts) => ts.map((x) => (x.id === id ? { ...x, answer } : x)));
    } catch {
      setTurns((ts) => ts.map((x) => (x.id === id ? { ...x, error: d.errorGeneric } : x)));
    } finally {
      setBusy(false);
    }
  }, [busy, conversationId, d.errorGeneric, d.rateLimited, lang]);

  useEffect(() => {
    if (sentInitial.current) return;
    // after a language switch, ask the last question again in the newly selected language
    let q = params.get("q");
    try {
      if (sessionStorage.getItem("kidsai.langSwitched")) {
        sessionStorage.removeItem("kidsai.langSwitched");
        q = sessionStorage.getItem("kidsai.lastQuestion") ?? q;
      }
    } catch {
      /* storage unavailable */
    }
    if (q) {
      sentInitial.current = true;
      void ask(q);
    }
  }, [params, ask]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{d.chat}</h1>
        {turns.length ? (
          <Button variant="soft" size="sm" onClick={() => { setTurns([]); setConversationId(null); }} data-testid="new-chat">
            <MessageSquarePlus size={16} aria-hidden /> {d.newChat}
          </Button>
        ) : null}
      </div>

      {!turns.length ? <p className="rounded-2xl bg-white p-4 text-muted">{d.askPlaceholder}</p> : null}

      {turns.map((turn) => (
        <div key={turn.id} className="space-y-3">
          <div className="ms-auto max-w-[85%] rounded-3xl rounded-se-md bg-sky-700 px-4 py-3 text-white" data-testid="user-message">{turn.question}</div>
          {turn.answer ? (
            <AnswerView a={turn.answer} lang={lang} onFollowUp={(q) => void ask(q)} />
          ) : turn.error ? (
            <p className="rounded-2xl bg-red-50 p-3 text-red-800" role="alert">{turn.error}</p>
          ) : (
            <p className="flex items-center gap-2 text-muted" role="status"><Loader2 className="animate-spin" size={18} aria-hidden /> {d.thinking}</p>
          )}
        </div>
      ))}
      <div ref={endRef} />

      <form
        onSubmit={(e) => { e.preventDefault(); void ask(input); }}
        className="sticky bottom-20 z-20 flex items-end gap-2 rounded-[1.5rem] bg-white p-2 shadow-[0_6px_24px_rgba(45,49,66,0.12)] ring-1 ring-sky-100"
      >
        <label htmlFor="chat-input" className="sr-only">{d.askPlaceholder}</label>
        <textarea
          id="chat-input"
          data-testid="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(input); } }}
          rows={1}
          maxLength={600}
          placeholder={d.askPlaceholder}
          enterKeyHint="send"
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 outline-none"
        />
        <Button type="submit" size="icon" disabled={busy || input.trim().length < 2} aria-label={d.ask} data-testid="chat-send">
          {busy ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Send size={18} aria-hidden className="rtl:-scale-x-100" />}
        </Button>
      </form>
    </div>
  );
}
