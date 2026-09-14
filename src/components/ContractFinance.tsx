import { dateRu, money, paymentStatusLabel, plannedIncomeAmount } from "@/lib/format";
import type { Income, NamedType, Payment, PlannedIncome } from "@/lib/types";

export function ContractFinance({
  contractId,
  contractAmount,
  payments,
  incomes,
  planned,
  expenseTypes,
  incomeTypes,
}: {
  contractId: string;
  contractAmount: number;
  payments: Payment[];
  incomes: Income[];
  planned: PlannedIncome[];
  expenseTypes: NamedType[];
  incomeTypes: NamedType[];
}) {
  const expMap = Object.fromEntries(expenseTypes.map((t) => [t.id, t.name]));
  const incMap = Object.fromEntries(incomeTypes.map((t) => [t.id, t.name]));
  const pays = payments.filter((p) => p.contractId === contractId);
  const facts = incomes.filter((i) => i.contractId === contractId);
  const plans = planned.filter((p) => p.contractId === contractId);
  const paid = pays.filter((p) => (p.status ?? "PENDING") === "PAID").reduce((s, p) => s + p.amount, 0);
  const payAll = pays.reduce((s, p) => s + p.amount, 0);
  const received = facts.reduce((s, i) => s + i.amount, 0);
  const plannedSum = plans.reduce((s, p) => s + plannedIncomeAmount(contractAmount, p.mode, p.value), 0);
  const rest = Math.max(0, contractAmount - received);

  return (
    <div className="mt-8 space-y-8 border-t border-slate-200 pt-6">
      <section>
        <h2 className="text-lg font-semibold">Расходы по договору</h2>
        <p className="mt-1 text-sm text-slate-500">Платежи, привязанные к этому договору</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Stat label="Всего платежей" value={money(payAll)} />
          <Stat label="Оплачено" value={money(paid)} />
          <Stat label="Не оплачено" value={money(payAll - paid)} />
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          {pays.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">Платежей по договору нет</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pays.map((p) => (
                <li key={p.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium">{p.purpose || p.counterparty || "Платёж"}</div>
                    <div className="text-xs text-slate-500">
                      {expMap[p.expenseTypeId] ?? "Тип"} · {p.counterparty || "—"} · срок {dateRu(p.dueDate)}
                    </div>
                    {p.documents.length > 0 ? (
                      <div className="mt-1 text-xs">
                        {p.documents.map((d) => (
                          <a
                            key={d.id}
                            className="mr-2 text-teal-700 underline"
                            href={`/api/files/${encodeURIComponent(d.storedName)}`}
                          >
                            {d.originalName}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-medium">{money(p.amount)}</div>
                    <div className="text-xs text-slate-500">{paymentStatusLabel(p.status ?? "PENDING")}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Поступления по договору</h2>
        <p className="mt-1 text-sm text-slate-500">Фактические доходы и план</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Stat label="Получено" value={money(received)} />
          <Stat label="План поступлений" value={money(plannedSum)} />
          <Stat label="К поступлению" value={money(rest)} />
        </div>
        <h3 className="mt-4 text-sm font-medium text-slate-700">Факт</h3>
        <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
          {facts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">Фактических поступлений нет</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {facts.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-medium">{i.purpose || incMap[i.incomeTypeId] || "Доход"}</div>
                    <div className="text-xs text-slate-500">
                      {incMap[i.incomeTypeId] ?? "Тип"} · {dateRu(i.date)}
                    </div>
                  </div>
                  <div className="shrink-0 font-medium">{money(i.amount)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <h3 className="mt-4 text-sm font-medium text-slate-700">План</h3>
        <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
          {plans.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">Плановых поступлений нет</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {plans.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-medium">{dateRu(p.receiptDate)}</div>
                    <div className="text-xs text-slate-500">
                      {p.mode === "PERCENT" ? `${p.value}% от суммы договора` : "Фиксированная сумма"}
                    </div>
                  </div>
                  <div className="shrink-0 font-medium">{money(plannedIncomeAmount(contractAmount, p.mode, p.value))}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
