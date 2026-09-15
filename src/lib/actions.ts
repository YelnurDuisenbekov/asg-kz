"use server";

import { revalidatePath } from "next/cache";
import { parseDeadline } from "./deadline";
import { canEnterCluster } from "./gates";
import { deleteUpload, mutateDb, readDb, saveUpload, uid } from "./db";
import { money, parseMoney } from "./format";
import type {
  Cluster,
  Database,
  Doc,
  ExecutionType,
  Executor,
  ExpenseType,
  NamedItem,
  PaymentStatus,
  ScheduleTask,
  TenderStatus,
} from "./types";
import { describeDealChanges, describePaymentChanges } from "./changes";

function refresh() {
  revalidatePath("/", "layout");
}

function str(v: FormDataEntryValue | null) {
  return String(v ?? "").trim();
}

function remember(list: NamedItem[], name: string) {
  const n = name.trim();
  if (!n) return;
  if (!list.some((x) => x.name.toLowerCase() === n.toLowerCase())) {
    list.push({ id: uid(), name: n });
  }
}

async function saveDocs(form: FormData, field = "documents"): Promise<Doc[]> {
  const files = form.getAll(field).filter((f): f is File => f instanceof File && f.size > 0);
  const docs: Doc[] = [];
  for (const file of files) {
    const storedName = `${uid()}-${file.name.replace(/[^\w.\-а-яА-ЯёЁ]+/g, "_")}`;
    await saveUpload(storedName, Buffer.from(await file.arrayBuffer()));
    docs.push({ id: uid(), originalName: file.name, storedName });
  }
  return docs;
}

function keepMerge(prev: Doc[] | undefined, form: FormData, keepField: string, added: Doc[]) {
  const keep = new Set(form.getAll(keepField).map(String));
  return [...(prev ?? []).filter((d) => keep.has(d.id)), ...added];
}

async function dropDocs(docs: Doc[] | undefined) {
  for (const doc of docs ?? []) await deleteUpload(doc.storedName);
}

function parseTasks(raw: string): ScheduleTask[] {
  try {
    const parsed = JSON.parse(raw || "[]") as ScheduleTask[];
    const walk = (list: ScheduleTask[]): ScheduleTask[] =>
      (Array.isArray(list) ? list : []).map((t) => ({
        id: t.id || uid(),
        name: String(t.name ?? "").trim(),
        startDate: String(t.startDate ?? ""),
        endDate: String(t.endDate ?? ""),
        children: walk(t.children ?? []),
      }));
    return walk(parsed);
  } catch {
    return [];
  }
}

export async function getState() {
  return readDb();
}

export type NamedKind = "customers" | "counterparties" | "subcontractors";

export async function addNamed(kind: NamedKind, name: string) {
  const n = name.trim();
  if (!n) return { error: "Укажите наименование" };
  let created = false;
  const item = await mutateDb((db) => {
    const list = db[kind];
    const existing = list.find((x) => x.name.toLowerCase() === n.toLowerCase());
    if (existing) return existing;
    created = true;
    const next = { id: uid(), name: n };
    list.push(next);
    return next;
  });
  refresh();
  return { item, changes: created ? [`В справочник добавлено: ${item.name}`] : [] };
}

export async function deleteNamed(kind: NamedKind, id: string) {
  await mutateDb((db) => {
    db[kind] = db[kind].filter((x) => x.id !== id);
  });
  refresh();
}

