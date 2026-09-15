"use client";

import { useEffect, useRef, useState } from "react";

export function ComboList({
  placeholder,
  summary,
  addLabel,
  onAdd,
  alwaysOpen,
  closeOnSelect,
  children,
}: {
  placeholder: string;
  summary?: string;
  addLabel?: string;
  onAdd?: (name: string) => Promise<void> | void;
  alwaysOpen?: boolean;
  closeOnSelect?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!alwaysOpen);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (alwaysOpen) return;
    function close(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [alwaysOpen]);

  async function submitAdd() {
    const name = draft.trim();
    if (!name || !onAdd) return;
    await onAdd(name);
    setDraft("");
    setAdding(false);
  }

  return (
    <div ref={root} className="overflow-hidden rounded-xl border-2 border-teal-500 bg-white">
      {alwaysOpen ? (
        <div className="min-h-11 px-4 py-2.5 text-sm text-slate-400">{placeholder}</div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-11 w-full items-center justify-between gap-3 px-4 text-left"
        >
          <span className={`truncate ${summary ? "text-slate-800" : "text-slate-400"}`}>{summary || placeholder}</span>
          <span className="text-slate-400">{open ? "▴" : "▾"}</span>
        </button>
      )}
      {open || alwaysOpen ? (
        <div className="border-t border-slate-100">
          <div
            className="max-h-56 overflow-y-auto"
            onClick={() => {
              if (!alwaysOpen && closeOnSelect !== false) setOpen(false);
            }}
          >
            {children}
          </div>
          {addLabel && onAdd ? (
            adding ? (
              <div className="flex border-t border-slate-100">
                <input
                  autoFocus
                  className="min-h-11 min-w-0 flex-1 border-0 px-4 text-base outline-none"
                  value={draft}
                  placeholder={addLabel}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitAdd();
                    }
                  }}
                />
                <button type="button" onClick={submitAdd} className="px-3 text-sm font-medium text-teal-700">
                  Добавить
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-medium text-teal-700"
                onClick={() => setAdding(true)}
              >
                + {addLabel}
              </button>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ComboOption({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-4 py-2.5 text-left text-sm ${active ? "bg-teal-50 font-medium text-teal-900" : "text-slate-800 hover:bg-slate-50"}`}
    >
      {children}
    </button>
  );
}
