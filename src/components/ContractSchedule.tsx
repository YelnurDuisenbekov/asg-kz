"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteTask, upsertTask } from "@/lib/actions";
import { dateRu, daysUntil } from "@/lib/format";
import type { Task } from "@/lib/types";
import { Btn, Field, Modal, inputClass } from "./ui";

function statusColor(endDate: string, approachingDays: number) {
  const left = daysUntil(endDate);
  if (left < 0) return { label: "Просрочено", bar: "bg-red-500", chip: "bg-red-100 text-red-800" };
  if (left <= approachingDays) {
    return { label: "Срок близко", bar: "bg-amber-400", chip: "bg-amber-100 text-amber-900" };
  }
  return { label: "По плану", bar: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-800" };
}

function toTime(iso: string) {
  return new Date(`${iso}T00:00:00`).getTime();
}

const EMPTY_TASK = {
  id: "",
  name: "",
  assignee: "",
  startDate: "",
  endDate: "",
  notes: "",
};

export function ContractSchedule({
  contractId,
  tasks,
  approachingDays,
}: {
  contractId: string;
  tasks: Task[];
  approachingDays: number;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [form, setForm] = useState(EMPTY_TASK);
  const filtered = tasks.filter((t) => t.contractId === contractId);
  const range = useMemo(() => {
    if (filtered.length === 0) {
      const now = Date.now();
      return { min: now, max: now + 30 * 86400000 };
    }
    const starts = filtered.map((t) => toTime(t.startDate));
    const ends = filtered.map((t) => toTime(t.endDate));
    return { min: Math.min(...starts), max: Math.max(...ends, Date.now()) };
  }, [filtered]);
  const span = Math.max(range.max - range.min, 86400000);

  function create() {
    setForm(EMPTY_TASK);
    setError("");
    setOpen(true);
  }

  return (
    <section className="mt-8 border-t border-slate-200 pt-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Сетевой график</h2>
          <p className="mt-1 text-sm text-slate-500">Задачи только по этому договору</p>
        </div>
        <Btn onClick={create}>Добавить задачу</Btn>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-slate-400">Задач пока нет</p>
        ) : (
          <div className="space-y-4 p-3 sm:min-w-[720px] sm:p-4">
            {filtered
              .slice()
              .sort((a, b) => toTime(a.startDate) - toTime(b.startDate))
              .map((t) => {
                const st = statusColor(t.endDate, approachingDays);
                const left = ((toTime(t.startDate) - range.min) / span) * 100;
                const width = Math.max(((toTime(t.endDate) - toTime(t.startDate)) / span) * 100, 2);
                return (
                  <div key={t.id} className="grid gap-2 sm:grid-cols-[200px_1fr_140px] sm:items-center sm:gap-3">
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-slate-500">
                        {t.assignee || "—"} · {dateRu(t.startDate)}–{dateRu(t.endDate)}
                      </div>
                    </div>
                    <div className="relative h-8 rounded-md bg-slate-100">
                      <div
                        className={`absolute top-1 h-6 rounded-md ${st.bar}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={st.label}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${st.chip}`}>{st.label}</span>
                      <button
                        className="text-sm text-teal-700"
                        onClick={() => {
                          setForm({
                            id: t.id,
                            name: t.name,
                            assignee: t.assignee,
                            startDate: t.startDate,
                            endDate: t.endDate,
                            notes: t.notes,
                          });
                          setError("");
                          setOpen(true);
                        }}
                      >
                        Изменить
                      </button>
                      <button className="text-sm text-red-600" onClick={() => start(() => deleteTask(t.id))}>
                        Удалить
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <Modal title={form.id ? "Редактирование задачи" : "Новая задача"} open={open} onClose={() => setOpen(false)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Задача">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Ответственный за исполнение">
            <input className={inputClass} value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} />
          </Field>
          <Field label="Начало">
            <input type="date" className={inputClass} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>
          <Field label="Срок окончания">
            <input type="date" className={inputClass} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Примечание">
              <textarea className={inputClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Btn variant="ghost" onClick={() => setOpen(false)}>
            Отмена
          </Btn>
          <Btn
            disabled={pending}
            onClick={() => {
              const fd = new FormData();
              fd.set("id", form.id);
              fd.set("contractId", contractId);
              fd.set("name", form.name);
              fd.set("assignee", form.assignee);
              fd.set("startDate", form.startDate);
              fd.set("endDate", form.endDate);
              fd.set("notes", form.notes);
              start(async () => {
                const res = await upsertTask(fd);
                if (res?.error) setError(res.error);
                else setOpen(false);
              });
            }}
          >
            Сохранить
          </Btn>
        </div>
      </Modal>
    </section>
  );
}