export async function upsertDeal(form: FormData) {
  const id = str(form.get("id")) || uid();
  const cluster = str(form.get("cluster")) as Cluster;
  const executor = str(form.get("executor")) as Executor;
  const title = str(form.get("title"));
  const customer = str(form.get("customer"));
  const amount = parseMoney(str(form.get("amount")));
  const tenderStatus = (str(form.get("tenderStatus")) || undefined) as TenderStatus | undefined;
  const executionType = (str(form.get("executionType")) || undefined) as ExecutionType | undefined;

  if (!title || !customer) return { error: "Укажите наименование и заказчика" };
  if (!["ASG", "STROYPROJECT"].includes(executor)) return { error: "Выберите исполнителя" };
  if (!["PRETENDER", "TENDER", "CONCLUSION", "EXECUTION"].includes(cluster)) {
    return { error: "Выберите этап" };
  }
  if (cluster === "EXECUTION" && (executionType === "PARTIAL_SUB" || executionType === "FULL_SUB") && form.getAll("subcontractorIds").length === 0) {
    return { error: "Выберите субподряд" };
  }

  const docs = await saveDocs(form, "documents");
  const subDocs = await saveDocs(form, "submissionDocuments");
  const protoDocs = await saveDocs(form, "protocolDocuments");
  const tasks = parseTasks(str(form.get("tasksJson")));

  const dbNow = await readDb();
  const prev = dbNow.deals.find((d) => d.id === id);
  const nextStatus = (tenderStatus || prev?.tenderStatus || "REVIEW") as TenderStatus;
  const now = new Date().toISOString();
  const draft = {
    id,
    cluster,
    executor,
    title,
    customer,
    amount,
    documents: keepMerge(prev?.documents, form, "keepDocIds", docs),
    deadline: parseDeadline(form, "deadline"),
    createdAt: prev?.createdAt ?? now,
    clusterEnteredAt: !prev || prev.cluster !== cluster ? now : prev.clusterEnteredAt,
    announcementNumber: str(form.get("announcementNumber")) || undefined,
    lotNumber: str(form.get("lotNumber")) || undefined,
    tenderUrl: str(form.get("tenderUrl")) || undefined,
    submissionDocuments: keepMerge(prev?.submissionDocuments, form, "keepSubDocIds", subDocs),
    resultsDeadline:
      nextStatus === "REVIEW"
        ? form.get("resultsDeadlineMode")
          ? parseDeadline(form, "resultsDeadline")
          : prev?.resultsDeadline
        : prev?.resultsDeadline,
    tenderStatus: nextStatus,
    protocolDocuments: keepMerge(prev?.protocolDocuments, form, "keepProtoDocIds", protoDocs),
    contractNumber: str(form.get("contractNumber")) || undefined,
    contractDate: str(form.get("contractDate")) || undefined,
    estimate: {
      materials: parseMoney(str(form.get("estMaterials"))),
      equipment: parseMoney(str(form.get("estEquipment"))),
      labor: parseMoney(str(form.get("estLabor"))),
      specialTech: parseMoney(str(form.get("estSpecialTech"))),
      profit: parseMoney(str(form.get("estProfit"))),
    },
    tasks,
    approvalDays: Number(str(form.get("approvalDays"))) || prev?.approvalDays,
    signingDays: Number(str(form.get("signingDays"))) || prev?.signingDays,
    conclusionStartedAt:
      cluster === "CONCLUSION" || cluster === "EXECUTION" ? prev?.conclusionStartedAt ?? now : prev?.conclusionStartedAt,
    executionType: (str(form.get("executionType")) as ExecutionType) || prev?.executionType,
    subcontractorIds: form.getAll("subcontractorIds").map(String).filter(Boolean),
  };

  if (!prev && cluster !== "PRETENDER") {
    return { error: "Новый договор начинается с предтендера" };
  }
  const blocked = canEnterCluster(prev, cluster, draft);
  if (blocked) return { error: blocked };

  const changes = describeDealChanges(prev, draft);
  await mutateDb((db: Database) => {
    const idx = db.deals.findIndex((d) => d.id === id);
    if (idx >= 0) db.deals[idx] = draft;
    else db.deals.unshift(draft);
    remember(db.customers, customer);
  });
  refresh();
  return { ok: true, id, changes };
}

export async function deleteDeal(id: string) {
  const deal = (await readDb()).deals.find((d) => d.id === id);
  if (deal) {
    await dropDocs(deal.documents);
    await dropDocs(deal.submissionDocuments);
    await dropDocs(deal.protocolDocuments);
  }
  await mutateDb((db) => {
    db.deals = db.deals.filter((d) => d.id !== id);
    db.payments = db.payments.filter((p) => p.dealId !== id);
    db.incomes = db.incomes.filter((i) => i.dealId !== id);
    db.avrs = db.avrs.filter((a) => a.dealId !== id);
  });
  refresh();
}

