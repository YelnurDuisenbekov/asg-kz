import { readDb } from "@/lib/db";
import { contractLabel, dateRu, money, plannedIncomeAmount, plannedMargin } from "@/lib/format";

export default function DashboardPage() {
  const db = readDb();
  const spent = db.payments.filter((p) => (p.status ?? "PENDING") === "PAID").reduce((s, p) => s + p.amount, 0);
  const received = db.incomes.reduce((s, i) => s + i.amount, 0);
  const planned = db.plannedIncomes.reduce((s, p) => {
    const c = db.contracts.find((x) => x.id === p.contractId);
    return s + plannedIncomeAmount(c?.amount ?? 0, p.mode, p.value);
  }, 0);
  const contractRemainder = db.contracts.reduce((s, c) => {
    const got = db.incomes.filter((i) => i.contractId === c.id).reduce((a, i) => a + i.amount, 0);
    return s + Math.max(0, c.amount - got);
  }, 0);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Свод по договорам</h1>
        <p className="mt-1 text-sm text-slate-500">Потрачено, получено и ожидаемые поступления</p>
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card title="Потрачено" value={money(spent)} hint="Оплаченные платежи" />
        <Card title="Получено" value={money(received)} hint="Фактические доходы" />
        <Card title="Должны поступить" value={money(contractRemainder)} hint="Остаток по суммам договоров" />
      </div>
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        По графику планируемых доходов: <b className="text-slate-900">{money(planned)}</b>
      </div>
      <div className="-mx-4 overflow-x-auto sm:mx-0 rounded-none border-y border-slate-200 bg-white sm:rounded-xl sm:border">
        <table className="min-w-[640px] w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {["Договор", "Сумма", "Потрачено", "Получено", "К поступлению", "План. маржа"].map((c) => (
                <th key={c} className="px-4 py-3 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {db.contracts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Добавьте договоры, чтобы увидеть свод
                </td>
              </tr>
            ) : (
              db.contracts.map((c) => {
                const pay = db.payments
                  .filter((p) => p.contractId === c.id && (p.status ?? "PENDING") === "PAID")
                  .reduce((s, p) => s + p.amount, 0);
                const inc = db.incomes.filter((i) => i.contractId === c.id).reduce((s, i) => s + i.amount, 0);
                const m = plannedMargin(c.amount, c.plannedCost);
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{contractLabel(c)}</div>
                      <div className="text-xs text-slate-400">{dateRu(c.date)}</div>
                    </td>
                    <td className="px-4 py-3">{money(c.amount)}</td>
                    <td className="px-4 py-3">{money(pay)}</td>
                    <td className="px-4 py-3">{money(inc)}</td>
                    <td className="px-4 py-3">{money(Math.max(0, c.amount - inc))}</td>
                    <td className="px-4 py-3">
                      {money(m.qty)} ({m.pct.toFixed(1)}%)
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Card({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-xl font-semibold break-words sm:text-2xl">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{hint}</div>
    </div>
  );
}
