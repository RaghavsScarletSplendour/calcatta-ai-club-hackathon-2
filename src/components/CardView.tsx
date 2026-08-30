"use client";

import type { Card, Source, WordCue } from "@/lib/schema";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { ExplainChat } from "./ExplainChat";
import { Transcript } from "./Transcript";

function kicker(card: Card): string {
  if (card.kind === "refresher") return "Two days later";
  if (card.retryOf) return "Easier retry";
  if (card.kind === "background") return "Background";
  if (card.kind === "chips") return "Still vague";
  if (card.kind === "training") return "Training";
  if (card.kind === "teach") return "Teaching";
  if (card.kind === "confirm") return "Confirm";
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
  onSubmit: (answer: string, extra?: { didIt?: boolean }) => void;
  onSpeak: (text: string) => void;
  speaking: boolean;
  words: WordCue[];
  currentTime: number;
}) {
  const [text, setText] = useState("");
  const [didIt, setDidIt] = useState(false);
  const textRef = useRef("");
  const answerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textRef.current = "";
    setText("");
    setDidIt(false);
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
  const needsTypedAnswer = !card.choices?.length && !isLesson;

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
    onSubmit(trimmed, card.kind === "confirm" ? { didIt } : undefined);
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

      {visibleBlocks.length ? (
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
          {card.choices.map((choice) => (
            <button key={choice} type="button" disabled={busy} onClick={() => send(choice)}>
              {choice}
            </button>
          ))}
        </div>
      ) : null}

      {card.kind === "confirm" && card.choices?.length ? (
        <label className="didit">
          <input
            type="checkbox"
            checked={didIt}
            onChange={(event) => setDidIt(event.target.checked)}
          />
          I did it (optional — does not unlock a skill)
        </label>
      ) : null}

      {isLesson ? (
        <div className="row">
          <button
            type="button"
            className="secondary"
            onClick={() => onSpeak(speakText)}
            disabled={!speakText}
          >
            {speaking ? "Speaking…" : "Speak"}
          </button>
          <button type="button" className="primary" disabled={busy} onClick={() => send("ok")}>
            Continue
          </button>
        </div>
      ) : null}

      {!card.choices?.length && !isLesson ? (
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
          {card.kind === "confirm" ? (
            <label className="didit">
              <input
                type="checkbox"
                checked={didIt}
                onChange={(event) => setDidIt(event.target.checked)}
              />
              I did it (optional — does not unlock a skill)
            </label>
          ) : null}
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
