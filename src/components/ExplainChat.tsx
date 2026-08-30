"use client";

import type { Card } from "@/lib/schema";
import { FormEvent, useEffect, useRef, useState } from "react";

type Turn = { q: string; heading: string; body: string };

export function ExplainChat({ card, goal, busy }: { card: Card; goal: string; busy: boolean }) {
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const textRef = useRef("");

  useEffect(() => {
    textRef.current = "";
    setText("");
    setTurns([]);
    setError("");
  }, [card.id]);

  function write(value: string) {
    textRef.current = value;
    setText(value);
  }

  async function ask(event: FormEvent) {
    event.preventDefault();
    const question = textRef.current.trim();
    if (!question || asking || busy) return;
    setAsking(true);
    setError("");
    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, card, question }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Explain failed");
      setTurns((prev) => [...prev.slice(-2), { q: question, heading: data.heading, body: data.body }]);
      textRef.current = "";
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Explain failed");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="explain">
      <p className="explain-kicker">Ask</p>
      {turns.map((turn, i) => (
        <div className="explain-turn" key={`${turn.q}-${i}`}>
          <p className="explain-q">{turn.q}</p>
          <h4>{turn.heading}</h4>
          <p>{turn.body}</p>
        </div>
      ))}
      <form onSubmit={ask} className="explain-form">
        <label className="sr-only" htmlFor={`ask-${card.id}`}>
          Ask about this
        </label>
        <input
          id={`ask-${card.id}`}
          value={text}
          onChange={(event) => write(event.target.value)}
          placeholder="Ask a question"
          readOnly={asking || busy}
        />
        <button type="submit" className="secondary" disabled={asking || busy}>
          {asking ? "Looking…" : "Ask"}
        </button>
      </form>
      {error ? <p className="err">{error}</p> : null}
    </div>
  );
}
