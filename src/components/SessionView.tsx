"use client";

import { liveSkills } from "@/lib/rules";
import { estimateCues } from "@/lib/cues";
import type { Session, WordCue } from "@/lib/schema";
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
  const [words, setWords] = useState<WordCue[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const spoken = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrl = useRef<string | null>(null);

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
    setCurrentTime(0);
    setWords(estimateCues(text, 8));
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error("tts");
      const data = (await response.json()) as {
        audio?: string;
        type?: string;
        duration?: number;
        words?: WordCue[];
      };
      if (!data.audio) throw new Error("tts");
      const bytes = Uint8Array.from(atob(data.audio), (ch) => ch.charCodeAt(0));
      const blob = new Blob([bytes], { type: data.type || "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      objectUrl.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      if (data.words?.length) setWords(data.words);
      else setWords(estimateCues(text, data.duration || 8));
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onended = () => {
        setSpeaking(false);
        setCurrentTime(audio.duration || data.duration || audio.currentTime);
      };
      await audio.play();
    } catch {
      try {
        const utter = new SpeechSynthesisUtterance(text);
        const fallback = estimateCues(text, Math.max(text.split(/\s+/).length * 0.38, 4));
        setWords(fallback);
        utter.onboundary = (event) => {
          if (event.name === "word") {
            const idx = fallback.findIndex((_, i) => {
              const start = fallback.slice(0, i).reduce((n, w) => n + w.text.length, 0);
              return event.charIndex <= start + fallback[i].text.length;
            });
            if (idx >= 0) setCurrentTime((fallback[idx].start + fallback[idx].end) / 2);
          }
        };
        utter.onend = () => {
          setSpeaking(false);
          setCurrentTime(fallback.at(-1)?.end || 1);
        };
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

  const card = session ? currentCard(session) : undefined;

  if (!session) return null;

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
            {session.moduleTitle ? (
              <p className="module-line">Module: {session.moduleTitle}</p>
            ) : null}
          </div>
        </header>

        <div className="stage">
          {card ? (
            <CardView
              card={card}
              goal={session.goal}
              busy={busy}
              speaking={speaking}
              words={words}
              currentTime={currentTime}
              onSubmit={answer}
              onSpeak={(text) => {
                spoken.current.delete(card.id);
                void speak(text, card.id);
              }}
            />
          ) : (
            <div className="done">
              <h2>That’s it for now.</h2>
              <p>
                {canSkip
                  ? "Skip two days for a short refresher on a skill you passed."
                  : "Start a new goal when you want another round."}
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
