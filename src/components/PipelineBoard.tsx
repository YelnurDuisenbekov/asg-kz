"use client";

import Link from "next/link";
import { clusterLabel, dateRu, daysLeft, executionLabel, money } from "@/lib/format";
import { dealEndIso, dealFinance, EXPENSE_TYPES } from "@/lib/finance";
import type { Avr, Deal, ExecutionType, Income, Payment } from "@/lib/types";

const EXEC_GROUPS: { type: ExecutionType; tone: string; rail: string }[] = [
  { type: "OWN", tone: "bg-teal-50", rail: "bg-teal-600" },
  { type: "PARTIAL_SUB", tone: "bg-orange-50", rail: "bg-orange-500" },
  { type: "FULL_SUB", tone: "bg-sky-50", rail: "bg-sky-600" },
];

const OTHER: Deal["cluster"][] = ["CONCLUSION", "TENDER", "PRETENDER"];

const TH = "whitespace-nowrap px-2 py-2 text-left text-[11px] font-medium text-slate-500";
const TD = "whitespace-nowrap px-2 py-2 text-xs tabular-nums text-slate-700";

function contractsWord(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "договор";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "договора";
  return "договоров";
}

function daysText(deal: Deal) {
  const left = daysLeft(deal.deadline);
  if (left === null) return "—";
  if (left < 0) return `просрочено ${-left} дн.`;
  return `${left} дн.`;
}

