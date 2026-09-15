"use client";

import { useMemo, useState } from "react";
import { ScheduleChart } from "./ScheduleChart";
import type { Deal } from "@/lib/types";

export function ScheduleBoard({ deals }: { deals: Deal[] }) {
  const withTasks = deals.filter((d) => (d.tasks?.length ?? 0) > 0);
  const [selected, setSelected] = useState<string[]>(() => withTasks.map((d) => d.id));
  const allOn = withTasks.length > 0 && selected.length === withTasks.length;

  const groups = useMemo(
    () => withTasks.filter((d) => selected.includes(d.id)).map((d) => ({ id: d.id, title: d.title, tasks: d.tasks })),
    [withTasks, selected],
  );

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Сетевой график</h1>
        <p className="mt-1 text-sm text-slate-600">Выберите все проекты или несколько договоров.</p>
      </div>
      <div className="rounded-2xl border border-slate-300 bg-white p-3">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={allOn}
            onChange={() => setSelected(allOn ? [] : withTasks.map((d) => d.id))}
          />
          Все проекты
        </label>
        <div className="grid gap-1 sm:grid-cols-2">
          {withTasks.map((d) => (
            <label key={d.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggle(d.id)} />
              <span className="truncate">{d.title}</span>
            </label>
          ))}
          {withTasks.length === 0 ? <p className="text-sm text-slate-400">Пока нет задач в графиках.</p> : null}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-300 bg-white p-3">
        <ScheduleChart groups={groups} />
      </div>
    </div>
  );
}
