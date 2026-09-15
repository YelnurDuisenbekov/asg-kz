import type { Cluster, Deadline, Deal, Executor, PaymentStatus, TenderStatus } from "./types";
import { dueDate } from "./deadline";

export function money(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  const sign = n < 0 ? "−" : "";
  const [i, d] = Math.abs(n).toFixed(2).split(".");
  const grouped = i.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${grouped},${d} ₸`;
}

export function parseMoney(raw: string) {
  const cleaned = String(raw ?? "")
    .replace(/\s/g, "")
    .replace("−", "-")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function formatMoneyInput(value: number | string) {
  const n = typeof value === "string" ? parseMoney(value) : value;
  const safe = Number.isFinite(n) ? n : 0;
  const sign = safe < 0 ? "-" : "";
  const [i, d] = Math.abs(safe).toFixed(2).split(".");
  return `${sign}${i.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${d}`;
}

export function dateRu(iso?: string) {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export function sortNames<T extends { name: string }>(list: T[]) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "ru", { sensitivity: "base" }));
}

export function uniqueNames<T extends { id: string; name: string }>(list: T[]) {
  return sortNames(
    list.filter(
      (item, i, arr) =>
        arr.findIndex((x) => x.id === item.id || x.name.toLowerCase() === item.name.toLowerCase()) === i,
    ),
  );
}

export function contractLabel(d: Pick<Deal, "customer" | "contractNumber" | "contractDate" | "title">) {
  const date = d.contractDate ? dateRu(d.contractDate) : "б/д";
  return `${d.customer}_${d.contractNumber || "б/н"}_${date}_${d.title}`;
}

export function executorLabel(v: Executor | string) {
  return v === "STROYPROJECT" ? "СтройПроект" : "АСГ";
}

export function clusterLabel(v: Cluster | string) {
  switch (v) {
    case "TENDER":
      return "Тендер";
    case "CONCLUSION":
      return "Заключение договора";
    case "EXECUTION":
      return "Исполнение договора";
    default:
      return "Предтендер";
  }
}

export function tenderStatusLabel(v?: TenderStatus) {
  switch (v) {
    case "LOST":
      return "Проиграли";
    case "WON":
      return "Выиграли";
    default:
      return "На рассмотрении заказчиком";
  }
}

export function paymentStatusLabel(v: PaymentStatus | string) {
  switch (v) {
    case "APPROVED":
      return "Согласован · бухгалтеру";
    case "PAID":
      return "Оплачен";
    default:
      return "На согласовании у директора";
  }
}

export function executionLabel(v?: string) {
  switch (v) {
    case "PARTIAL_SUB":
      return "Частичный субподряд";
    case "FULL_SUB":
      return "Полный субподряд";
    default:
      return "Своими силами";
  }
}

export function daysLeft(deadline?: Deadline | null) {
  if (!deadline) return null;
  const due = dueDate(deadline);
  if (!due) return null;
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const end = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((end - today) / 86_400_000);
}
