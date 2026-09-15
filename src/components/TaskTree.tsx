"use client";

import { useState } from "react";
import { inputClass } from "./fields";
import { ScheduleChart } from "./ScheduleChart";
import type { ScheduleTask } from "@/lib/types";

function blank(): ScheduleTask {
  return { id: crypto.randomUUID(), name: "", startDate: "", endDate: "", children: [] };
}

function TaskRow({
  task,
  depth,
  onChange,
  onRemove,
}: {
  task: ScheduleTask;
  depth: number;
  onChange: (next: ScheduleTask) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2" style={{ marginLeft: depth * 16 }}>
      <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
        <input
          className={inputClass}
          placeholder={depth ? "Подзадача" : "Задача"}
          value={task.name}
          onChange={(e) => onChange({ ...task, name: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className={inputClass} value={task.startDate} onChange={(e) => onChange({ ...task, startDate: e.target.value })} />
          <input type="date" className={inputClass} value={task.endDate} onChange={(e) => onChange({ ...task, endDate: e.target.value })} />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="min-h-8 text-left text-sm font-medium text-slate-700"
            onClick={() => onChange({ ...task, children: [...task.children, blank()] })}
          >
            + подзадача
          </button>
          <button type="button" className="min-h-8 text-left text-sm text-red-800" onClick={onRemove}>
            Удалить
          </button>
        </div>
      </div>
      {task.children.map((child, i) => (
        <TaskRow
          key={child.id}
          task={child}
          depth={depth + 1}
          onChange={(next) => {
            const children = [...task.children];
            children[i] = next;
            onChange({ ...task, children });
          }}
          onRemove={() => onChange({ ...task, children: task.children.filter((_, idx) => idx !== i) })}
        />
      ))}
    </div>
  );
}

export function TaskTree({ name, defaultTasks }: { name: string; defaultTasks: ScheduleTask[] }) {
  const [tasks, setTasks] = useState<ScheduleTask[]>(defaultTasks);
  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(tasks)} />
      {tasks.map((task, i) => (
        <TaskRow
          key={task.id}
          task={task}
          depth={0}
          onChange={(next) => setTasks(tasks.map((t, idx) => (idx === i ? next : t)))}
          onRemove={() => setTasks(tasks.filter((_, idx) => idx !== i))}
        />
      ))}
      <button type="button" onClick={() => setTasks([...tasks, blank()])} className="min-h-9 w-full rounded-md border border-slate-300 bg-white text-sm font-medium">
        Добавить задачу
      </button>
      <ScheduleChart groups={[{ id: "current", title: "График", tasks }]} />
    </div>
  );
}
