"use client";

import { useMemo, useState, useTransition } from "react";
import { deleteContract, upsertContract, upsertSubcontractor } from "@/lib/actions";
import { contractLabel, executionLabel, money, percent, plannedMargin } from "@/lib/format";
import type { Contract, ExecutionType, PaymentDocument, Subcontractor } from "@/lib/types";
import { Btn, Field, FileUpload, Modal, PageHeader, Table, inputClass } from "./ui";

const EMPTY = {
  id: "",
  number: "",
  date: "",
  customer: "",
  executionType: "OWN" as ExecutionType,
  subcontractorIds: [] as string[],
  amount: "",
  plannedCost: "",
};

export function ContractsClient({
  contracts,
  subcontractors,
}: {
  contracts: Contract[];
  subcontractors: Subcontractor[];
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [subs, setSubs] = useState(subcontractors);
  const [newSub, setNewSub] = useState("");
  const [error, setError] = useState("");
  const [keepDocs, setKeepDocs] = useState<PaymentDocument[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [pending, start] = useTransition();
  const needsSub = form.executionType !== "OWN";
  const amount = Number(form.amount) || 0;
  const cost = Number(form.plannedCost) || 0;
  const margin = plannedMargin(amount, cost);

  function edit(c: Contract) {
    setForm({
      id: c.id,
      number: c.number,
      date: c.date,
      customer: c.customer,
      executionType: c.executionType,
      subcontractorIds: c.subcontractorIds,
      amount: String(c.amount),
      plannedCost: String(c.plannedCost),
    });
    setKeepDocs(c.documents ?? []);
    setFiles([]);
    setError("");
    setOpen(true);
  }

  function create() {
    setForm(EMPTY);
    setKeepDocs([]);
    setFiles([]);
    setError("");
    setOpen(true);
  }

  function submit() {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (k === "subcontractorIds") return;
      fd.set(k, String(v));
    });
    form.subcontractorIds.forEach((id) => fd.append("subcontractorIds", id));
    keepDocs.forEach((d) => fd.append("keepDocIds", d.id));
    files.forEach((f) => fd.append("documents", f));
    start(async () => {
      const res = await upsertContract(fd);
      if (res?.error) setError(res.error);
      else setOpen(false);
    });
  }

  function addSub() {
    start(async () => {
      const res = await upsertSubcontractor(newSub);
      if (res.item) {
        setSubs((prev) => (prev.some((s) => s.id === res.item!.id) ? prev : [...prev, res.item!]));
        setForm((f) => ({
          ...f,
          subcontractorIds: f.subcontractorIds.includes(res.item!.id)
            ? f.subcontractorIds
            : [...f.subcontractorIds, res.item!.id],
        }));
        setNewSub("");
      }
    });
  }

  const subMap = useMemo(
    () => Object.fromEntries(subs.map((s) => [s.id, s.name])),
    [subs],
  );

  return (
    <>
      <PageHeader
        title="Договоры"
        subtitle="Реестр договоров, субподряды и плановая маржа"
        action={<Btn onClick={create}>Добавить договор</Btn>}
      />
      <Table
        columns={[
          "Номер",
          "Дата",
          "Заказчик",
          "Исполнение",
          "Субподряд",
          "Сумма",
          "Себестоимость",
          "Маржа",
          "Договор",
          "",
        ]}
      >
        {contracts.length === 0 ? (
          <tr>
            <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
              Договоров пока нет
            </td>
          </tr>
        ) : (
          contracts.map((c) => {
            const m = plannedMargin(c.amount, c.plannedCost);
            return (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{c.number}</td>
                <td className="px-4 py-3">{c.date}</td>
                <td className="px-4 py-3">{c.customer}</td>
                <td className="px-4 py-3">{executionLabel(c.executionType)}</td>
                <td className="px-4 py-3 text-slate-600">
                  {c.subcontractorIds.map((id) => subMap[id] ?? id).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">{money(c.amount)}</td>
                <td className="px-4 py-3">{money(c.plannedCost)}</td>
                <td className="px-4 py-3">
                  {money(m.qty)} · {percent(m.pct)}
                </td>
                <td className="px-4 py-3">
                  {(c.documents ?? []).map((d) => (
                    <a
                      key={d.id}
                      className="mr-2 text-teal-700 underline"
                      href={`/api/files/${encodeURIComponent(d.storedName)}`}
                    >
                      {d.originalName}
                    </a>
                  ))}
                  {(c.documents ?? []).length === 0 ? "—" : null}
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="mr-3 text-teal-700" onClick={() => edit(c)}>
                    Изменить
                  </button>
                  <button className="text-red-600" onClick={() => start(() => deleteContract(c.id))}>
                    Удалить
                  </button>
                </td>
              </tr>
            );
          })
        )}
      </Table>
      <Modal
        title={form.id ? "Редактирование договора" : "Новый договор"}
        open={open}
        onClose={() => setOpen(false)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Номер договора">
            <input className={inputClass} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
          </Field>
          <Field label="Дата договора">
            <input type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Заказчик">
            <input className={inputClass} value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <FileUpload
              label="Файл договора"
              files={files}
              onChange={setFiles}
              existing={keepDocs}
              onRemoveExisting={(id) => setKeepDocs(keepDocs.filter((x) => x.id !== id))}
            />
          </div>
          <Field label="Тип исполнения">
            <select
              className={inputClass}
              value={form.executionType}
              onChange={(e) => setForm({ ...form, executionType: e.target.value as ExecutionType })}
            >
              <option value="OWN">Своими силами</option>
              <option value="PARTIAL_SUB">Частичный субподряд</option>
              <option value="FULL_SUB">Полный субподряд</option>
            </select>
          </Field>
          {needsSub ? (
            <div className="sm:col-span-2 space-y-2">
              <Field label="Наименование субподряда">
                <select
                  multiple
                  className={`${inputClass} h-28`}
                  value={form.subcontractorIds}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      subcontractorIds: Array.from(e.target.selectedOptions).map((o) => o.value),
                    })
                  }
                >
                  {subs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  placeholder="Новый субподряд"
                  value={newSub}
                  onChange={(e) => setNewSub(e.target.value)}
                />
                <Btn variant="ghost" onClick={addSub} disabled={pending}>
                  Добавить
                </Btn>
              </div>
            </div>
          ) : null}
          <Field label="Сумма договора">
            <input
              type="number"
              className={inputClass}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Field>
          <Field label="Планируемая себестоимость">
            <input
              type="number"
              className={inputClass}
              value={form.plannedCost}
              onChange={(e) => setForm({ ...form, plannedCost: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2 rounded-xl bg-slate-50 p-4 text-sm">
            Планируемая маржа: <b>{money(margin.qty)}</b> ({percent(margin.pct)})
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setOpen(false)}>
            Отмена
          </Btn>
          <Btn onClick={submit} disabled={pending}>
            Сохранить
          </Btn>
        </div>
        <p className="mt-3 text-xs text-slate-400">Формат в списках: {contractLabel({ customer: form.customer || "Заказчик", number: form.number || "№", date: form.date || "2026-01-01" })}</p>
      </Modal>
    </>
  );
}
