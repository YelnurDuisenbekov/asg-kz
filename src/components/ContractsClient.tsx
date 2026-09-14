"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addPerson, deleteContract, upsertContract, upsertSubcontractor } from "@/lib/actions";
import { dateRu, executionLabel, money, percent, plannedMargin } from "@/lib/format";
import type { Contract, ExecutionType, Income, NamedType, Payment, PaymentDocument, PlannedIncome, Subcontractor, Task } from "@/lib/types";
import { ContractFinance } from "./ContractFinance";
import { ContractSchedule } from "./ContractSchedule";
import { CustomerSelect } from "./CustomerSelect";
import { Btn, CreatableMultiSelect, CreatableSelect, Field, FileUpload, ItemList, ItemRow, Modal, PageHeader, inputClass } from "./ui";

const EMPTY = {
  id: "",
  title: "",
  number: "",
  date: "",
  customer: "",
  executionType: "OWN" as ExecutionType,
  subcontractorIds: [] as string[],
  responsibleId: "",
  amount: "",
  plannedCost: "",
};

function fromContract(c: Contract) {
  return {
    id: c.id,
    title: c.title ?? "",
    number: c.number,
    date: c.date,
    customer: c.customer,
    executionType: c.executionType,
    subcontractorIds: c.subcontractorIds,
    responsibleId: c.responsibleId ?? "",
    amount: String(c.amount),
    plannedCost: String(c.plannedCost),
  };
}

