"use client";

import { useMemo, useState, useTransition } from "react";
import {
  addCounterparty,
  addNamedType,
  deletePayment,
  setPaymentStatus,
  upsertPayment,
} from "@/lib/actions";
import { contractLabel, dateRu, money, paymentStatusLabel } from "@/lib/format";
import type { Contract, NamedType, Payment, Subcontractor } from "@/lib/types";
import { Btn, CreatableSelect, Field, Modal, PageHeader, Table, inputClass } from "./ui";

const EMPTY = {
  id: "",
  expenseTypeId: "exp-contract",
  contractId: "",
  counterparty: "",
  purpose: "",
  amount: "",
  dueDate: "",
};

function statusChip(status: string) {
  const label = paymentStatusLabel(status);
  const cls =
    status === "PAID"
      ? "bg-emerald-100 text-emerald-800"
      : status === "APPROVED"
        ? "bg-sky-100 text-sky-800"
        : "bg-amber-100 text-amber-900";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

export function PaymentsClient({
  payments,
  contracts,
  expenseTypes,
  counterparties,
}: {
  payments: Payment[];
  contracts: Contract[];
  expenseTypes: NamedType[];
  counterparties: Subcontractor[];
}) {
  const [types, setTypes] = useState(expenseTypes);
  const [parties, setParties] = useState(counterparties);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [keepDocs, setKeepDocs] = useState<Payment["documents"]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const typeMap = useMemo(() => Object.fromEntries(types.map((t) => [t.id, t])), [types]);
  const contractById = useMemo(() => Object.fromEntries(contracts.map((c) => [c.id, c])), [contracts]);
  const selectedType = typeMap[form.expenseTypeId];
  const byContract = selectedType?.code === "CONTRACT";

  function create() {
    setForm({ ...EMPTY, expenseTypeId: types[0]?.id ?? "" });
    setKeepDocs([]);
    setFiles(null);
    setError("");
    setOpen(true);
  }

  function edit(p: Payment) {
    setForm({
      id: p.id,
      expenseTypeId: p.expenseTypeId,
      contractId: p.contractId ?? "",
      counterparty: p.counterparty,
      purpose: p.purpose,
      amount: String(p.amount),
      dueDate: p.dueDate,
    });
    setKeepDocs(p.documents);
    setFiles(null);
    setError("");
    setOpen(true);
  }

  function submit() {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    keepDocs.forEach((d) => fd.append("keepDocIds", d.id));
    if (files) Array.from(files).forEach((f) => fd.append("documents", f));
    start(async () => {
      const res = await upsertPayment(fd);
      if (res?.error) setError(res.error);
      else setOpen(false);
    });
  }

  return (
    <>
      <PageHeader
        title="Реестр платежей"
        subtitle="Сначала согласование директором, затем оплата бухгалтером"
        action={<Btn onClick={create}>Добавить платёж</Btn>}
      />
      <Table
        columns={["Тип", "Договор", "Контрагент", "Назначение", "Сумма", "Срок", "Статус", "Документы", ""]}
      >
        {payments.length === 0 ? (
          <tr>
            <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
              Платежей пока нет
            </td>
          </tr>
        ) : (
          payments.map((p) => {
            const status = p.status ?? "PENDING";
            return (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">{typeMap[p.expenseTypeId]?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  {p.contractId && contractById[p.contractId]
                    ? contractLabel(contractById[p.contractId])
                    : "—"}
                </td>
                <td className="px-4 py-3">{p.counterparty}</td>
                <td className="px-4 py-3">{p.purpose}</td>
                <td className="px-4 py-3">{money(p.amount)}</td>
                <td className="px-4 py-3">{dateRu(p.dueDate)}</td>
                <td className="px-4 py-3">{statusChip(status)}</td>
                <td className="px-4 py-3">
                  {p.documents.map((d) => (
                    <a
                      key={d.id}
                      className="mr-2 text-teal-700 underline"
                      href={`/api/files/${encodeURIComponent(d.storedName)}`}
                    >
                      {d.originalName}
                    </a>
                  ))}
                  {p.documents.length === 0 ? "—" : null}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {status === "PENDING" ? (
                    <button
                      className="mr-3 text-sky-700"
                      onClick={() => start(() => setPaymentStatus(p.id, "APPROVED"))}
                    >
                      Согласовать
                    </button>
                  ) : null}
                  {status === "APPROVED" ? (
                    <button
                      className="mr-3 text-emerald-700"
                      onClick={() => start(() => setPaymentStatus(p.id, "PAID"))}
                    >
                      Оплатить
                    </button>
                  ) : null}
                  <button className="mr-3 text-teal-700" onClick={() => edit(p)}>
                    Изменить
                  </button>
                  <button className="text-red-600" onClick={() => start(() => deletePayment(p.id))}>
                    Удалить
                  </button>
                </td>
              </tr>
            );
          })
        )}
      </Table>

      <Modal title={form.id ? "Редактирование платежа" : "Новый платёж"} open={open} onClose={() => setOpen(false)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Тип расхода</span>
            <CreatableSelect
              value={form.expenseTypeId}
              options={types.map((t) => ({ value: t.id, label: t.name }))}
              onChange={(expenseTypeId) => setForm({ ...form, expenseTypeId })}
              createLabel="+ Добавить тип"
              onCreate={async (name) => {
                const res = await addNamedType("expense", name);
                if (res.item) {
                  setTypes((prev) => (prev.some((t) => t.id === res.item!.id) ? prev : [...prev, res.item!]));
                  setForm((f) => ({ ...f, expenseTypeId: res.item!.id }));
                }
              }}
            />
          </div>
          {byContract ? (
            <div className="sm:col-span-2">
              <Field label="Договор (заказчик_номер_дата)">
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
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Наименование контрагента</span>
            <CreatableSelect
              value={form.counterparty}
              options={parties.map((c) => ({ value: c.name, label: c.name }))}
              onChange={(counterparty) => setForm({ ...form, counterparty })}
              createLabel="+ Добавить контрагента"
              placeholder="Выберите контрагента"
              onCreate={async (name) => {
                const res = await addCounterparty(name);
                if (res.item) {
                  setParties((prev) => (prev.some((c) => c.id === res.item!.id) ? prev : [...prev, res.item!]));
                  setForm((f) => ({ ...f, counterparty: res.item!.name }));
                }
              }}
            />
          </div>
          <Field label="Сумма платежа">
            <input type="number" className={inputClass} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Назначение платежа">
              <input className={inputClass} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
            </Field>
          </div>
          <Field label="Срок оплаты">
            <input type="date" className={inputClass} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
          <Field label="Документы">
            <input type="file" multiple className={inputClass} onChange={(e) => setFiles(e.target.files)} />
          </Field>
          {keepDocs.length > 0 ? (
            <div className="sm:col-span-2 text-sm">
              Уже загружено:{" "}
              {keepDocs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="mr-2 text-teal-700 underline"
                  onClick={() => setKeepDocs(keepDocs.filter((x) => x.id !== d.id))}
                  title="Убрать из платежа"
                >
                  {d.originalName} ×
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {!form.id ? (
          <p className="mt-3 text-sm text-slate-500">После сохранения статус будет «На согласовании».</p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setOpen(false)}>
            Отмена
          </Btn>
          <Btn onClick={submit} disabled={pending}>
            Сохранить
          </Btn>
        </div>
      </Modal>
    </>
  );
}
