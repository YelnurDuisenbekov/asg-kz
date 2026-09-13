"use client";

import { useMemo, useState, useTransition } from "react";
import {
  addNamedType,
  deleteIncome,
  deletePlannedIncome,
  upsertIncome,
  upsertPlannedIncome,
} from "@/lib/actions";
import { contractLabel, dateRu, money, plannedIncomeAmount } from "@/lib/format";
import type { AmountMode, Contract, Income, NamedType, PlannedIncome } from "@/lib/types";
import { Btn, Field, Modal, PageHeader, Table, inputClass } from "./ui";

export function IncomeClient({
  incomes,
  planned,
  contracts,
  incomeTypes,
}: {
  incomes: Income[];
  planned: PlannedIncome[];
  contracts: Contract[];
  incomeTypes: NamedType[];
}) {
  const [tab, setTab] = useState<"fact" | "plan">("fact");
  const [types, setTypes] = useState(incomeTypes);
  const [open, setOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [newType, setNewType] = useState("");
  const [form, setForm] = useState({
    id: "",
    incomeTypeId: types[0]?.id ?? "",
    contractId: "",
    amount: "",
    date: "",
    purpose: "",
  });
  const [plan, setPlan] = useState({
    id: "",
    contractId: "",
    receiptDate: "",
    mode: "AMOUNT" as AmountMode,
    value: "",
  });

  const typeMap = useMemo(() => Object.fromEntries(types.map((t) => [t.id, t])), [types]);
  const contractById = useMemo(() => Object.fromEntries(contracts.map((c) => [c.id, c])), [contracts]);
  const byContract = typeMap[form.incomeTypeId]?.code === "CONTRACT";

  function submitFact() {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      const res = await upsertIncome(fd);
      if (res?.error) setError(res.error);
      else setOpen(false);
    });
  }

  function submitPlan() {
    const fd = new FormData();
    Object.entries(plan).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      const res = await upsertPlannedIncome(fd);
      if (res?.error) setError(res.error);
      else setPlanOpen(false);
    });
  }

  return (
    <>
      <PageHeader
        title="Доходы"
        subtitle="Фактические поступления и план по договорам"
        action={
          tab === "fact" ? (
            <Btn
              onClick={() => {
                setForm({ id: "", incomeTypeId: types[0]?.id ?? "", contractId: "", amount: "", date: "", purpose: "" });
                setError("");
                setOpen(true);
              }}
            >
              Добавить доход
            </Btn>
          ) : (
            <Btn
              onClick={() => {
                setPlan({ id: "", contractId: "", receiptDate: "", mode: "AMOUNT", value: "" });
                setError("");
                setPlanOpen(true);
              }}
            >
              Добавить план
            </Btn>
          )
        }
      />
      <div className="mb-4 flex gap-2">
        <button
          className={`rounded-lg px-4 py-2 text-sm ${tab === "fact" ? "bg-teal-600 text-white" : "bg-white ring-1 ring-slate-200"}`}
          onClick={() => setTab("fact")}
        >
          Факт
        </button>
        <button
          className={`rounded-lg px-4 py-2 text-sm ${tab === "plan" ? "bg-teal-600 text-white" : "bg-white ring-1 ring-slate-200"}`}
          onClick={() => setTab("plan")}
        >
          Планируемый доход
        </button>
      </div>

      {tab === "fact" ? (
        <Table columns={["Тип", "Договор", "Сумма", "Дата", "Назначение", ""]}>
          {incomes.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                Доходов пока нет
              </td>
            </tr>
          ) : (
            incomes.map((i) => (
              <tr key={i.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">{typeMap[i.incomeTypeId]?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  {i.contractId && contractById[i.contractId] ? contractLabel(contractById[i.contractId]) : "—"}
                </td>
                <td className="px-4 py-3">{money(i.amount)}</td>
                <td className="px-4 py-3">{dateRu(i.date)}</td>
                <td className="px-4 py-3">{i.purpose}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    className="mr-3 text-teal-700"
                    onClick={() => {
                      setForm({
                        id: i.id,
                        incomeTypeId: i.incomeTypeId,
                        contractId: i.contractId ?? "",
                        amount: String(i.amount),
                        date: i.date,
                        purpose: i.purpose,
                      });
                      setError("");
                      setOpen(true);
                    }}
                  >
                    Изменить
                  </button>
                  <button className="text-red-600" onClick={() => start(() => deleteIncome(i.id))}>
                    Удалить
                  </button>
                </td>
              </tr>
            ))
          )}
        </Table>
      ) : (
        <Table columns={["Договор", "Дата получения", "Способ", "Значение", "Сумма к получению", ""]}>
          {planned.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                Плановых поступлений нет
              </td>
            </tr>
          ) : (
            planned.map((p) => {
              const c = contractById[p.contractId];
              const amt = c ? plannedIncomeAmount(c.amount, p.mode, p.value) : p.value;
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{c ? contractLabel(c) : "—"}</td>
                  <td className="px-4 py-3">{dateRu(p.receiptDate)}</td>
                  <td className="px-4 py-3">{p.mode === "PERCENT" ? "Процентное" : "Количественное"}</td>
                  <td className="px-4 py-3">{p.mode === "PERCENT" ? `${p.value}%` : money(p.value)}</td>
                  <td className="px-4 py-3">{money(amt)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      className="mr-3 text-teal-700"
                      onClick={() => {
                        setPlan({
                          id: p.id,
                          contractId: p.contractId,
                          receiptDate: p.receiptDate,
                          mode: p.mode,
                          value: String(p.value),
                        });
                        setError("");
                        setPlanOpen(true);
                      }}
                    >
                      Изменить
                    </button>
                    <button className="text-red-600" onClick={() => start(() => deletePlannedIncome(p.id))}>
                      Удалить
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </Table>
      )}

      <Modal title={form.id ? "Редактирование дохода" : "Новый доход"} open={open} onClose={() => setOpen(false)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <Field label="Тип дохода">
              <select
                className={inputClass}
                value={form.incomeTypeId}
                onChange={(e) => setForm({ ...form, incomeTypeId: e.target.value })}
              >
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex gap-2">
              <input
                className={inputClass}
                placeholder="Новый тип дохода"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              />
              <Btn
                variant="ghost"
                onClick={() =>
                  start(async () => {
                    const res = await addNamedType("income", newType);
                    if (res.item) {
                      setTypes((prev) => (prev.some((t) => t.id === res.item!.id) ? prev : [...prev, res.item!]));
                      setForm((f) => ({ ...f, incomeTypeId: res.item!.id }));
                      setNewType("");
                    }
                  })
                }
              >
                Добавить тип
              </Btn>
            </div>
          </div>
          {byContract ? (
            <div className="sm:col-span-2">
              <Field label="Договор номер">
                <select
                  className={inputClass}
                  value={form.contractId}
                  onChange={(e) => setForm({ ...form, contractId: e.target.value })}
                >
                  <option value="">Выберите договор</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {contractLabel(c)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ) : null}
          <Field label="Сумма">
            <input type="number" className={inputClass} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Дата">
            <input type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Назначение">
              <input className={inputClass} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
            </Field>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setOpen(false)}>
            Отмена
          </Btn>
          <Btn onClick={submitFact} disabled={pending}>
            Сохранить
          </Btn>
        </div>
      </Modal>

      <Modal title={plan.id ? "Редактирование плана" : "Планируемый доход"} open={planOpen} onClose={() => setPlanOpen(false)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Номер договора">
              <select
                className={inputClass}
                value={plan.contractId}
                onChange={(e) => setPlan({ ...plan, contractId: e.target.value })}
              >
                <option value="">Выберите договор</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {contractLabel(c)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Дата получения">
            <input
              type="date"
              className={inputClass}
              value={plan.receiptDate}
              onChange={(e) => setPlan({ ...plan, receiptDate: e.target.value })}
            />
          </Field>
          <Field label="Сумма получения">
            <div className="flex gap-2">
              <select
                className={inputClass}
                value={plan.mode}
                onChange={(e) => setPlan({ ...plan, mode: e.target.value as AmountMode })}
              >
                <option value="AMOUNT">Количественное</option>
                <option value="PERCENT">Процентное</option>
              </select>
              <input
                type="number"
                className={inputClass}
                value={plan.value}
                onChange={(e) => setPlan({ ...plan, value: e.target.value })}
                placeholder={plan.mode === "PERCENT" ? "%" : "тенге"}
              />
            </div>
          </Field>
        </div>
        {plan.contractId && contractById[plan.contractId] ? (
          <p className="mt-3 text-sm text-slate-500">
            К получению:{" "}
            {money(
              plannedIncomeAmount(
                contractById[plan.contractId].amount,
                plan.mode,
                Number(plan.value) || 0,
              ),
            )}
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setPlanOpen(false)}>
            Отмена
          </Btn>
          <Btn onClick={submitPlan} disabled={pending}>
            Сохранить
          </Btn>
        </div>
      </Modal>
    </>
  );
}
