"use client";

import { liveSkills } from "@/lib/rules";
import type { Path, Session } from "@/lib/schema";
import { currentCard } from "@/lib/session";
import { clearSession, loadSession, saveSession } from "@/lib/store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CardView } from "./CardView";
import { ReceiptsDrawer } from "./ReceiptsDrawer";
import { SkillsRail } from "./SkillsRail";

async function post(url: string, body: unknown): Promise<Session> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data.session as Session;
}

export function SessionView() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipts, setReceipts] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const spoken = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const loaded = loadSession();
    if (!loaded) {
      router.replace("/");
      return;
    }
    setSession(loaded);
  }, [router]);

  function commit(next: Session) {
    saveSession(next);
    setSession(next);
  }

  const speak = useCallback(async (text: string, cardId?: string) => {
    if (!text.trim()) return;
    if (cardId) {
      if (spoken.current.has(cardId)) return;
      spoken.current.add(cardId);
    }
    setSpeaking(true);
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error("tts");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      await audio.play();
    } catch {
      try {
        const utter = new SpeechSynthesisUtterance(text);
        utter.onend = () => setSpeaking(false);
        window.speechSynthesis.speak(utter);
      } catch {
        setSpeaking(false);
      }
    }
  }, []);

  async function answer(text: string, extra?: { didIt?: boolean }) {
    if (!session || busy) return;
    setBusy(true);
    setError("");
    try {
      const next = await post("/api/turn", { session, answer: text, didIt: extra?.didIt });
      commit(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Turn failed");
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    if (!session || busy) return;
    setBusy(true);
    setError("");
    try {
      const next = await post("/api/skip", { session });
      commit(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Skip failed");
    } finally {
      setBusy(false);
    }
  }

  async function override(path: Path) {
    if (!session || busy || session.path === path) return;
    setBusy(true);
    setError("");
    try {
      const next = await post("/api/turn", { session, action: "override", path });
      commit(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Override failed");
    } finally {
      setBusy(false);
    }
  }

  if (!session) return null;

  const card = currentCard(session);
  const canSkip = liveSkills(session).length > 0 && !card;

  return (
    <div className={`shell ${busy ? "busy" : ""}`}>
      <div className="main">
        <header className="goal-header">
          <div>
            <Link className="brand-link" href="/" onClick={() => clearSession()}>
              Stand
            </Link>
            <p className="goal-line">{session.goal}</p>
          </div>
          <div className="path-switch" role="group" aria-label="Path">
            <button
              type="button"
              aria-pressed={session.path === "college"}
              onClick={() => override("college")}
            >
              College
            </button>
            <button
              type="button"
              aria-pressed={session.path === "life"}
              onClick={() => override("life")}
            >
              Do it now
            </button>
          </div>
        </header>

        <div className="stage">
          {card ? (
            <CardView
              card={card}
              busy={busy}
              speaking={speaking}
              onSubmit={answer}
              onSpeak={(text) => {
                spoken.current.delete(card.id);
                void speak(text, card.id);
              }}
            />
          ) : (
            <div className="done">
              <h2>File is current.</h2>
              <p>
                A slot is live only after a real check. Hit Skip 2 days for a refresher.
                Miss rusts it. Hit keeps live.
              </p>
            </div>
          )}
          {error ? <p className="err">{error}</p> : null}
        </div>
      </div>

      <SkillsRail
        skills={session.skills}
        canSkip={canSkip}
        busy={busy}
        onSkip={() => void skip()}
        onReceipts={() => setReceipts(true)}
      />

      <ReceiptsDrawer session={session} open={receipts} onClose={() => setReceipts(false)} />
    </div>
  );
}
