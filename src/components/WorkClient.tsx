"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addPerson, deleteWorkItem, upsertWorkItem } from "@/lib/actions";
import { money, workStatusLabel } from "@/lib/format";
import type { PaymentDocument, Subcontractor, WorkItem, WorkStatus } from "@/lib/types";
import { CustomerSelect } from "./CustomerSelect";
import { Btn, CreatableSelect, Field, FileUpload, ItemList, ItemRow, Modal, PageHeader, inputClass } from "./ui";

function todayIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const EMPTY = {
  id: "",
  lots: "",
  tenderUrl: "",
  customer: "",
  amount: "",
  status: "NEW" as WorkStatus,
  responsibleId: "",
  contractNumber: "",
  contractDate: todayIso(),
};

function statusChip(status: string) {
  const label = workStatusLabel(status);
  const cls =
    status === "SIGNED"
      ? "bg-emerald-100 text-emerald-800"
      : status === "REJECTED"
        ? "bg-rose-100 text-rose-800"
        : status === "SUBMITTED"
          ? "bg-teal-100 text-teal-800"
          : status === "APPROVAL"
            ? "bg-sky-100 text-sky-800"
            : status === "ESTIMATE"
              ? "bg-amber-100 text-amber-900"
              : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

export function WorkClient({
  items,
  people,
  customers,
}: {
  items: WorkItem[];
  people: Subcontractor[];
  customers: Subcontractor[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const openId = params.get("id");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [staff, setStaff] = useState(people);
  const [clientList, setClientList] = useState(customers);
  const [keepDocs, setKeepDocs] = useState<PaymentDocument[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const signed = form.status === "SIGNED";
  const peopleMap = useMemo(
    () => Object.fromEntries(staff.map((p) => [p.id, p.name])),
    [staff],
  );

  function create() {
    setForm({ ...EMPTY, contractDate: todayIso() });
    setKeepDocs([]);
    setFiles([]);
    setError("");
    setOpen(true);
  }

  function edit(w: WorkItem) {
    setForm({
      id: w.id,
      lots: w.lots,
      tenderUrl: w.tenderUrl,
      customer: w.customer,
      amount: String(w.amount),
      status: w.status ?? "NEW",
      responsibleId: w.responsibleId ?? "",
      contractNumber: w.lots,
      contractDate: todayIso(),
    });
    setKeepDocs(w.documents ?? []);
    setFiles([]);
    setError("");
    setOpen(true);
  }

  useEffect(() => {
    if (!openId) return;
    const w = items.find((x) => x.id === openId);
    if (w) edit(w);
  }, [openId]);

  function closeModal() {
    setOpen(false);
    if (openId) router.replace("/work");
  }

  function submit() {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, String(v)));
    keepDocs.forEach((d) => fd.append("keepDocIds", d.id));
    files.forEach((f) => fd.append("documents", f));
    start(async () => {
      const res = await upsertWorkItem(fd);
      if (res?.error) setError(res.error);
      else closeModal();
    });
  }

  return (
    <>
      <PageHeader
        title="В работе"
        subtitle="Лоты и тендеры до заключения договора"
        action={<Btn onClick={create}>Добавить лот</Btn>}
      />
      <ItemList empty={items.length === 0} emptyText="Записей пока нет">
        {items.map((w) => (
          <ItemRow
            key={w.id}
            onClick={() => edit(w)}
            title={w.lots}
            lines={[
              `${w.customer} · ${(w.responsibleId && peopleMap[w.responsibleId]) || "без ответственного"}`,
            ]}
            right={
              <>
                <div className="whitespace-nowrap font-medium">{money(w.amount)}</div>
                <div className="mt-1">{statusChip(w.status)}</div>
              </>
            }
            actions={
              <button className="text-sm text-red-600" onClick={() => start(() => deleteWorkItem(w.id))}>
                Удалить
              </button>
            }
          />
        ))}
      </ItemList>

      <Modal title={form.id ? "Редактирование" : "Новая запись"} open={open} onClose={closeModal}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Лоты">
              <input
                className={inputClass}
                value={form.lots}
                onChange={(e) => setForm({ ...form, lots: e.target.value })}
                placeholder="Например: лот 1, лот 3"
              />
            </Field>
          </div>
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
          <Field label="Сумма тендера">
            <input
              type="number"
              className={inputClass}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Ссылка на тендер">
              <input
                className={inputClass}
                value={form.tenderUrl}
                onChange={(e) => setForm({ ...form, tenderUrl: e.target.value })}
                placeholder="https://"
              />
            </Field>
          </div>
          <Field label="Статус">
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => {
                const status = e.target.value as WorkStatus;
                setForm({
                  ...form,
                  status,
                  contractNumber: form.contractNumber || form.lots,
                  contractDate: form.contractDate || todayIso(),
                });
              }}
            >
              <option value="NEW">Новое</option>
              <option value="ESTIMATE">Расчет сметы</option>
              <option value="APPROVAL">На согласовании</option>
              <option value="SUBMITTED">Документация подана</option>
              <option value="SIGNED">Подписан договор</option>
              <option value="REJECTED">Отказано</option>
            </select>
          </Field>
          {signed ? (
            <>
              <p className="sm:col-span-2 rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-900">
                Запись будет перенесена во вкладку «Договоры».
              </p>
              <Field label="Номер договора">
                <input
                  className={inputClass}
                  value={form.contractNumber}
                  onChange={(e) => setForm({ ...form, contractNumber: e.target.value })}
                  placeholder={form.lots || "Номер"}
                />
              </Field>
              <Field label="Дата договора">
                <input
                  type="date"
                  className={inputClass}
                  value={form.contractDate}
                  onChange={(e) => setForm({ ...form, contractDate: e.target.value })}
                />
              </Field>
            </>
          ) : null}
          <div className="sm:col-span-2">
            <FileUpload
              label="Файлы"
              files={files}
              onChange={setFiles}
              existing={keepDocs}
              onRemoveExisting={(id) => setKeepDocs(keepDocs.filter((x) => x.id !== id))}
            />
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Btn variant="ghost" onClick={closeModal}>
            Отмена
          </Btn>
          <Btn onClick={submit} disabled={pending}>
            {signed ? "Перенести в договоры" : "Сохранить"}
          </Btn>
        </div>
      </Modal>
    </>
  );
}
