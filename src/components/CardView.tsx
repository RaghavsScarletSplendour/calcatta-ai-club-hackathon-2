"use client";

import type { Card, Source, WordCue } from "@/lib/schema";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { ExplainChat } from "./ExplainChat";
import { Transcript } from "./Transcript";

const CONFIDENCE_LABELS: Record<string, string> = {
  "1": "1 — Not at all",
  "2": "2 — A little",
  "3": "3 — Somewhat",
  "4": "4 — Fairly",
  "5": "5 — Very confident",
};

function kicker(card: Card): string {
  if (card.kind === "refresher") return "Two days later";
  if (card.retryOf) return "Easier retry";
  if (card.kind === "background") return "Background";
  if (card.kind === "chips") return "Still vague";
  if (card.kind === "training") return "Training";
  if (card.kind === "teach") return "Teaching";
  if (card.phase === "confidence") return "Confidence check";
  if (card.phase === "recognition") return "Quick check";
  if (card.phase === "application") return "Apply it";
  if (card.phase === "generation") return "Explain it";
  if (card.phase === "reveal") return "Your result";
  if (card.subjective) return "Write it";
  if (card.phase === "check") return "Check";
  return "Problem";
}

function sourceIndex(sources: Source[] | undefined, id?: string): number {
  if (!sources?.length || !id) return -1;
  return sources.findIndex((source) => source.id === id);
}

