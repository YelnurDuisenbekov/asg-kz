"use client";

import { useEffect, useState } from "react";

type Payload = { title?: string; lines: string[] };

export function showNotice(lines: string[], title = "Что изменилось") {
  const clean = lines.filter(Boolean);
  if (!clean.length) return;
  window.dispatchEvent(new CustomEvent("asg-notice", { detail: { title, lines: clean } satisfies Payload }));
}

export function ChangeNotice() {
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => {
    function onNotice(e: Event) {
      const detail = (e as CustomEvent<Payload>).detail;
      if (detail?.lines?.length) setPayload(detail);
    }
    window.addEventListener("asg-notice", onNotice);
    return () => window.removeEventListener("asg-notice", onNotice);
  }, []);

  if (!payload) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-lg">
        <h2 className="mb-3 text-base font-semibold">{payload.title}</h2>
        <ul className="max-h-72 space-y-1.5 overflow-auto text-sm text-slate-700">
          {payload.lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
        <button type="button" className="mt-4 min-h-10 w-full rounded-md bg-slate-900 text-sm font-medium text-white" onClick={() => setPayload(null)}>
          Понятно
        </button>
      </div>
    </div>
  );
}
