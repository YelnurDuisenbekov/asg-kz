"use server";

import { revalidatePath } from "next/cache";
import { mkdir, writeFile, unlink } from "fs/promises";
import { join } from "path";
import { mutateDb, readDb, uid, uploadsDir } from "./db";
import type { AmountMode, ExecutionType } from "./types";

function refresh() {
  revalidatePath("/", "layout");
}

function num(v: FormDataEntryValue | null) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function str(v: FormDataEntryValue | null) {
  return String(v ?? "").trim();
}

export async function getState() {
  return readDb();
}

export async function saveSettings(formData: FormData) {
  const days = Math.max(1, Math.round(num(formData.get("approachingDays"))));
  mutateDb((db) => {
    db.settings.approachingDays = days;
  });
  refresh();
}

export async function upsertSubcontractor(name: string) {
  const n = name.trim();
  if (!n) return { error: "Укажите наименование субподряда" };
  const item = mutateDb((db) => {
    const existing = db.subcontractors.find(
      (s) => s.name.toLowerCase() === n.toLowerCase(),
    );
    if (existing) return existing;
    const created = { id: uid(), name: n };
    db.subcontractors.push(created);
    return created;
  });
  refresh();
  return { item };
}

export async function upsertContract(formData: FormData) {
  const id = str(formData.get("id")) || uid();
  const number = str(formData.get("number"));
  const date = str(formData.get("date"));
  const customer = str(formData.get("customer"));
  const executionType = str(formData.get("executionType")) as ExecutionType;
  const amount = num(formData.get("amount"));
  const plannedCost = num(formData.get("plannedCost"));
  const subcontractorIds = formData.getAll("subcontractorIds").map(String).filter(Boolean);

  if (!number || !date || !customer) return { error: "Заполните номер, дату и заказчика" };
  if (!["OWN", "PARTIAL_SUB", "FULL_SUB"].includes(executionType)) {
    return { error: "Выберите тип исполнения" };
  }
  if (executionType !== "OWN" && subcontractorIds.length === 0) {
    return { error: "Добавьте хотя бы один субподряд" };
  }

  const keepDocs = formData.getAll("keepDocIds").map(String);
  const newDocs = await saveDocs(formData);

  mutateDb((db) => {
    const prev = db.contracts.find((c) => c.id === id);
    const kept = (prev?.documents ?? []).filter((d) => keepDocs.includes(d.id));
    const next = {
      id,
      number,
      date,
      customer,
      executionType,
      subcontractorIds: executionType === "OWN" ? [] : subcontractorIds,
      amount,
      plannedCost,
      documents: [...kept, ...newDocs],
      createdAt: prev?.createdAt ?? new Date().toISOString(),
    };
    const idx = db.contracts.findIndex((c) => c.id === id);
    if (idx >= 0) db.contracts[idx] = next;
    else db.contracts.unshift(next);
  });
  refresh();
  return { ok: true };
}

export async function deleteContract(id: string) {
  const contract = readDb().contracts.find((c) => c.id === id);
  if (contract) {
    for (const doc of contract.documents ?? []) {
      await unlink(join(uploadsDir(), doc.storedName)).catch(() => undefined);
    }
  }
  mutateDb((db) => {
    db.contracts = db.contracts.filter((c) => c.id !== id);
    db.payments = db.payments.map((p) =>
      p.contractId === id ? { ...p, contractId: undefined } : p,
    );
    db.incomes = db.incomes.map((i) =>
      i.contractId === id ? { ...i, contractId: undefined } : i,
    );
    db.plannedIncomes = db.plannedIncomes.filter((p) => p.contractId !== id);
    db.tasks = db.tasks.filter((t) => t.contractId !== id);
  });
  refresh();
}

