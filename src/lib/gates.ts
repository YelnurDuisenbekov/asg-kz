import { parseDeadline } from "./deadline";
import { parseMoney } from "./format";
import type { Cluster, Deal, Deadline, Doc, ExecutionType, Executor, TenderStatus } from "./types";

export const CLUSTERS: Cluster[] = ["PRETENDER", "TENDER", "CONCLUSION", "EXECUTION"];

export function clusterIndex(c: Cluster) {
  return CLUSTERS.indexOf(c);
}

export type Miss = { key: string; label: string };

function deadlineOk(d?: Deadline) {
  if (!d) return false;
  if (d.mode === "DATE") return Boolean(d.date);
  return Number(d.days) > 0;
}

function hasDocs(docs?: Doc[]) {
  return (docs?.length ?? 0) > 0;
}

export function missingFields(deal: Deal, stage: Cluster): Miss[] {
  const miss: Miss[] = [];
  if (stage === "PRETENDER") {
    if (!deal.customer) miss.push({ key: "customer", label: "Заказчик" });
    if (!deal.title) miss.push({ key: "title", label: "Наименование" });
    if (!(deal.amount > 0)) miss.push({ key: "amount", label: "Сумма" });
    if (!deadlineOk(deal.deadline)) miss.push({ key: "deadline", label: "Срок исполнения" });
    if (!hasDocs(deal.documents)) miss.push({ key: "documents", label: "Документы" });
  }
  if (stage === "TENDER") {
    if (!deal.announcementNumber) miss.push({ key: "announcementNumber", label: "Номер объявления" });
    if (!deal.lotNumber) miss.push({ key: "lotNumber", label: "Номер лота" });
    if (!deal.tenderUrl) miss.push({ key: "tenderUrl", label: "Ссылка на тендер" });
    if (!deal.tenderStatus) miss.push({ key: "tenderStatus", label: "Статус тендера" });
    if (deal.tenderStatus === "REVIEW" && !deadlineOk(deal.resultsDeadline)) {
      miss.push({ key: "resultsDeadline", label: "Срок ожидания результатов" });
    }
    if (!hasDocs(deal.submissionDocuments)) miss.push({ key: "submissionDocuments", label: "Документы на подачу" });
    if (deal.tenderStatus === "WON" && !hasDocs(deal.protocolDocuments)) {
      miss.push({ key: "protocolDocuments", label: "Протокол" });
    }
  }
  if (stage === "CONCLUSION") {
    if (deal.tenderStatus !== "WON") miss.push({ key: "tenderStatus", label: "Статус тендера (Выиграли)" });
    if (!deal.contractNumber) miss.push({ key: "contractNumber", label: "Номер договора" });
    if (!deal.contractDate) miss.push({ key: "contractDate", label: "Дата договора" });
    const e = deal.estimate;
    if (!e || e.materials + e.equipment + e.labor + e.specialTech + e.profit <= 0) {
      miss.push({ key: "estimate", label: "Смета" });
    }
    if (!(Number(deal.approvalDays) > 0)) miss.push({ key: "approvalDays", label: "Срок согласования договора" });
    if (!(Number(deal.signingDays) > 0)) miss.push({ key: "signingDays", label: "Срок подписания договора" });
  }
  if (stage === "EXECUTION") {
    if (deal.executionType === "PARTIAL_SUB" || deal.executionType === "FULL_SUB") {
      if (!deal.subcontractorIds.length) miss.push({ key: "subcontractorIds", label: "Субподряд" });
    }
  }
  return miss;
}

export function fillFieldsMessage(miss: Miss[]) {
  if (!miss.length) return null;
  if (miss.length === 1) return `Заполните поле «${miss[0].label}»`;
  return `Заполните поля: ${miss.map((m) => `«${m.label}»`).join(", ")}`;
}

export function stageGap(deal: Deal, stage: Cluster) {
  return fillFieldsMessage(missingFields(deal, stage));
}