function HeadStats({
  spent,
  got,
  rest,
  avrSum,
  avrDebt,
}: {
  spent: number;
  got: number;
  rest: number;
  avrSum?: number;
  avrDebt?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
      <div>
        <div className="text-xs text-slate-400">Потрачено</div>
        <div className="font-medium text-orange-600">{money(spent)}</div>
      </div>
      <div>
        <div className="text-xs text-slate-400">Оплатили нам</div>
        <div className="font-medium text-emerald-600">{money(got)}</div>
      </div>
      <div>
        <div className="text-xs text-slate-400">Нам должны</div>
        <div className="font-medium text-sky-700">{money(rest)}</div>
      </div>
      {avrSum !== undefined ? (
        <div>
          <div className="text-xs text-slate-400">АВР / дебиторка</div>
          <div className="font-medium text-slate-800">
            {money(avrSum)} / {money(avrDebt ?? 0)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FinanceHead() {
  return (
    <tr className="border-b border-slate-200 bg-slate-50">
      <th className={`${TH} sticky left-0 z-10 bg-slate-50`}>Вид</th>
      <th className={`${TH} sticky left-[7.5rem] z-10 bg-slate-50`}>Договор</th>
      <th className={TH}>Сумма</th>
      <th className={TH}>Заключён</th>
      <th className={TH}>Окончание</th>
      <th className={TH}>Осталось</th>
      <th className={TH}>Нам должны</th>
      <th className={TH}>Оплатили</th>
      <th className={TH}>АВР</th>
      <th className={TH}>Дебиторка</th>
      {EXPENSE_TYPES.map((t) => (
        <th key={t.key} className={TH}>
          {t.label}
        </th>
      ))}
    </tr>
  );
}

function FinanceCells({
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
  const f = dealFinance(deal, payments, incomes, avrs);
  const end = dealEndIso(deal);
  const left = daysLeft(deal.deadline);
  return (
    <>
      <td className={TD}>{money(deal.amount)}</td>
      <td className={TD}>{dateRu(deal.contractDate)}</td>
      <td className={TD}>{end ? dateRu(end) : "—"}</td>
      <td className={`${TD} ${left !== null && left < 0 ? "text-red-700" : ""}`}>{daysText(deal)}</td>
      <td className={TD}>{money(f.dueUs)}</td>
      <td className={TD}>{money(f.paid)}</td>
      <td className={TD}>
        {f.avr.count} · {money(f.avr.sum)}
      </td>
      <td className={TD}>{money(f.avrDebt)}</td>
      {EXPENSE_TYPES.map((t) => (
        <td key={t.key} className={TD}>
          {money(f.byType[t.key])}
        </td>
      ))}
    </>
  );
}

function groupTotals(items: Deal[], payments: Payment[], incomes: Income[], avrs: Avr[]) {
  return {
    spent: items.reduce((s, d) => s + dealFinance(d, payments, incomes, avrs).spent, 0),
    got: items.reduce((s, d) => s + dealFinance(d, payments, incomes, avrs).paid, 0),
    sum: items.reduce((s, d) => s + d.amount, 0),
    avrSum: items.reduce((s, d) => s + dealFinance(d, payments, incomes, avrs).avr.sum, 0),
    avrDebt: items.reduce((s, d) => s + dealFinance(d, payments, incomes, avrs).avrDebt, 0),
  };
}

export function PipelineBoard({
  deals,
  payments,
  incomes,
  avrs,
}: {
  deals: Deal[];
  payments: Payment[];
  incomes: Income[];
  avrs: Avr[];
}) {
  const exec = deals
    .filter((d) => d.cluster === "EXECUTION")
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const total = groupTotals(exec, payments, incomes, avrs);

  return (
    <div className="flex flex-col gap-4">
      <section className="overflow-hidden rounded-2xl border-2 border-slate-800 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">На исполнении</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {exec.length} {contractsWord(exec.length)} · {money(total.sum)}
            </p>
          </div>
          <HeadStats spent={total.spent} got={total.got} rest={total.sum - total.got} avrSum={total.avrSum} avrDebt={total.avrDebt} />
        </div>
        <div className="overflow-x-auto border-t border-slate-200">
          <table className="min-w-max text-sm">
            <thead>
              <FinanceHead />
            </thead>
            <tbody>
              {EXEC_GROUPS.map((g) => {
                const items = exec.filter((d) => (d.executionType || "OWN") === g.type);
                const span = Math.max(items.length, 1);
                if (!items.length) {
                  return (
                    <tr key={g.type} className={`border-t border-slate-100 ${g.tone}`}>
                      <td className="sticky left-0 z-[1] w-[7.5rem] p-0">
                        <div className="flex min-h-14 items-stretch">
                          <div className={`w-1.5 shrink-0 ${g.rail}`} />
                          <div className="flex items-center px-2 text-[11px] font-semibold leading-tight">{executionLabel(g.type)}</div>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-xs text-slate-400" colSpan={9 + EXPENSE_TYPES.length}>
                        Пусто
                      </td>
                    </tr>
                  );
                }
                return items.map((d, i) => (
                  <tr key={d.id} className={`border-t border-slate-100 ${g.tone} hover:bg-white/70`}>
                    {i === 0 ? (
                      <td rowSpan={span} className={`sticky left-0 z-[1] w-[7.5rem] p-0 align-top ${g.tone}`}>
                        <div className="flex h-full min-h-full items-stretch">
                          <div className={`w-1.5 shrink-0 ${g.rail}`} />
                          <div className="px-2 py-3 text-[11px] font-semibold leading-tight">{executionLabel(g.type)}</div>
                        </div>
                      </td>
                    ) : null}
                    <td className={`sticky left-[7.5rem] z-[1] min-w-[12rem] max-w-[16rem] bg-inherit px-2 py-2 ${g.tone}`}>
                      <Link href={`/deals/${d.id}`} className="block font-medium leading-snug text-slate-900 hover:underline">
                        {d.title}
                      </Link>
                      <div className="text-[11px] text-slate-500">
                        {d.customer}
                        {d.contractNumber ? ` · № ${d.contractNumber}` : ""}
                      </div>
                    </td>
                    <FinanceCells deal={d} payments={payments} incomes={incomes} avrs={avrs} />
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </section>

      {OTHER.map((key) => {
        const items = deals
          .filter((d) => d.cluster === key)
          .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        return (
          <section key={key} className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
            <div className="px-4 py-3">
              <h2 className="text-base font-semibold">{clusterLabel(key)}</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {items.length} {contractsWord(items.length)}
              </p>
            </div>
            <div className="overflow-x-auto border-t border-slate-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className={TH}>Договор</th>
                    <th className={TH}>Заказчик</th>
                    <th className={TH}>Сумма</th>
                    {key === "CONCLUSION" ? (
                      <>
                        <th className={TH}>Заключён</th>
                        <th className={TH}>Окончание</th>
                      </>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-sm text-slate-400" colSpan={5}>
                        Пусто
                      </td>
                    </tr>
                  ) : (
                    items.map((d) => (
                      <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="min-w-[12rem] px-2 py-2">
                          <Link href={`/deals/${d.id}`} className="font-medium text-slate-900 hover:underline">
                            {d.title}
                          </Link>
                        </td>
                        <td className={`${TD} text-slate-600`}>{d.customer}</td>
                        <td className={TD}>{money(d.amount)}</td>
                        {key === "CONCLUSION" ? (
                          <>
                            <td className={TD}>{dateRu(d.contractDate)}</td>
                            <td className={TD}>{dealEndIso(d) ? dateRu(dealEndIso(d)) : "—"}</td>
                          </>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