export async function addNamedType(kind: "expense" | "income", name: string) {
  const n = name.trim();
  if (!n) return { error: "Укажите название типа" };
  const item = mutateDb((db) => {
    const list = kind === "expense" ? db.expenseTypes : db.incomeTypes;
    const existing = list.find((t) => t.name.toLowerCase() === n.toLowerCase());
    if (existing) return existing;
    const created = { id: uid(), name: n, isSystem: false };
    list.push(created);
    return created;
  });
  refresh();
  return { item };
}

async function saveDocs(formData: FormData) {
  const files = formData.getAll("documents").filter((f): f is File => f instanceof File && f.size > 0);
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  const docs = [];
  for (const file of files) {
    const storedName = `${uid()}-${file.name.replace(/[^\w.\-а-яА-ЯёЁ]+/g, "_")}`;
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(join(dir, storedName), buf);
    docs.push({ id: uid(), originalName: file.name, storedName });
  }
  return docs;
}

export async function upsertPayment(formData: FormData) {
  const id = str(formData.get("id")) || uid();
  const expenseTypeId = str(formData.get("expenseTypeId"));
  const contractId = str(formData.get("contractId")) || undefined;
  const counterparty = str(formData.get("counterparty"));
  const purpose = str(formData.get("purpose"));
  const amount = num(formData.get("amount"));
  const dueDate = str(formData.get("dueDate"));
  const keepDocs = formData.getAll("keepDocIds").map(String);

  if (!expenseTypeId || !counterparty || !purpose || !dueDate) {
    return { error: "Заполните обязательные поля платежа" };
  }

  const dbNow = readDb();
  const type = dbNow.expenseTypes.find((t) => t.id === expenseTypeId);
  if (type?.code === "CONTRACT" && !contractId) {
    return { error: "Выберите договор" };
  }

  const newDocs = await saveDocs(formData);

  mutateDb((db) => {
    const prev = db.payments.find((p) => p.id === id);
    const kept = (prev?.documents ?? []).filter((d) => keepDocs.includes(d.id));
    const next = {
      id,
      expenseTypeId,
      contractId: type?.code === "CONTRACT" ? contractId : undefined,
      counterparty,
      purpose,
      amount,
      dueDate,
      status: prev?.status ?? "PENDING",
      documents: [...kept, ...newDocs],
      createdAt: prev?.createdAt ?? new Date().toISOString(),
    };
    const idx = db.payments.findIndex((p) => p.id === id);
    if (idx >= 0) db.payments[idx] = next;
    else db.payments.unshift(next);
    if (!db.counterparties) db.counterparties = [];
    if (!db.counterparties.some((c) => c.name.toLowerCase() === counterparty.toLowerCase())) {
      db.counterparties.push({ id: uid(), name: counterparty });
    }
  });
  refresh();
  return { ok: true };
}

export async function deletePayment(id: string) {
  const payment = readDb().payments.find((p) => p.id === id);
  if (payment) {
    for (const doc of payment.documents) {
      await unlink(join(uploadsDir(), doc.storedName)).catch(() => undefined);
    }
  }
  mutateDb((db) => {
    db.payments = db.payments.filter((p) => p.id !== id);
  });
  refresh();
}

export async function addCounterparty(name: string) {
  const n = name.trim();
  if (!n) return { error: "Укажите наименование контрагента" };
  const item = mutateDb((db) => {
    const existing = db.counterparties.find((c) => c.name.toLowerCase() === n.toLowerCase());
    if (existing) return existing;
    const created = { id: uid(), name: n };
    db.counterparties.push(created);
    return created;
  });
  refresh();
  return { item };
}

export async function setPaymentStatus(id: string, status: "APPROVED" | "PAID") {
  const result = mutateDb((db) => {
    const p = db.payments.find((x) => x.id === id);
    if (!p) return { error: "Платёж не найден" };
    const current = p.status ?? "PENDING";
    if (status === "APPROVED" && current !== "PENDING") {
      return { error: "Согласовать можно только платёж на согласовании" };
    }
    if (status === "PAID" && current !== "APPROVED") {
      return { error: "Оплатить можно только согласованный платёж" };
    }
    p.status = status;
    return { ok: true as const };
  });
  refresh();
  return result;
}

