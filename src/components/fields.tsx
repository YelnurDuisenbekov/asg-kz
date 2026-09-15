"use client";

import { useMemo, useState } from "react";
import { addNamed } from "@/lib/actions";
import { formatMoneyInput, parseMoney, uniqueNames } from "@/lib/format";
import { showNotice } from "./ChangeNotice";
import type { Deadline, DeadlineMode, Doc, NamedItem } from "@/lib/types";
import { ComboList, ComboOption } from "./ComboList";

export function Field({
  label,
  hint,
  invalid,
  children,
}: {
  label: string;
  hint?: string;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={invalid ? "rounded-md border border-red-500 bg-red-50 p-3" : ""}>
      <div className={`mb-1 text-sm font-medium ${invalid ? "text-red-800" : "text-slate-700"}`}>{label}</div>
      {invalid ? <div className="mb-1.5 text-sm text-red-700">Заполните поле «{label}»</div> : null}
      {children}
      {hint && !invalid ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export const inputClass =
  "w-full min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";

export function MoneyInput({ name, defaultValue = 0 }: { name: string; defaultValue?: number }) {
  const [text, setText] = useState(() => (defaultValue ? formatMoneyInput(defaultValue) : ""));
  const parsed = parseMoney(text);
  return (
    <div className="relative">
      <input type="hidden" name={name} value={String(parsed)} />
      <input
        inputMode="decimal"
        className={`${inputClass} pr-10`}
        value={text}
        placeholder="0,00"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => setText(text.trim() ? formatMoneyInput(text) : "")}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₸</span>
    </div>
  );
}

export function DeadlineField({
  prefix,
  label,
  value,
  invalid,
}: {
  prefix: string;
  label: string;
  value?: Deadline;
  invalid?: boolean;
}) {
  const [mode, setMode] = useState<DeadlineMode>(value?.mode ?? "DATE");
  return (
    <div className={`rounded-md border bg-white p-3 ${invalid ? "border-red-500 bg-red-50" : "border-slate-300"}`}>
      <div className={`mb-2 text-sm font-medium ${invalid ? "text-red-800" : "text-slate-800"}`}>{label}</div>
      {invalid ? <div className="mb-2 text-sm text-red-700">Заполните поле «{label}»</div> : null}
      <input type="hidden" name={`${prefix}Mode`} value={mode} />
      <div className="mb-2 flex gap-1">
        {(
          [
            ["DATE", "Дата"],
            ["CALENDAR_DAYS", "Календарные"],
            ["WORKING_DAYS", "Рабочие"],
          ] as const
        ).map(([key, name]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`min-h-9 flex-1 rounded-md px-1 text-center text-xs font-medium sm:text-sm ${
              mode === key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {name}
          </button>
        ))}
      </div>
      {mode === "DATE" ? (
        <input type="date" name={`${prefix}Date`} defaultValue={value?.date ?? ""} className={inputClass} />
      ) : (
        <input
          type="number"
          min={0}
          name={`${prefix}Days`}
          defaultValue={value?.days ?? ""}
          placeholder="Количество дней"
          className={inputClass}
        />
      )}
    </div>
  );
}

export function NamedSelect({
  name,
  kind,
  items,
  defaultValue = "",
  placeholder,
  addLabel,
  required = true,
}: {
  name: string;
  kind: "customers" | "counterparties" | "subcontractors";
  items: NamedItem[];
  defaultValue?: string;
  placeholder: string;
  addLabel?: string;
  required?: boolean;
}) {
  const sorted = useMemo(() => uniqueNames(items), [items]);
  const [value, setValue] = useState(defaultValue);
  const [extra, setExtra] = useState<NamedItem[]>([]);
  const list = uniqueNames([...sorted, ...extra]);

  return (
    <>
      <input type="hidden" name={name} value={value} required={required} />
      <ComboList
        placeholder={placeholder}
        summary={value}
        addLabel={addLabel ?? "Добавить"}
        onAdd={async (draft) => {
          const res = await addNamed(kind, draft);
          if (res.error || !res.item) return;
          setExtra((x) => uniqueNames([...x, res.item!]));
          setValue(res.item.name);
          if (res.changes?.length) showNotice(res.changes);
        }}
      >
        {list.length === 0 ? <div className="px-4 py-3 text-sm text-slate-400">Список пуст</div> : null}
        {list.map((item) => (
          <ComboOption key={item.id} active={value === item.name} onClick={() => setValue(item.name)}>
            {item.name}
          </ComboOption>
        ))}
      </ComboList>
    </>
  );
}

export function NamedChecklist({
  name,
  kind,
  items,
  selected,
  onToggle,
  onCreated,
  placeholder,
  addLabel,
}: {
  name: string;
  kind: "customers" | "counterparties" | "subcontractors";
  items: NamedItem[];
  selected: string[];
  onToggle: (id: string, on: boolean) => void;
  onCreated: (item: NamedItem) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  const list = uniqueNames(items);
  const summary = list
    .filter((item) => selected.includes(item.id))
    .map((item) => item.name)
    .join(", ");

  return (
    <>
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      <ComboList
        placeholder={placeholder ?? "Выберите из списка"}
        summary={summary}
        addLabel={addLabel ?? "Добавить"}
        closeOnSelect={false}
        onAdd={async (draft) => {
          const res = await addNamed(kind, draft);
          if (res.error || !res.item) return;
          onCreated(res.item);
          if (res.changes?.length) showNotice(res.changes);
        }}
      >
        {list.length === 0 ? <div className="px-4 py-3 text-sm text-slate-400">Список пуст</div> : null}
        {list.map((item) => {
          const on = selected.includes(item.id);
          return (
            <ComboOption key={item.id} active={on} onClick={() => onToggle(item.id, !on)}>
              {on ? "☑ " : "☐ "}
              {item.name}
            </ComboOption>
          );
        })}
      </ComboList>
    </>
  );
}

export function DocsField({
  name,
  existing = [],
  keepName,
}: {
  name: string;
  existing?: Doc[];
  keepName: string;
}) {
  return (
    <div className="space-y-2">
      {existing.map((doc) => (
        <label key={doc.id} className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name={keepName} value={doc.id} defaultChecked className="size-4 rounded" />
          <a className="underline" href={`/api/files/${encodeURIComponent(doc.storedName)}`}>
            {doc.originalName}
          </a>
        </label>
      ))}
      <input type="file" name={name} multiple className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1`} />
    </div>
  );
}
