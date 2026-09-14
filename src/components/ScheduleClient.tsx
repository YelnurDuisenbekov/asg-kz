"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteTask, saveSettings, upsertTask } from "@/lib/actions";
import { contractLabel, dateRu, daysUntil } from "@/lib/format";
import type { Contract, Settings, Task } from "@/lib/types";
import { Btn, Field, Modal, PageHeader, inputClass } from "./ui";

function statusColor(endDate: string, approachingDays: number) {
  const left = daysUntil(endDate);
  if (left < 0) return { key: "red", label: "Просрочено", bar: "bg-red-500", chip: "bg-red-100 text-red-800" };
  if (left <= approachingDays) return { key: "yellow", label: "Срок близко", bar: "bg-amber-400", chip: "bg-amber-100 text-amber-900" };
  return { key: "green", label: "По плану", bar: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-800" };
}

function toTime(iso: string) {
  return new Date(`${iso}T00:00:00`).getTime();
}

export function ScheduleClient({
  contracts,
  tasks,
  settings,
}: {
  contracts: Contract[];
  tasks: Task[];
  settings: Settings;
}) {
  const [projectId, setProjectId] = useState(contracts[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [days, setDays] = useState(String(settings.approachingDays));
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    id: "",
    contractId: projectId,
    name: "",
    assignee: "",
    startDate: "",
    endDate: "",
    notes: "",
  });

  const filtered = tasks.filter((t) => (projectId ? t.contractId === projectId : true));
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

  return (
    <>
      <PageHeader
        title="Сетевой график"
        subtitle="Задачи по каждому проекту (договору) с контролем сроков"
        action={
          <Btn
            onClick={() => {
              setForm({
                id: "",
                contractId: projectId || contracts[0]?.id || "",
                name: "",
                assignee: "",
                startDate: "",
                endDate: "",
                notes: "",
              });
              setError("");
              setOpen(true);
            }}
          >
            Добавить задачу
          </Btn>
        }
      />

      <div className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <Field label="Договор (заказчик_номер_дата_наименование)">
          <select className={inputClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Все проекты</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {contractLabel(c)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Жёлтая зона: дней до срока">
          <div className="flex gap-2">
            <input className={inputClass} type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
            <Btn
              variant="ghost"
              onClick={() => {
                const fd = new FormData();
                fd.set("approachingDays", days);
                start(() => saveSettings(fd));
              }}
            >
              Сохранить
            </Btn>
          </div>
        </Field>
        <div className="flex flex-wrap items-end gap-2 text-xs">
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">Зелёный — по плану</span>
          <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-900">Жёлтый — срок близко</span>
          <span className="rounded-full bg-red-100 px-2 py-1 text-red-800">Красный — просрочено</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <p className="px-4 py-12 text-center text-slate-400">Задач нет. Добавьте первую по выбранному проекту.</p>
        ) : (
          <div className="space-y-4 p-3 sm:min-w-[880px] sm:p-4">
            {filtered
              .slice()
              .sort((a, b) => toTime(a.startDate) - toTime(b.startDate))
              .map((t) => {
                const st = statusColor(t.endDate, settings.approachingDays);
                const left = ((toTime(t.startDate) - range.min) / span) * 100;
                const width = Math.max(((toTime(t.endDate) - toTime(t.startDate)) / span) * 100, 2);
                const c = contracts.find((x) => x.id === t.contractId);
                return (
                  <div
                    key={t.id}
                    className="grid cursor-pointer gap-2 rounded-lg px-1 py-1 hover:bg-slate-50 sm:grid-cols-[220px_1fr_150px] sm:items-center sm:gap-3"
                    onClick={() => {
                      setForm({ ...t });
                      setError("");
                      setOpen(true);
                    }}
                  >
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-slate-500">
                        {t.assignee} · {c ? c.number : ""} · {dateRu(t.startDate)}–{dateRu(t.endDate)}
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
                        className="min-h-11 px-2 text-sm text-red-600 sm:min-h-0 sm:text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          start(() => deleteTask(t.id));
                        }}
                      >
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
          <div className="sm:col-span-2">
            <Field label="Договор (заказчик_номер_дата_наименование)">
              <select className={inputClass} value={form.contractId} onChange={(e) => setForm({ ...form, contractId: e.target.value })}>
                <option value="">Выберите проект</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {contractLabel(c)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
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
              Object.entries(form).forEach(([k, v]) => fd.set(k, v));
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
    </>
  );
}