export async function upsertIncome(formData: FormData) {
  const id = str(formData.get("id")) || uid();
  const incomeTypeId = str(formData.get("incomeTypeId"));
  const contractId = str(formData.get("contractId")) || undefined;
  const amount = num(formData.get("amount"));
  const date = str(formData.get("date"));
  const purpose = str(formData.get("purpose"));

  if (!incomeTypeId || !date || !purpose) return { error: "Заполните обязательные поля дохода" };
  const type = readDb().incomeTypes.find((t) => t.id === incomeTypeId);
  if (type?.code === "CONTRACT" && !contractId) return { error: "Выберите договор" };

  mutateDb((db) => {
    const prev = db.incomes.find((i) => i.id === id);
    const next = {
      id,
      incomeTypeId,
      contractId: type?.code === "CONTRACT" ? contractId : undefined,
      amount,
      date,
      purpose,
      createdAt: prev?.createdAt ?? new Date().toISOString(),
    };
    const idx = db.incomes.findIndex((i) => i.id === id);
    if (idx >= 0) db.incomes[idx] = next;
    else db.incomes.unshift(next);
  });
  refresh();
  return { ok: true };
}

export async function deleteIncome(id: string) {
  mutateDb((db) => {
    db.incomes = db.incomes.filter((i) => i.id !== id);
  });
  refresh();
}

export async function upsertPlannedIncome(formData: FormData) {
  const id = str(formData.get("id")) || uid();
  const contractId = str(formData.get("contractId"));
  const receiptDate = str(formData.get("receiptDate"));
  const mode = str(formData.get("mode")) as AmountMode;
  const value = num(formData.get("value"));

  if (!contractId || !receiptDate) return { error: "Укажите договор и дату получения" };
  if (!["PERCENT", "AMOUNT"].includes(mode)) return { error: "Выберите способ указания суммы" };

  mutateDb((db) => {
    const prev = db.plannedIncomes.find((p) => p.id === id);
    const next = {
      id,
      contractId,
      receiptDate,
      mode,
      value,
      createdAt: prev?.createdAt ?? new Date().toISOString(),
    };
    const idx = db.plannedIncomes.findIndex((p) => p.id === id);
    if (idx >= 0) db.plannedIncomes[idx] = next;
    else db.plannedIncomes.unshift(next);
  });
  refresh();
  return { ok: true };
}

export async function deletePlannedIncome(id: string) {
  mutateDb((db) => {
    db.plannedIncomes = db.plannedIncomes.filter((p) => p.id !== id);
  });
  refresh();
}

export async function upsertTask(formData: FormData) {
  const id = str(formData.get("id")) || uid();
  const contractId = str(formData.get("contractId"));
  const name = str(formData.get("name"));
  const assignee = str(formData.get("assignee"));
  const startDate = str(formData.get("startDate"));
  const endDate = str(formData.get("endDate"));
  const notes = str(formData.get("notes"));

  if (!contractId || !name || !assignee || !startDate || !endDate) {
    return { error: "Заполните задачу: проект, название, ответственного и сроки" };
  }

  mutateDb((db) => {
    const prev = db.tasks.find((t) => t.id === id);
    const next = {
      id,
      contractId,
      name,
      assignee,
      startDate,
      endDate,
      notes,
      createdAt: prev?.createdAt ?? new Date().toISOString(),
    };
    const idx = db.tasks.findIndex((t) => t.id === id);
    if (idx >= 0) db.tasks[idx] = next;
    else db.tasks.unshift(next);
  });
  refresh();
  return { ok: true };
}

export async function deleteTask(id: string) {
  mutateDb((db) => {
    db.tasks = db.tasks.filter((t) => t.id !== id);
  });
  refresh();
}
