"use client";

import { useState } from "react";
import { deleteAvr, upsertAvr } from "@/lib/actions";
import { contractLabel, money, paymentStatusLabel } from "@/lib/format";
import { expenseLabel } from "@/lib/finance";
import type { Avr, Deal, Income, Payment } from "@/lib/types";
import { ComboList, ComboOption } from "./ComboList";
import { DocsField, Field, MoneyInput, inputClass } from "./fields";
import { showNotice } from "./ChangeNotice";

const box = "border border-slate-300 bg-white p-4";

export function DealLedger({
  deal,
  payments,
  incomes,
  avrs,
}: {
  deal: Deal;
  payments: Payment[];
  incomes: Income[];
  avrs: Avr[];
}) {
  const spent = payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  const got = incomes.reduce((s, p) => s + p.amount, 0);
  const avrSum = avrs.reduce((s, a) => s + a.amount, 0);

  return (
    <div className="mt-3 flex flex-col gap-3">
      <div className={box}>
        <Row k="Сумма договора" v={money(deal.amount)} />
        <Row k="Нам должны" v={money(Math.max(0, deal.amount - got))} />
        <Row k="Оплатили" v={money(got)} />
        <Row k="АВР направлено" v={`${avrs.length} шт. · ${money(avrSum)}`} />
        <Row k="Дебиторка АВР − оплачено" v={money(Math.max(0, avrSum - got))} />
        <Row k="Расходы по реестру" v={money(spent)} />
      </div>

      <section className={box}>
        <h3 className="mb-3 text-base font-semibold">Поступления</h3>
        <p className="mb-3 text-sm text-slate-500">Доходы добавляются во вкладке «Доходы».</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] text-slate-500">
                <th className="py-1.5 pr-3 font-medium">Дата</th>
                <th className="py-1.5 pr-3 font-medium">Назначение</th>
                <th className="py-1.5 font-medium">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {incomes.length === 0 ? (
                <tr>
                  <td className="py-2 text-slate-400" colSpan={3}>
                    Поступлений ещё нет
                  </td>
                </tr>
              ) : (
                incomes.map((i) => (
                  <tr key={i.id} className="border-t border-slate-100">
                    <td className="py-1.5 pr-3 tabular-nums">{i.date}</td>
                    <td className="py-1.5 pr-3">{i.purpose}</td>
                    <td className="py-1.5 font-medium tabular-nums">{money(i.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={box}>
        <h3 className="mb-3 text-base font-semibold">Расходы</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] text-slate-500">
                <th className="py-1.5 pr-3 font-medium">Тип</th>
                <th className="py-1.5 pr-3 font-medium">Контрагент</th>
                <th className="py-1.5 pr-3 font-medium">Назначение</th>
                <th className="py-1.5 pr-3 font-medium">Сумма</th>
                <th className="py-1.5 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td className="py-2 text-slate-400" colSpan={5}>
                    Платежей ещё нет. Их заводят во вкладке «Расходы».
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-1.5 pr-3">{expenseLabel(p.expenseType)}</td>
                    <td className="py-1.5 pr-3">{p.counterparty}</td>
                    <td className="py-1.5 pr-3">{p.purpose}</td>
                    <td className="py-1.5 pr-3 font-medium tabular-nums">{money(p.amount)}</td>
                    <td className="py-1.5 text-slate-500">{paymentStatusLabel(p.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={box}>
        <h3 className="mb-1 text-base font-semibold">АВР</h3>
        <p className="mb-4 text-sm text-slate-500">Выставленные акты. Добавляет ПТО.</p>
        <ul className="mb-4 divide-y divide-slate-100 text-sm">
          {avrs.map((a) => (
            <li key={a.id} className="py-2">
              <div>
                № {a.number} · {a.date}
              </div>
              <div className="font-medium">{money(a.amount)}</div>
              <button
                type="button"
                className="text-red-800"
                onClick={async () => {
                  await deleteAvr(a.id);
                  showNotice([`Удалён АВР № ${a.number}`]);
                }}
              >
                Удалить
              </button>
            </li>
          ))}
          {avrs.length === 0 ? <li className="py-2 text-slate-400">Актов пока нет</li> : null}
        </ul>
        <form
          action={async (fd) => {
            const res = await upsertAvr(fd);
            if (res.changes) showNotice(res.changes);
          }}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="dealId" value={deal.id} />
          <Field label="Номер">
            <input name="number" required className={inputClass} />
          </Field>
          <Field label="Дата">
            <input type="date" name="date" required className={inputClass} />
          </Field>
          <Field label="Сумма">
            <MoneyInput name="amount" />
          </Field>
          <Field label="Документ">
            <DocsField name="documents" keepName="keepDocIds" />
          </Field>
          <button className="min-h-11 rounded-md bg-slate-900 text-sm font-medium text-white">Добавить АВР</button>
        </form>
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="border-b border-slate-100 py-2 last:border-0">
      <div className="text-xs text-slate-500">{k}</div>
      <div className="font-semibold">{v}</div>
    </div>
  );
}

export function DealPicker({ deals, name }: { deals: Deal[]; name: string }) {
  const list = deals.filter((d) => d.cluster === "EXECUTION");
  const options = list.length ? list : deals.filter((d) => d.cluster === "CONCLUSION");
  const [value, setValue] = useState("");
  const selected = options.find((d) => d.id === value);
  return (
    <>
      <input type="hidden" name={name} value={value} required />
      <ComboList placeholder="Выберите договор" summary={selected ? contractLabel(selected) : ""}>
        {options.length === 0 ? <div className="px-4 py-3 text-sm text-slate-400">Нет договоров на исполнении</div> : null}
        {options.map((d) => (
          <ComboOption key={d.id} active={value === d.id} onClick={() => setValue(d.id)}>
            {contractLabel(d)}
          </ComboOption>
        ))}
      </ComboList>
    </>
  );
}
