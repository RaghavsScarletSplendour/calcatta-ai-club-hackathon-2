"use client";

import type { Card } from "@/lib/schema";
import { FormEvent, useEffect, useMemo, useState } from "react";

function kicker(card: Card): string {
  if (card.kind === "refresher") return "Two days later";
  if (card.retryOf) return "Easier retry";
  if (card.kind === "background") return "Background";
  if (card.kind === "chips") return "Still vague";
  if (card.kind === "teach") return "On stage";
  if (card.kind === "confirm") return "Confirm";
  if (card.phase === "check") return "Check";
  return "Problem";
}

export function CardView({
  card,
  busy,
  onSubmit,
  onSpeak,
  speaking,
}: {
  card: Card;
  busy: boolean;
  onSubmit: (answer: string, extra?: { didIt?: boolean }) => void;
  onSpeak: (text: string) => void;
  speaking: boolean;
}) {
  const [text, setText] = useState("");
  const [didIt, setDidIt] = useState(false);

  useEffect(() => {
    setText("");
    setDidIt(false);
  }, [card.id]);

  const speakText = useMemo(() => {
    if (!card.steps?.length) return "";
    return card.steps.map((step) => step.speak || `${step.title}. ${step.body}`).join(" ");
  }, [card.steps]);

  useEffect(() => {
    if (card.kind === "teach" && speakText) onSpeak(speakText);
    // Autoplay once when the teach card mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  function send(answer: string) {
    if (busy) return;
    onSubmit(answer, card.kind === "confirm" ? { didIt } : undefined);
  }

  function onForm(event: FormEvent) {
    event.preventDefault();
    send(text);
  }

  return (
    <article className="card" key={card.id}>
      <p className="kicker">{kicker(card)}</p>
      <h2>{card.prompt}</h2>

      {card.steps?.length ? (
        <div className="steps">
          {card.steps.map((step, i) => (
            <div className="step" key={`${card.id}-s${i}`}>
              <div className="num">{String(i + 1).padStart(2, "0")}</div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

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

      {card.kind === "teach" ? (
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

      {!card.choices?.length && card.kind !== "teach" ? (
        <form onSubmit={onForm}>
          <label className="sr-only" htmlFor="answer">
            Answer
          </label>
          <textarea
            id="answer"
            className="answer"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(text);
              }
            }}
            placeholder="Type, then enter"
            disabled={busy}
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
            <button className="primary" type="submit" disabled={busy || !text.trim()}>
              {busy ? "Next card…" : "Enter"}
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}