export function ContractsClient({
  contracts,
  subcontractors,
  people,
  customers,
  tasks,
  approachingDays,
  payments,
  incomes,
  plannedIncomes,
  expenseTypes,
  incomeTypes,
}: {
  contracts: Contract[];
  subcontractors: Subcontractor[];
  people: Subcontractor[];
  customers: Subcontractor[];
  tasks: Task[];
  approachingDays: number;
  payments: Payment[];
  incomes: Income[];
  plannedIncomes: PlannedIncome[];
  expenseTypes: NamedType[];
  incomeTypes: NamedType[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const viewId = params.get("id");
  const fromSvod = params.get("from") === "svod";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [subs, setSubs] = useState(subcontractors);
  const [staff, setStaff] = useState(people);
  const [clientList, setClientList] = useState(customers);
  const [error, setError] = useState("");
  const [keepDocs, setKeepDocs] = useState<PaymentDocument[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [pending, start] = useTransition();
  const needsSub = form.executionType !== "OWN";
  const amount = Number(form.amount) || 0;
  const cost = Number(form.plannedCost) || 0;
  const margin = plannedMargin(amount, cost);
  const viewing = contracts.find((c) => c.id === viewId) ?? null;

  const subMap = useMemo(
    () => Object.fromEntries(subs.map((s) => [s.id, s.name])),
    [subs],
  );
  const peopleMap = useMemo(
    () => Object.fromEntries(staff.map((p) => [p.id, p.name])),
    [staff],
  );

  useEffect(() => {
    if (!viewing) return;
    setForm(fromContract(viewing));
    setKeepDocs(viewing.documents ?? []);
    setFiles([]);
    setError("");
  }, [viewing?.id]);

  function openCard(c: Contract) {
    setOpen(false);
    router.push(`/contracts?id=${c.id}`);
  }

  function closeCard() {
    router.push(fromSvod ? "/" : "/contracts");
  }

  function create() {
    setForm(EMPTY);
    setKeepDocs([]);
    setFiles([]);
    setError("");
    setOpen(true);
  }

  function submit(stayOpen: boolean) {
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
      else {
        setFiles([]);
        if (!stayOpen) setOpen(false);
      }
    });
  }

  const fields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Наименование договора">
          <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
      </div>
      <Field label="Номер договора">
        <input className={inputClass} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
      </Field>
      <Field label="Дата договора">
        <input type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </Field>
      <CustomerSelect
        value={form.customer}
        customers={clientList}
        onChange={(customer) => setForm({ ...form, customer })}
        onAdded={(item) =>
          setClientList((prev) => (prev.some((c) => c.id === item.id) ? prev : [...prev, item]))
        }
      />
      <div className="space-y-1.5">
        <span className="text-sm font-medium text-slate-700">Ответственный</span>
        <CreatableSelect
          value={form.responsibleId}
          options={staff.map((p) => ({ value: p.id, label: p.name }))}
          onChange={(responsibleId) => setForm({ ...form, responsibleId })}
          createLabel="+ Добавить человека"
          placeholder="Выберите ответственного"
          onCreate={async (name) => {
            const res = await addPerson(name);
            if (res.item) {
              setStaff((prev) => (prev.some((p) => p.id === res.item!.id) ? prev : [...prev, res.item!]));
              setForm((f) => ({ ...f, responsibleId: res.item!.id }));
            }
          }}
        />
      </div>
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
        <div className="sm:col-span-2 space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Наименование субподряда</span>
          <CreatableMultiSelect
            values={form.subcontractorIds}
            options={subs.map((s) => ({ value: s.id, label: s.name }))}
            onChange={(subcontractorIds) => setForm({ ...form, subcontractorIds })}
            createLabel="+ Добавить субподряд"
            placeholder="Выберите субподряд"
            onCreate={async (name) => {
              const res = await upsertSubcontractor(name);
              if (res.item) {
                setSubs((prev) => (prev.some((s) => s.id === res.item!.id) ? prev : [...prev, res.item!]));
                setForm((f) => ({
                  ...f,
                  subcontractorIds: f.subcontractorIds.includes(res.item!.id)
                    ? f.subcontractorIds
                    : [...f.subcontractorIds, res.item!.id],
                }));
              }
            }}
          />
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
  );

  if (viewing) {
    return (
      <>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button className="text-left text-sm text-teal-700" onClick={closeCard}>
            ← {fromSvod ? "К своду" : "К списку договоров"}
          </button>
          <Btn
            variant="danger"
            onClick={() =>
              start(async () => {
                await deleteContract(viewing.id);
                closeCard();
              })
            }
          >
            Удалить договор
          </Btn>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {form.title || viewing.title || "Договор"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            № {form.number || viewing.number} · {dateRu(form.date || viewing.date)}
          </p>
          <div className="mt-6">{fields}</div>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          <div className="mt-6 flex justify-end">
            <Btn onClick={() => submit(true)} disabled={pending}>
              Сохранить
            </Btn>
          </div>
          <ContractFinance
            contractId={viewing.id}
            contractAmount={amount || viewing.amount}
            payments={payments}
            incomes={incomes}
            planned={plannedIncomes}
            expenseTypes={expenseTypes}
            incomeTypes={incomeTypes}
          />
          <ContractSchedule
            contractId={viewing.id}
            tasks={tasks}
            approachingDays={approachingDays}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Договоры"
        subtitle="Нажмите на строку, чтобы открыть договор"
        action={<Btn onClick={create}>Добавить договор</Btn>}
      />
      <ItemList empty={contracts.length === 0} emptyText="Договоров пока нет">
        {contracts.map((c) => {
          const m = plannedMargin(c.amount, c.plannedCost);
          return (
            <ItemRow
              key={c.id}
              onClick={() => openCard(c)}
              title={c.title || "Без наименования"}
              lines={[
                `${c.customer} · № ${c.number} · ${dateRu(c.date)}`,
                `${executionLabel(c.executionType)}${c.subcontractorIds.length ? ` · ${c.subcontractorIds.map((id) => subMap[id] ?? id).join(", ")}` : ""} · ${(c.responsibleId && peopleMap[c.responsibleId]) || "без ответственного"}`,
              ]}
              right={
                <>
                  <div className="whitespace-nowrap font-medium">{money(c.amount)}</div>
                  <div className="text-xs text-slate-400">{percent(m.pct)}</div>
                </>
              }
            />
          );
        })}
      </ItemList>
      <Modal title="Новый договор" open={open} onClose={() => setOpen(false)}>
        {fields}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Btn variant="ghost" onClick={() => setOpen(false)}>
            Отмена
          </Btn>
          <Btn onClick={() => submit(false)} disabled={pending}>
            Сохранить
          </Btn>
        </div>
      </Modal>
    </>
  );
}
