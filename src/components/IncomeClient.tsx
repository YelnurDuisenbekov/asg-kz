"use client";

import { useState } from "react";
import { deleteIncome, upsertIncome } from "@/lib/actions";
import { contractLabel, dateRu, money } from "@/lib/format";
import type { Deal, Income } from "@/lib/types";
import { Field, MoneyInput, inputClass } from "./fields";
import { DealPicker } from "./DealLedger";
import { showNotice } from "./ChangeNotice";

const TH = "whitespace-nowrap px-3 py-2 text-left text-[11px] font-medium text-slate-500";
const TD = "px-3 py-2 text-sm text-slate-700";

export function IncomeClient({ incomes, deals }: { incomes: Income[]; deals: Deal[] }) {
  const [open, setOpen] = useState(false);
  const dealMap = Object.fromEntries(deals.map((d) => [d.id, d]));
  const total = incomes.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Доходы</h1>
          <p className="mt-0.5 text-sm text-slate-600">Поступления на договоры · {money(total)}</p>
        </div>
        <button onClick={() => setOpen(true)} className="min-h-9 bg-slate-900 px-3 text-sm font-semibold text-white">
          Добавить доход
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className={TH}>Договор</th>
                <th className={TH}>Дата</th>
                <th className={TH}>Назначение</th>
                <th className={TH}>Сумма</th>
                <th className={TH}></th>
              </tr>
            </thead>
            <tbody>
              {incomes.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-slate-400" colSpan={5}>
                    Доходов пока нет
                  </td>
                </tr>
              ) : (
                incomes.map((i) => {
                  const deal = dealMap[i.dealId];
                  return (
                    <tr key={i.id} className="border-t border-slate-100">
                      <td className={`${TD} min-w-[14rem] font-medium`}>
                        {deal ? contractLabel(deal) : "Договор удалён"}
                      </td>
                      <td className={`${TD} whitespace-nowrap tabular-nums`}>{dateRu(i.date)}</td>
                      <td className={TD}>{i.purpose}</td>
                      <td className={`${TD} whitespace-nowrap font-medium tabular-nums`}>{money(i.amount)}</td>
                      <td className={TD}>
                        <button
                          className="text-sm text-red-800"
                          onClick={async () => {
                            await deleteIncome(i.id);
                            showNotice(["Доход удалён"]);
                          }}
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-900/50 sm:items-center sm:justify-center sm:p-3">
          <form
            action={async (fd) => {
              const res = await upsertIncome(fd);
              if ("error" in res && res.error) return;
              if (res.changes) showNotice(res.changes);
              setOpen(false);
            }}
            className="w-full bg-white p-4 sm:max-w-lg"
          >
            <h2 className="mb-4 text-lg font-semibold">Поступление</h2>
            <div className="flex flex-col gap-3">
              <Field label="Договор">
                <DealPicker deals={deals} name="dealId" />
              </Field>
              <Field label="Сумма">
                <MoneyInput name="amount" />
              </Field>
              <Field label="Дата">
                <input type="date" name="date" required className={inputClass} />
              </Field>
              <Field label="Назначение">
                <input name="purpose" required className={inputClass} />
              </Field>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <button className="min-h-11 bg-slate-900 text-sm font-semibold text-white">Сохранить</button>
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 text-sm">
                Отмена
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
