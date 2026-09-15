"use client";

import { useState } from "react";
import { deletePayment, setPaymentStatus, upsertPayment } from "@/lib/actions";
import { contractLabel, dateRu, money, paymentStatusLabel } from "@/lib/format";
import { dueDate, toIso } from "@/lib/deadline";
import { EXPENSE_TYPES, expenseLabel } from "@/lib/finance";
import type { Deal, ExpenseType, NamedItem, Payment } from "@/lib/types";
import { DeadlineField, DocsField, Field, MoneyInput, NamedSelect, inputClass } from "./fields";
import { DealPicker } from "./DealLedger";
import { showNotice } from "./ChangeNotice";

const TH = "whitespace-nowrap px-3 py-2 text-left text-[11px] font-medium text-slate-500";
const TD = "px-3 py-2 text-sm text-slate-700";

export function PaymentsClient({
  payments,
  deals,
  counterparties,
}: {
  payments: Payment[];
  deals: Deal[];
  counterparties: NamedItem[];
}) {
  const [open, setOpen] = useState(false);
  const [expenseType, setExpenseType] = useState<ExpenseType>("MATERIALS");
  const dealMap = Object.fromEntries(deals.map((d) => [d.id, d]));
  const paid = payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Расходы</h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Согласование директора, затем оплата бухгалтером · оплачено {money(paid)}
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="min-h-9 bg-slate-900 px-3 text-sm font-semibold text-white">
          Добавить платёж
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className={TH}>Договор</th>
                <th className={TH}>Тип</th>
                <th className={TH}>Контрагент</th>
                <th className={TH}>Назначение</th>
                <th className={TH}>Сумма</th>
                <th className={TH}>Срок</th>
                <th className={TH}>Статус</th>
                <th className={TH}></th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-slate-400" colSpan={8}>
                    Реестр пуст
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const deal = dealMap[p.dealId];
                  const due = dueDate(p.due);
                  return (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className={`${TD} min-w-[14rem] font-medium`}>
                        {deal ? contractLabel(deal) : "Договор удалён"}
                      </td>
                      <td className={`${TD} whitespace-nowrap`}>{expenseLabel(p.expenseType)}</td>
                      <td className={TD}>{p.counterparty}</td>
                      <td className={TD}>{p.purpose}</td>
                      <td className={`${TD} whitespace-nowrap font-medium tabular-nums`}>{money(p.amount)}</td>
                      <td className={`${TD} whitespace-nowrap tabular-nums`}>{due ? dateRu(toIso(due)) : "—"}</td>
                      <td className={`${TD} whitespace-nowrap`}>{paymentStatusLabel(p.status)}</td>
                      <td className={`${TD} whitespace-nowrap`}>
                        <div className="flex flex-wrap gap-2">
                          {p.status === "PENDING" ? (
                            <button
                              className="text-sm font-medium text-slate-800 underline"
                              onClick={async () => {
                                const res = await setPaymentStatus(p.id, "APPROVED");
                                if (res && "changes" in res && res.changes) showNotice(res.changes);
                              }}
                            >
                              Согласовать
                            </button>
                          ) : null}
                          {p.status === "APPROVED" ? (
                            <button
                              className="text-sm font-medium text-slate-800 underline"
                              onClick={async () => {
                                const res = await setPaymentStatus(p.id, "PAID");
                                if (res && "changes" in res && res.changes) showNotice(res.changes);
                              }}
                            >
                              Оплачено
                            </button>
                          ) : null}
                          <button
                            className="text-sm text-red-800"
                            onClick={async () => {
                              await deletePayment(p.id);
                              showNotice(["Расход удалён"]);
                            }}
                          >
                            Удалить
                          </button>
                        </div>
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
        <div className="fixed inset-0 z-40 flex items-end bg-slate-900/50 p-0 sm:items-center sm:justify-center sm:p-3">
          <form
            action={async (fd) => {
              const res = await upsertPayment(fd);
              if (res && "error" in res && res.error) return;
              if (res && "changes" in res && res.changes) showNotice(res.changes);
              setOpen(false);
              setExpenseType("MATERIALS");
            }}
            className="max-h-[92vh] w-full overflow-auto bg-white p-4 sm:max-w-lg"
          >
            <h2 className="mb-4 text-lg font-semibold">Новый платёж</h2>
            <div className="grid gap-3">
              <Field label="Договор">
                <DealPicker deals={deals} name="dealId" />
              </Field>
              <Field label="Контрагент">
                <NamedSelect
                  name="counterparty"
                  kind="counterparties"
                  items={counterparties}
                  placeholder="Выберите контрагента"
                  addLabel="Добавить контрагента"
                />
              </Field>
              <Field label="Тип расхода">
                <input type="hidden" name="expenseType" value={expenseType} />
                <div className="flex flex-wrap gap-1">
                  {EXPENSE_TYPES.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setExpenseType(t.key)}
                      className={`min-h-9 flex-1 rounded-md px-2 text-xs font-medium sm:text-sm ${
                        expenseType === t.key ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Сумма платежа">
                <MoneyInput name="amount" />
              </Field>
              <Field label="Назначение платежа">
                <input name="purpose" required className={inputClass} />
              </Field>
              <DeadlineField prefix="due" label="Срок оплаты" />
              <Field label="Документ">
                <DocsField name="documents" keepName="keepDocIds" />
              </Field>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <button className="min-h-11 bg-slate-900 text-sm font-semibold text-white">Отправить на согласование</button>
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
