import { readDb } from "@/lib/db";
import { contractLabel, dateRu, money, plannedMargin, workStatusLabel } from "@/lib/format";
import type { Contract, Income, Payment, WorkItem } from "@/lib/types";
import { NavRow } from "@/components/NavRow";

function signedMetrics(contracts: Contract[], payments: Payment[], incomes: Income[]) {
  const ids = new Set(contracts.map((c) => c.id));
  const amount = contracts.reduce((s, c) => s + c.amount, 0);
  const spent = payments
    .filter((p) => p.contractId && ids.has(p.contractId) && (p.status ?? "PENDING") === "PAID")
    .reduce((s, p) => s + p.amount, 0);
  const received = incomes.filter((i) => i.contractId && ids.has(i.contractId)).reduce((s, i) => s + i.amount, 0);
  const remainder = contracts.reduce((s, c) => {
    const got = incomes.filter((i) => i.contractId === c.id).reduce((a, i) => a + i.amount, 0);
    return s + Math.max(0, c.amount - got);
  }, 0);
  return { amount, spent, received, remainder, count: contracts.length };
}

export default async function DashboardPage() {
  const db = await readDb();
  const own = db.contracts.filter((c) => c.executionType === "OWN");
  const partial = db.contracts.filter((c) => c.executionType === "PARTIAL_SUB");
  const full = db.contracts.filter((c) => c.executionType === "FULL_SUB");
  const signed = [...own, ...partial, ...full];
  const review = (db.workItems ?? []).filter((w) => w.status !== "SIGNED" && w.status !== "REJECTED");
  const all = signedMetrics(signed, db.payments, db.incomes);
  const reviewSum = review.reduce((s, w) => s + (w.amount || 0), 0);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Свод</h1>
        <p className="mt-1 text-sm text-slate-500">Подписанные договоры и лоты на рассмотрении</p>
      </div>

      <section className="mb-10 overflow-hidden rounded-2xl bg-slate-950 text-white shadow-sm">
        <div className="border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-teal-300">Подписанные договоры</div>
          <div className="mt-1 text-lg font-semibold">Все три типа исполнения</div>
          <p className="mt-1 text-sm text-slate-400">Своими силами, частичный и полный субподряд · {all.count} шт.</p>
        </div>
        <div className="grid gap-px bg-white/10 sm:grid-cols-4">
          <HeroStat label="Сумма договоров" value={money(all.amount)} />
          <HeroStat label="Потрачено" value={money(all.spent)} />
          <HeroStat label="Получено" value={money(all.received)} />
          <HeroStat label="К поступлению" value={money(all.remainder)} accent />
        </div>
      </section>

      <ContractBlock
        title="Своими силами"
        accent="teal"
        contracts={own}
        payments={db.payments}
        incomes={db.incomes}
      />
      <ContractBlock
        title="Частичный субподряд"
        accent="amber"
        contracts={partial}
        payments={db.payments}
        incomes={db.incomes}
      />
      <ContractBlock
        title="Полный субподряд"
        accent="sky"
        contracts={full}
        payments={db.payments}
        incomes={db.incomes}
      />

      <section className="mb-4 overflow-hidden rounded-2xl border border-dashed border-amber-300 bg-amber-50/70">
        <div className="px-5 py-4 sm:px-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">На рассмотрении</div>
          <div className="mt-1 text-lg font-semibold text-amber-950">Лоты до подписания договора</div>
        </div>
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-6">
          <MiniStat label="Лотов" value={String(review.length)} />
          <MiniStat label="Сумма тендеров" value={money(reviewSum)} />
        </div>
        <div className="px-4 pb-5 sm:px-6">
          <div className="overflow-hidden rounded-xl border border-amber-200 bg-white">
            <table className="min-w-[560px] w-full text-left text-xs sm:text-sm">
              <thead className="bg-amber-50 text-amber-900/70">
                <tr>
                  {["Лоты", "Заказчик", "Сумма тендера", "Статус"].map((c) => (
                    <th key={c} className="px-4 py-3 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {review.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      Нет лотов на рассмотрении
                    </td>
                  </tr>
                ) : (
                  review.map((w: WorkItem) => (
                    <NavRow key={w.id} href={`/work?id=${encodeURIComponent(w.id)}`}>
                      <td className="px-4 py-3 font-medium">{w.lots}</td>
                      <td className="px-4 py-3">{w.customer}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{money(w.amount)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                          {workStatusLabel(w.status)}
                        </span>
                      </td>
                    </NavRow>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

const ACCENT = {
  teal: {
    wrap: "border-teal-200",
    bar: "bg-teal-500",
    head: "text-teal-900",
    chip: "bg-teal-50 text-teal-800",
  },
  amber: {
    wrap: "border-amber-200",
    bar: "bg-amber-500",
    head: "text-amber-950",
    chip: "bg-amber-50 text-amber-900",
  },
  sky: {
    wrap: "border-sky-200",
    bar: "bg-sky-500",
    head: "text-sky-950",
    chip: "bg-sky-50 text-sky-900",
  },
} as const;

function ContractBlock({
  title,
  accent,
  contracts,
  payments,
  incomes,
}: {
  title: string;
  accent: keyof typeof ACCENT;
  contracts: Contract[];
  payments: Payment[];
  incomes: Income[];
}) {
  const m = signedMetrics(contracts, payments, incomes);
  const a = ACCENT[accent];
  return (
    <section className={`mb-8 overflow-hidden rounded-2xl border bg-white shadow-sm ${a.wrap}`}>
      <div className={`h-1.5 ${a.bar}`} />
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <h2 className={`text-lg font-semibold ${a.head}`}>{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{m.count} договоров · {money(m.amount)}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`rounded-full px-2.5 py-1 font-medium ${a.chip}`}>Потрачено {money(m.spent)}</span>
          <span className={`rounded-full px-2.5 py-1 font-medium ${a.chip}`}>Получено {money(m.received)}</span>
          <span className={`rounded-full px-2.5 py-1 font-medium ${a.chip}`}>К поступлению {money(m.remainder)}</span>
        </div>
      </div>
      <div className="px-4 pb-5 sm:px-6">
        <ContractTable contracts={contracts} payments={payments} incomes={incomes} empty="Нет договоров в этой группе" />
      </div>
    </section>
  );
}

function ContractTable({
  contracts,
  payments,
  incomes,
  empty,
}: {
  contracts: Contract[];
  payments: Payment[];
  incomes: Income[];
  empty: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-[720px] w-full text-left text-xs sm:text-sm">
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
          {contracts.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                {empty}
              </td>
            </tr>
          ) : (
            contracts.map((c) => {
              const pay = payments
                .filter((p) => p.contractId === c.id && (p.status ?? "PENDING") === "PAID")
                .reduce((s, p) => s + p.amount, 0);
              const inc = incomes.filter((i) => i.contractId === c.id).reduce((s, i) => s + i.amount, 0);
              const margin = plannedMargin(c.amount, c.plannedCost);
              return (
                <NavRow key={c.id} href={`/contracts?id=${encodeURIComponent(c.id)}&from=svod`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{c.title || contractLabel(c)}</div>
                    <div className="text-xs text-slate-400">
                      {c.customer} · № {c.number} · {dateRu(c.date)}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{money(c.amount)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{money(pay)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{money(inc)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{money(Math.max(0, c.amount - inc))}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {money(margin.qty)}
                    <span className="ml-1 text-xs text-slate-400">({margin.pct.toFixed(1)}%)</span>
                  </td>
                </NavRow>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function HeroStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-slate-950 px-5 py-5 sm:px-6">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`mt-2 text-lg font-semibold tracking-tight sm:text-xl ${accent ? "text-teal-300" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-white px-4 py-3">
      <div className="text-xs text-amber-800/80">{label}</div>
      <div className="mt-1 text-lg font-semibold text-amber-950">{value}</div>
    </div>
  );
}
