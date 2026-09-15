"use client";

import { useState } from "react";
import { addNamed, deleteNamed, type NamedKind } from "@/lib/actions";
import { uniqueNames } from "@/lib/format";
import type { NamedItem } from "@/lib/types";
import { ComboList } from "./ComboList";
import { showNotice } from "./ChangeNotice";

const LISTS: { kind: NamedKind; title: string; placeholder: string; addLabel: string }[] = [
  { kind: "customers", title: "Заказчики", placeholder: "Выберите заказчика", addLabel: "Добавить заказчика" },
  { kind: "subcontractors", title: "Субподряд", placeholder: "Выберите субподряд", addLabel: "Добавить субподряд" },
  { kind: "counterparties", title: "Контрагенты", placeholder: "Выберите контрагента", addLabel: "Добавить контрагента" },
];

function DirectoryBox({
  kind,
  title,
  placeholder,
  addLabel,
  items,
}: {
  kind: NamedKind;
  title: string;
  placeholder: string;
  addLabel: string;
  items: NamedItem[];
}) {
  const [extra, setExtra] = useState<NamedItem[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const list = uniqueNames([...items, ...extra]).filter((item) => !removed.includes(item.id));

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <ComboList
        placeholder={placeholder}
        alwaysOpen
        addLabel={addLabel}
        onAdd={async (name) => {
          const res = await addNamed(kind, name);
          if (res.error || !res.item) return;
          setExtra((x) => uniqueNames([...x, res.item!]));
          if (res.changes?.length) showNotice(res.changes);
        }}
      >
        {list.length === 0 ? <div className="px-4 py-3 text-sm text-slate-400">Список пуст</div> : null}
        {list.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
            <span>{item.name}</span>
            <button
              type="button"
              className="shrink-0 text-xs text-red-700"
              onClick={async () => {
                await deleteNamed(kind, item.id);
                setRemoved((x) => [...x, item.id]);
                showNotice([`Удалено из справочника: ${item.name}`]);
              }}
            >
              Удалить
            </button>
          </div>
        ))}
      </ComboList>
    </section>
  );
}

export function ListsClient({
  customers,
  subcontractors,
  counterparties,
}: {
  customers: NamedItem[];
  subcontractors: NamedItem[];
  counterparties: NamedItem[];
}) {
  const data = { customers, subcontractors, counterparties };
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Справочники</h1>
        <p className="mt-1 text-sm text-slate-600">Заказчики, субподряд и контрагенты. Новое значение можно добавить прямо в списке.</p>
      </div>
      {LISTS.map((meta) => (
        <DirectoryBox key={meta.kind} {...meta} items={data[meta.kind]} />
      ))}
    </div>
  );
}
