"use client";

import { addCustomer } from "@/lib/actions";
import type { Subcontractor } from "@/lib/types";
import { CreatableSelect } from "./ui";

export function CustomerSelect({
  value,
  customers,
  onChange,
  onAdded,
}: {
  value: string;
  customers: Subcontractor[];
  onChange: (name: string) => void;
  onAdded: (item: Subcontractor) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-slate-700">Заказчик</span>
      <CreatableSelect
        value={value}
        options={customers.map((c) => ({ value: c.name, label: c.name }))}
        onChange={onChange}
        createLabel="+ Добавить заказчика"
        placeholder="Выберите заказчика"
        onCreate={async (name) => {
          const res = await addCustomer(name);
          if (res.item) {
            onAdded(res.item);
            onChange(res.item.name);
          }
        }}
      />
    </div>
  );
}
