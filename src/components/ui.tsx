"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Свод" },
  { href: "/contracts", label: "Договоры" },
  { href: "/payments", label: "Платежи" },
  { href: "/income", label: "Доходы" },
  { href: "/schedule", label: "Сетевой график" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "";
  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-slate-200 bg-slate-950 text-white">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="text-xs font-semibold uppercase text-teal-300">ASG.KZ</div>
          <div className="mt-1 text-lg font-semibold leading-snug">Контроль проектов</div>
        </div>
        <nav className="flex-1 space-y-1 p-3" suppressHydrationWarning>
          {NAV.map((item) => {
            const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                  active ? "bg-teal-500 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="pl-72">
        <main className="mx-auto max-w-7xl px-8 py-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Btn({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  const cls =
    variant === "primary"
      ? "bg-teal-600 text-white hover:bg-teal-700"
      : variant === "danger"
        ? "bg-red-600 text-white hover:bg-red-700"
        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}

export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-6">
      <div className="my-8 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" type="button">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

export function FileUpload({
  label,
  files,
  onChange,
  existing,
  onRemoveExisting,
}: {
  label: string;
  files: File[];
  onChange: (files: File[]) => void;
  existing?: { id: string; originalName: string }[];
  onRemoveExisting?: (id: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        ref={ref}
        type="file"
        multiple
        className="sr-only"
        onChange={(e) => {
          const next = Array.from(e.target.files ?? []);
          onChange([...files, ...next]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex w-full items-center justify-center rounded-xl border-2 border-dashed border-teal-300 bg-teal-50 px-4 py-4 text-sm font-medium text-teal-800 hover:bg-teal-100"
      >
        Добавить файл
      </button>
      {files.map((f, i) => (
        <div key={`${f.name}-${i}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="truncate">{f.name}</span>
          <button type="button" className="ml-3 text-red-600" onClick={() => onChange(files.filter((_, j) => j !== i))}>
            Убрать
          </button>
        </div>
      ))}
      {(existing ?? []).map((d) => (
        <div key={d.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="truncate">{d.originalName}</span>
          <button type="button" className="ml-3 text-red-600" onClick={() => onRemoveExisting?.(d.id)}>
            Убрать
          </button>
        </div>
      ))}
    </div>
  );
}

export function CreatableSelect({
  value,
  options,
  onChange,
  onCreate,
  createLabel,
  placeholder = "Выберите",
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  onCreate: (name: string) => Promise<void> | void;
  createLabel: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function hide(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
        setDraft("");
      }
    }
    document.addEventListener("mousedown", hide);
    return () => document.removeEventListener("mousedown", hide);
  }, []);

  async function create() {
    const name = draft.trim();
    if (!name) return;
    await onCreate(name);
    setDraft("");
    setAdding(false);
    setOpen(false);
  }

  return (
    <div className="relative" ref={box}>
      <button type="button" className={`${inputClass} text-left`} onClick={() => setOpen((v) => !v)}>
        {selected?.label || placeholder}
      </button>
      {open ? (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                o.value === value ? "bg-teal-50 text-teal-800" : ""
              }`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
                setAdding(false);
              }}
            >
              {o.label}
            </button>
          ))}
          <div className="border-t border-slate-100 px-2 py-2">
            {adding ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  className={inputClass}
                  placeholder="Новое наименование"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void create();
                    }
                  }}
                />
                <button type="button" className="shrink-0 rounded-lg bg-teal-600 px-3 text-sm text-white" onClick={() => void create()}>
                  OK
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="w-full rounded-md px-2 py-1.5 text-left text-sm font-medium text-teal-700 hover:bg-teal-50"
                onClick={() => setAdding(true)}
              >
                {createLabel}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Table({
  columns,
  children,
}: {
  columns: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}