export function CardView({
  card,
  goal,
  busy,
  onSubmit,
  onSpeak,
  speaking,
  words,
  currentTime,
}: {
  card: Card;
  goal: string;
  busy: boolean;
  onSubmit: (answer: string) => void;
  onSpeak: (text: string) => void;
  speaking: boolean;
  words: WordCue[];
  currentTime: number;
}) {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const textRef = useRef("");
  const answerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textRef.current = "";
    setText("");
    setPicked(null);
  }, [card.id]);

  const visibleBlocks = (card.blocks || []).filter(
    (block) => (block.heading || "").trim() || (block.body || "").trim(),
  );
  const visibleSteps = (card.steps || []).filter(
    (step) => (step.title || "").trim() || (step.body || "").trim(),
  );

  const speakText = useMemo(() => {
    const raw = card.script
      ? card.script
      : visibleSteps.length
        ? visibleSteps.map((step) => step.speak || `${step.title}. ${step.body}`).join(" ")
        : "";
    if (raw.replace(/[.\s]+/g, " ").trim().length < 12) return "";
    return raw;
  }, [card.script, visibleSteps]);

  const isLesson = card.kind === "training" || card.kind === "teach";
  const isReveal = card.phase === "reveal";
  const hasExplanations = Boolean(card.options?.length);
  const needsTypedAnswer = !card.choices?.length && !isLesson && !isReveal;

  useEffect(() => {
    if (isLesson && speakText) onSpeak(speakText);
    // Autoplay once when the lesson card mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  useEffect(() => {
    if (!needsTypedAnswer || busy) return;
    const node = answerRef.current;
    if (!node) return;
    node.focus();
    const end = node.value.length;
    node.setSelectionRange(end, end);
  }, [card.id, needsTypedAnswer, busy]);

  const cues = words.length ? words : speakText ? [{ text: speakText, start: 0, end: 1 }] : [];

  function write(value: string) {
    textRef.current = value;
    setText(value);
  }

  function send(answer: string) {
    if (busy) return;
    const trimmed = answer.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  function onForm(event: FormEvent) {
    event.preventDefault();
    send(textRef.current);
  }

  function onAnswerKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    send(textRef.current);
  }

  return (
    <article className={`card${isLesson ? " lesson" : ""}`} key={card.id}>
      <p className="kicker">
        {kicker(card)}
        {card.minutes ? ` · ~${card.minutes} min` : ""}
      </p>
      <h2>{card.prompt}</h2>

      {card.correctionNote ? (
        <div className="correction-note">
          <strong>Before you try again:</strong> {card.correctionNote}
        </div>
      ) : null}

      {isReveal ? (
        <div className="reveal">
          <div className="reveal-score">
            <span className="reveal-number">{card.compositeScore}</span>
            <span className="reveal-out-of">/ 100</span>
          </div>
          {card.subscores ? (
            <div className="reveal-subscores">
              <div>
                <span>Core accuracy</span>
                <div className="bar"><div style={{ width: `${card.subscores.core_accuracy}%` }} /></div>
              </div>
              <div>
                <span>Own words</span>
                <div className="bar"><div style={{ width: `${card.subscores.own_words}%` }} /></div>
              </div>
              <div>
                <span>Concreteness</span>
                <div className="bar"><div style={{ width: `${card.subscores.concreteness}%` }} /></div>
              </div>
            </div>
          ) : null}
          {card.feedback ? <p className="reveal-feedback">{card.feedback}</p> : null}
          {card.calibrationMessage ? <p className="reveal-calibration">{card.calibrationMessage}</p> : null}
        </div>
      ) : visibleBlocks.length ? (
        <div className="blocks">
          {visibleBlocks.map((block) => {
            const n = sourceIndex(card.sources, block.sourceId);
            return (
              <section className={`block block-${block.kind}`} key={block.id}>
                {block.heading ? <h3>{block.heading}</h3> : null}
                {block.body ? (
                  <p>
                    {block.body}
                    {n >= 0 ? <sup className="cite-mark">[{n + 1}]</sup> : null}
                  </p>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : visibleSteps.length ? (
        <div className="steps">
          {visibleSteps.map((step, i) => (
            <div className="step" key={`${card.id}-s${i}`}>
              <div className="num">{String(i + 1).padStart(2, "0")}</div>
              <div>
                {step.title ? <h3>{step.title}</h3> : null}
                {step.body ? <p>{step.body}</p> : null}
              </div>
            </div>
          ))}
        </div>
      ) : speakText ? (
        <div className="blocks">
          {speakText
            .split(/(?<=\.)\s+/)
            .filter((line) => line.trim())
            .map((line, i) => (
              <p key={`${card.id}-line-${i}`}>{line}</p>
            ))}
        </div>
      ) : null}

      {isLesson && cues.length ? (
        <div className="script-panel">
          <Transcript words={cues} currentTime={currentTime} playing={speaking} />
        </div>
      ) : null}

      {card.sources?.length ? (
        <footer className="sources">
          <h4>Sources</h4>
          <ol>
            {card.sources.map((source) => (
              <li key={source.id}>
                {source.url ? (
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.attribution || source.title}
                  </a>
                ) : (
                  <span>{source.attribution || source.title}</span>
                )}
                {source.license ? <span className="license"> · {source.license}</span> : null}
              </li>
            ))}
          </ol>
        </footer>
      ) : null}

      {isLesson ? <ExplainChat card={card} goal={goal} busy={busy} /> : null}

      {card.choices?.length ? (
        <div className="choices">
          {card.choices.map((choice) => {
            const option = card.options?.find((o) => o.text === choice);
            const showExplain = hasExplanations && picked !== null;
            const isPicked = picked === choice;
            const cls = showExplain
              ? option?.isCorrect
                ? "correct"
                : isPicked
                  ? "wrong"
                  : ""
              : "";
            return (
              <button
                key={choice}
                type="button"
                className={cls}
                disabled={busy || showExplain}
                onClick={() => {
                  if (hasExplanations) {
                    setPicked(choice);
                    return;
                  }
                  send(choice);
                }}
              >
                {card.phase === "confidence" ? CONFIDENCE_LABELS[choice] || choice : choice}
                {showExplain && option ? <span className="option-explain">{option.explanation}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {hasExplanations && picked !== null ? (
        <div className="row">
          <button type="button" className="primary" disabled={busy} onClick={() => send(picked)}>
            Continue
          </button>
        </div>
      ) : null}

      {card.phase === "generation" ? (
        <p className="generation-hint">No right or wrong shown here — this feeds your score on the next card.</p>
      ) : null}

      {isLesson || isReveal ? (
        <div className="row">
          {isLesson ? (
            <button
              type="button"
              className="secondary"
              onClick={() => onSpeak(speakText)}
              disabled={!speakText}
            >
              {speaking ? "Speaking…" : "Speak"}
            </button>
          ) : null}
          <button type="button" className="primary" disabled={busy} onClick={() => send("ok")}>
            Continue
          </button>
        </div>
      ) : null}

      {!card.choices?.length && !isLesson && !isReveal ? (
        <form onSubmit={onForm}>
          <label className="sr-only" htmlFor="answer">
            Answer
          </label>
          <textarea
            id="answer"
            ref={answerRef}
            className="answer"
            value={text}
            onChange={(event) => write(event.target.value)}
            onKeyDown={onAnswerKey}
            placeholder={card.subjective ? "Write a short answer, then enter" : "Type, then enter"}
            autoFocus={needsTypedAnswer}
            readOnly={busy}
          />
          <div className="row">
            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Next card…" : "Enter"}
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}
