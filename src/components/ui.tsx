"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Свод" },
  { href: "/work", label: "В работе" },
  { href: "/contracts", label: "Договоры" },
  { href: "/payments", label: "Платежи" },
  { href: "/income", label: "Доходы" },
  { href: "/schedule", label: "Сетевой график" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "";
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    setMenu(false);
  }, [path]);

  const links = NAV.map((item) => {
    const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMenu(false)}
        className={`block rounded-lg px-3 py-3 text-sm font-medium lg:py-2.5 ${
          active ? "bg-teal-500 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
        }`}
      >
        {item.label}
      </Link>
    );
  });

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-slate-950 px-4 py-3 text-white lg:hidden">
        <button
          type="button"
          aria-label="Открыть меню"
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/10"
          onClick={() => setMenu(true)}
        >
          <span className="sr-only">Меню</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-teal-300">ASG.KZ</div>
          <div className="truncate text-sm font-semibold">Контроль проектов</div>
        </div>
      </header>

      {menu ? (
        <button
          type="button"
          aria-label="Закрыть меню"
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setMenu(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,86vw)] flex-col border-r border-slate-200 bg-slate-950 text-white transition-transform duration-200 lg:translate-x-0 ${
          menu ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-5">
          <div>
            <div className="text-xs font-semibold uppercase text-teal-300">ASG.KZ</div>
            <div className="mt-1 text-lg font-semibold leading-snug">Контроль проектов</div>
          </div>
          <button type="button" className="rounded-lg p-2 text-slate-300 lg:hidden" onClick={() => setMenu(false)} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" suppressHydrationWarning>
          {links}
        </nav>
      </aside>
      <div className="lg:pl-72">
        <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">{children}</main>
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
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="w-full shrink-0 sm:w-auto [&_button]:w-full sm:[&_button]:w-auto">{action}</div> : null}
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
      className={`min-h-11 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50 sm:py-2 ${cls}`}
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
    <div className="fixed inset-0 z-50 flex items-stretch justify-center overflow-y-auto bg-slate-950/50 p-0 sm:items-start sm:p-6">
      <div className="flex h-full max-h-none w-full max-w-2xl flex-col rounded-none bg-white shadow-xl sm:my-8 sm:h-auto sm:max-h-[90vh] sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="pr-4 text-base font-semibold sm:text-lg">{title}</h2>
          <button onClick={onClose} className="flex h-11 w-11 items-center justify-center text-slate-400 hover:text-slate-700 sm:h-auto sm:w-auto" type="button">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-5 sm:px-6">{children}</div>
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
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 sm:py-2 sm:text-sm";

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

export function CreatableMultiSelect({
  values,
  options,
  onChange,
  onCreate,
  createLabel,
  placeholder = "Выберите",
}: {
  values: string[];
  options: { value: string; label: string }[];
  onChange: (values: string[]) => void;
  onCreate: (name: string) => Promise<void> | void;
  createLabel: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const selected = options.filter((o) => values.includes(o.value));
  const label = selected.map((o) => o.label).join(", ") || placeholder;

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
  }

  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  }

  return (
    <div className="relative" ref={box}>
      <button type="button" className={`${inputClass} text-left`} onClick={() => setOpen((v) => !v)}>
        {label}
      </button>
      {open ? (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((o) => {
            const on = values.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                  on ? "bg-teal-50 text-teal-800" : ""
                }`}
                onClick={() => toggle(o.value)}
              >
                {on ? "✓ " : ""}
                {o.label}
              </button>
            );
          })}
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
    <div className="-mx-4 overflow-x-auto sm:mx-0 rounded-none border-y border-slate-200 bg-white sm:rounded-xl sm:border">
      <table className="min-w-[720px] w-full text-left text-xs sm:min-w-full sm:text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c} className="whitespace-nowrap px-3 py-3 font-medium sm:px-4">
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

export function ItemList({
  empty,
  emptyText,
  children,
}: {
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  if (empty) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-slate-400">
        {emptyText}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <ul className="divide-y divide-slate-100">{children}</ul>
    </div>
  );
}

export function ItemRow({
  onClick,
  title,
  lines,
  right,
  actions,
}: {
  onClick: () => void;
  title: string;
  lines?: React.ReactNode[];
  right?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <li className="flex items-stretch hover:bg-slate-50">
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left sm:px-4">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-slate-900">{title}</div>
          {lines?.map((line, i) => (
            <div key={i} className="mt-0.5 truncate text-xs text-slate-500">
              {line}
            </div>
          ))}
        </div>
        {right ? <div className="shrink-0 text-right text-sm text-slate-700">{right}</div> : null}
      </button>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2 pr-3 sm:pr-4">{actions}</div>
      ) : null}
    </li>
  );
}
