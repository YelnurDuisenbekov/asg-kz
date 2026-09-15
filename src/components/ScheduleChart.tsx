"use client";

import { flattenTasks } from "@/lib/finance";
import { dateRu } from "@/lib/format";
import { parseIso, toIso } from "@/lib/deadline";
import type { Deal, ScheduleTask } from "@/lib/types";

const COLORS = ["#0f766e", "#c2410c", "#0369a1", "#7c3aed", "#be123c", "#15803d"];

function span(tasks: ReturnType<typeof flattenTasks>) {
  const dates = tasks.flatMap((t) => [parseIso(t.start), parseIso(t.end)]).filter((d): d is Date => Boolean(d));
  if (!dates.length) return null;
  const min = new Date(Math.min(...dates.map((d) => d.getTime())));
  const max = new Date(Math.max(...dates.map((d) => d.getTime())));
  if (max.getTime() <= min.getTime()) max.setDate(min.getDate() + 1);
  return { min, max, total: max.getTime() - min.getTime() };
}

function barStyle(start: string, end: string, range: NonNullable<ReturnType<typeof span>>, color: string) {
  const s = parseIso(start) ?? range.min;
  const e = parseIso(end) ?? s;
  const left = Math.max(0, ((s.getTime() - range.min.getTime()) / range.total) * 100);
  const width = Math.max(1.5, ((Math.max(e.getTime(), s.getTime()) - s.getTime()) / range.total) * 100);
  return { left: `${left}%`, width: `${width}%`, background: color };
}

export function ScheduleChart({
  groups,
}: {
  groups: { id: string; title: string; tasks: ScheduleTask[]; color?: string }[];
}) {
  const prepared = groups.map((g, gi) => ({
    ...g,
    color: g.color || COLORS[gi % COLORS.length],
    rows: flattenTasks(g.tasks).filter((t) => t.start || t.end || t.name),
  }));
  const range = span(prepared.flatMap((g) => g.rows));
  if (!prepared.some((g) => g.rows.length) || !range) {
    return <p className="px-3 py-6 text-sm text-slate-400">Нет дат в сетевом графике — укажите начало и окончание задач.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="mb-3 flex justify-between text-[11px] text-slate-500">
        <span>{dateRu(toIso(range.min))}</span>
        <span>{dateRu(toIso(range.max))}</span>
      </div>
      <div className="min-w-[560px] space-y-4">
        {prepared.map((g) => (
          <section key={g.id} className="overflow-hidden rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2" style={{ background: `${g.color}14` }}>
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: g.color }} />
              <h3 className="truncate text-sm font-semibold">{g.title}</h3>
            </div>
            <div className="space-y-1 p-2">
              {g.rows.length === 0 ? (
                <p className="px-1 py-2 text-xs text-slate-400">Нет задач с датами</p>
              ) : (
                g.rows.map((row) => (
                  <div key={row.id} className="grid grid-cols-[minmax(8rem,13rem)_1fr] items-center gap-2">
                    <div className="truncate text-xs text-slate-700" style={{ paddingLeft: row.depth * 12 }} title={row.name}>
                      {row.name || "Без названия"}
                    </div>
                    <div className="relative h-6 rounded-sm bg-slate-100">
                      <div className="absolute top-1 h-4 rounded-sm" style={barStyle(row.start, row.end, range, g.color)} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function DealSchedule({ deal }: { deal: Deal }) {
  return <ScheduleChart groups={[{ id: deal.id, title: deal.title, tasks: deal.tasks }]} />;
}