export async function upsertPayment(form: FormData) {
  const id = str(form.get("id")) || uid();
  const dealId = str(form.get("dealId"));
  const counterparty = str(form.get("counterparty"));
  const amount = parseMoney(str(form.get("amount")));
  const purpose = str(form.get("purpose"));
  if (!dealId || !counterparty || !purpose) return { error: "Заполните договор, контрагента и назначение" };
  const expenseType = (str(form.get("expenseType")) || "MATERIALS") as ExpenseType;
  if (!["MATERIALS", "EQUIPMENT", "LABOR", "SPECIAL_TECH"].includes(expenseType)) {
    return { error: "Выберите тип расхода" };
  }
  const docs = await saveDocs(form, "documents");
  let changes: string[] = [];
  await mutateDb((db) => {
    const prev = db.payments.find((p) => p.id === id);
    const next = {
      id,
      dealId,
      counterparty,
      amount,
      purpose,
      expenseType,
      due: parseDeadline(form, "due"),
      documents: keepMerge(prev?.documents, form, "keepDocIds", docs),
      status: prev?.status ?? ("PENDING" as PaymentStatus),
      createdAt: prev?.createdAt ?? new Date().toISOString(),
    };
    const idx = db.payments.findIndex((p) => p.id === id);
    if (idx >= 0) db.payments[idx] = next;
    else db.payments.unshift(next);
    remember(db.counterparties, counterparty);
    changes = describePaymentChanges(prev, next);
  });
  refresh();
  return { ok: true, changes };
}

export async function deletePayment(id: string) {
  const p = (await readDb()).payments.find((x) => x.id === id);
  if (p) await dropDocs(p.documents);
  await mutateDb((db) => {
    db.payments = db.payments.filter((x) => x.id !== id);
  });
  refresh();
}

export async function setPaymentStatus(id: string, status: "APPROVED" | "PAID") {
  const result = await mutateDb((db) => {
    const p = db.payments.find((x) => x.id === id);
    if (!p) return { error: "Платёж не найден" };
    if (status === "APPROVED" && p.status !== "PENDING") return { error: "Согласовать может директор только заявку на согласовании" };
    if (status === "PAID" && p.status !== "APPROVED") return { error: "Оплатить можно только согласованный платёж" };
    p.status = status;
    return { ok: true as const, changes: [`Статус платежа: ${status === "APPROVED" ? "согласован директором" : "оплачен бухгалтером"}`] };
  });
  refresh();
  return result;
}

export async function upsertIncome(form: FormData) {
  const id = str(form.get("id")) || uid();
  const dealId = str(form.get("dealId"));
  const amount = parseMoney(str(form.get("amount")));
  const date = str(form.get("date"));
  const purpose = str(form.get("purpose"));
  if (!dealId || !date || !purpose) return { error: "Заполните договор, дату и назначение" };
  await mutateDb((db) => {
    const prev = db.incomes.find((i) => i.id === id);
    const next = {
      id,
      dealId,
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
  return { ok: true, changes: [`Добавлен доход ${money(amount)} · ${purpose}`] };
}

export async function deleteIncome(id: string) {
  await mutateDb((db) => {
    db.incomes = db.incomes.filter((i) => i.id !== id);
  });
  refresh();
}

export async function upsertAvr(form: FormData) {
  const id = str(form.get("id")) || uid();
  const dealId = str(form.get("dealId"));
  const number = str(form.get("number"));
  const date = str(form.get("date"));
  const amount = parseMoney(str(form.get("amount")));
  if (!dealId || !number || !date) return { error: "Укажите номер и дату АВР" };
  const docs = await saveDocs(form, "documents");
  await mutateDb((db) => {
    const prev = db.avrs.find((a) => a.id === id);
    const next = {
      id,
      dealId,
      number,
      date,
      amount,
      documents: keepMerge(prev?.documents, form, "keepDocIds", docs),
      createdAt: prev?.createdAt ?? new Date().toISOString(),
    };
    const idx = db.avrs.findIndex((a) => a.id === id);
    if (idx >= 0) db.avrs[idx] = next;
    else db.avrs.unshift(next);
  });
  refresh();
  return { ok: true, changes: [`Добавлен АВР № ${number} на ${money(amount)}`] };
}

export async function deleteAvr(id: string) {
  const a = (await readDb()).avrs.find((x) => x.id === id);
  if (a) await dropDocs(a.documents);
  await mutateDb((db) => {
    db.avrs = db.avrs.filter((x) => x.id !== id);
  });
  refresh();
}
