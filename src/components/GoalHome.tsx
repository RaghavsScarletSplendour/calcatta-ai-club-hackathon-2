"use client";

import { saveSession } from "@/lib/store";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";

const EXAMPLES = [
  "intro psychology",
  "classical conditioning",
  "intro to cs",
];

export function GoalHome() {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const goalRef = useRef("");

  async function compile(nextGoal: string) {
    const text = nextGoal.trim();
    if (!text || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Compile failed");
      saveSession(data.session);
      router.push("/session");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compile failed");
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void compile(goalRef.current || goal);
  }

  return (
    <main className="home">
      <div className="home-mark">Stand</div>
      <section className="goal-box">
        <h1>A goal becomes a coach.</h1>
        <p className="lede">
          Type a goal. We compile a short module from open courses, with sources
          on the card.
        </p>
        <form className="goal-form" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="goal">
            Goal
          </label>
          <input
            id="goal"
            value={goal}
            onChange={(event) => {
              goalRef.current = event.target.value;
              setGoal(event.target.value);
            }}
            placeholder="intro psychology, conditioning, intro to cs"
            autoFocus
            readOnly={busy}
          />
          <div className="ghosts">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  goalRef.current = example;
                  setGoal(example);
                  void compile(example);
                }}
                disabled={busy}
              >
                {example}
              </button>
            ))}
          </div>
          <button className="enter" type="submit" disabled={busy}>
            {busy ? "Writing the first card…" : "Enter"}
          </button>
          {error ? <p className="err">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
