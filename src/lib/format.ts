export function money(value: number) {
  const n = Math.round(Number.isFinite(value) ? value : 0);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n).toString();
  const grouped = abs.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${grouped} ₸`;
}

export function number(value: number, digits = 2) {
  const n = Number.isFinite(value) ? value : 0;
  const fixed = n.toFixed(digits);
  const [i, d] = fixed.split(".");
  const grouped = i.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (!d || Number(d) === 0) return grouped;
  return `${grouped},${d.replace(/0+$/, "")}`;
}

export function percent(value: number) {
  return `${number(value, 1)}%`;
}

export function dateRu(iso: string) {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export function contractLabel(c: {
  customer: string;
  number: string;
  date: string;
  title?: string;
}) {
  const base = `${c.customer}_${c.number}_${dateRu(c.date)}`;
  const name = c.title?.trim();
  return name ? `${base}_${name}` : base;
}

export function executionLabel(type: string) {
  switch (type) {
    case "OWN":
      return "Своими силами";
    case "PARTIAL_SUB":
      return "Частичный субподряд";
    case "FULL_SUB":
      return "Полный субподряд";
    default:
      return type;
  }
}

export function plannedMargin(amount: number, plannedCost: number) {
  const qty = amount - plannedCost;
  const pct = amount === 0 ? 0 : (qty / amount) * 100;
  return { qty, pct };
}

export function plannedIncomeAmount(
  contractAmount: number,
  mode: "PERCENT" | "AMOUNT",
  value: number,
) {
  return mode === "PERCENT" ? (contractAmount * value) / 100 : value;
}

export function daysUntil(iso: string) {
  const parts = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!parts) return 0;
  const end = Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((end - today) / 86_400_000);
}

export function workStatusLabel(status: string) {
  switch (status) {
    case "ESTIMATE":
      return "Расчет сметы";
    case "APPROVAL":
      return "На согласовании";
    case "SUBMITTED":
      return "Документация подана";
    case "SIGNED":
      return "Подписан договор";
    case "REJECTED":
      return "Отказано";
    default:
      return "Новое";
  }
}

export function paymentStatusLabel(status: string) {
  switch (status) {
    case "APPROVED":
      return "Согласован";
    case "PAID":
      return "Оплачен";
    default:
      return "На согласовании";
  }
}