export function maxOpenIndex(deal?: Deal) {
  if (!deal) return 0;
  let max = clusterIndex(deal.cluster);
  const gap = missingFields(deal, deal.cluster);
  if (!gap.length && deal.cluster !== "EXECUTION") {
    if (deal.cluster === "TENDER" && deal.tenderStatus !== "WON") return max;
    max += 1;
  }
  return max;
}

export function canEnterCluster(saved: Deal | undefined, target: Cluster, draft: Deal): string | null {
  const from = saved?.cluster ?? "PRETENDER";
  if (clusterIndex(target) <= clusterIndex(from)) return null;
  const miss: Miss[] = [];
  for (const stage of CLUSTERS) {
    if (clusterIndex(stage) >= clusterIndex(target)) break;
    miss.push(...missingFields(draft, stage));
  }
  if (clusterIndex(target) >= 2 && draft.tenderStatus !== "WON") {
    if (!miss.some((m) => m.key === "tenderStatus")) {
      miss.push({ key: "tenderStatus", label: "Статус тендера (Выиграли)" });
    }
  }
  return fillFieldsMessage(miss);
}

function str(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function docsFromForm(form: FormData, fileField: string, keepField: string, existing?: Doc[]): Doc[] {
  const keepIds = form.getAll(keepField).map(String);
  const files = form.getAll(fileField).filter((f): f is File => typeof File !== "undefined" && f instanceof File && f.size > 0);
  const fileControl = form.getAll(fileField).some((f) => typeof File !== "undefined" && f instanceof File);
  const kept = keepIds.length
    ? (existing ?? []).filter((d) => keepIds.includes(d.id))
    : fileControl
      ? []
      : (existing ?? []);
  const added = files.map((f, i) => ({ id: `new-${fileField}-${i}`, originalName: f.name, storedName: `new-${i}` }));
  return [...kept, ...added];
}

export function draftFromForm(
  form: FormData,
  prev: Deal | undefined,
  extras: { cluster: Cluster; executor: Executor; tenderStatus: TenderStatus; executionType: ExecutionType; subcontractorIds: string[] },
): Deal {
  const now = new Date().toISOString();
  return {
    id: prev?.id ?? "draft",
    cluster: extras.cluster,
    executor: extras.executor,
    title: str(form, "title"),
    customer: str(form, "customer"),
    amount: parseMoney(str(form, "amount")),
    documents: docsFromForm(form, "documents", "keepDocIds", prev?.documents),
    deadline: parseDeadline(form, "deadline"),
    createdAt: prev?.createdAt ?? now,
    clusterEnteredAt: prev?.clusterEnteredAt ?? now,
    announcementNumber: str(form, "announcementNumber") || prev?.announcementNumber,
    lotNumber: str(form, "lotNumber") || prev?.lotNumber,
    tenderUrl: str(form, "tenderUrl") || prev?.tenderUrl,
    submissionDocuments: docsFromForm(form, "submissionDocuments", "keepSubDocIds", prev?.submissionDocuments),
    resultsDeadline: form.get("resultsDeadlineMode") ? parseDeadline(form, "resultsDeadline") : prev?.resultsDeadline,
    tenderStatus: extras.tenderStatus,
    protocolDocuments: docsFromForm(form, "protocolDocuments", "keepProtoDocIds", prev?.protocolDocuments),
    contractNumber: str(form, "contractNumber") || prev?.contractNumber,
    contractDate: str(form, "contractDate") || prev?.contractDate,
    estimate: {
      materials: parseMoney(str(form, "estMaterials")),
      equipment: parseMoney(str(form, "estEquipment")),
      labor: parseMoney(str(form, "estLabor")),
      specialTech: parseMoney(str(form, "estSpecialTech")),
      profit: parseMoney(str(form, "estProfit")),
    },
    tasks: prev?.tasks ?? [],
    approvalDays: Number(str(form, "approvalDays")) || prev?.approvalDays,
    signingDays: Number(str(form, "signingDays")) || prev?.signingDays,
    conclusionStartedAt: prev?.conclusionStartedAt,
    executionType: extras.executionType,
    subcontractorIds: extras.subcontractorIds,
  };
}
