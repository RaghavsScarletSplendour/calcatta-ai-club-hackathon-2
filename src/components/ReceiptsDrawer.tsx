"use client";

import type { Session } from "@/lib/schema";
import { useEffect, useRef } from "react";

export function ReceiptsDrawer({
  session,
  open,
  onClose,
}: {
  session: Session;
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button className="drawer-back" aria-label="Close receipts" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="receipts-title">
        <h2 id="receipts-title">Receipts</h2>
        <p className="lede" style={{ marginTop: 0 }}>
          Cited file. Each line ends with the answer that proved it.
        </p>
        {session.moduleTitle ? (
          <p className="lede" style={{ marginTop: 0 }}>
            Module: {session.moduleTitle}
          </p>
        ) : null}
        {session.receipts?.alchemyst ? (
          <div className="badge">stored</div>
        ) : (
          <div className="badge" style={{ color: "var(--muted)", borderColor: "var(--rule)" }}>
            {session.receipts?.note || "local file"}
          </div>
        )}
        {(["stand", "landed", "promised"] as const).map((page) => (
          <section className="page-block" key={page}>
            <h3>{page}</h3>
            {session.memory[page].length ? (
              <ul>
                {session.memory[page].map((line, i) => (
                  <li key={`${page}-${i}`}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="cite">None yet.</p>
            )}
          </section>
        ))}
        <section className="page-block">
          <h3>session json</h3>
          <pre className="cite">{JSON.stringify(session, null, 2)}</pre>
        </section>
        <button ref={closeRef} className="secondary" type="button" onClick={onClose}>
          Close
        </button>
      </aside>
    </>
  );
}
