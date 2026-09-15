import type { Avr, Deal, ExpenseType, Income, Payment, ScheduleTask } from "./types";
import { dueDate, toIso } from "./deadline";

export const EXPENSE_TYPES: { key: ExpenseType; label: string }[] = [
  { key: "MATERIALS", label: "Материал" },
  { key: "EQUIPMENT", label: "Оборудование" },
  { key: "LABOR", label: "Работа" },
  { key: "SPECIAL_TECH", label: "Спецтехника" },
];

export function expenseLabel(v?: ExpenseType | string) {
  return EXPENSE_TYPES.find((x) => x.key === v)?.label ?? "Материал";
}

export function flattenTasks(tasks: ScheduleTask[], depth = 0): { id: string; name: string; start: string; end: string; depth: number }[] {
  const out: { id: string; name: string; start: string; end: string; depth: number }[] = [];
  for (const t of tasks) {
    out.push({ id: t.id, name: t.name, start: t.startDate, end: t.endDate, depth });
    out.push(...flattenTasks(t.children ?? [], depth + 1));
  }
  return out;
}

export function dealEndIso(deal: Deal) {
  const due = dueDate(deal.deadline);
  return due ? toIso(due) : "";
}

export function paidOf(payments: Payment[], dealId: string) {
  return payments.filter((p) => p.dealId === dealId && p.status === "PAID").reduce((s, p) => s + p.amount, 0);
}

export function incomeOf(incomes: Income[], dealId: string) {
  return incomes.filter((i) => i.dealId === dealId).reduce((s, i) => s + i.amount, 0);
}

export function avrOf(avrs: Avr[], dealId: string) {
  const list = avrs.filter((a) => a.dealId === dealId);
  const sum = list.reduce((s, a) => s + a.amount, 0);
  return { count: list.length, sum };
}

export function expensesByType(payments: Payment[], dealId?: string) {
  const rows = payments.filter((p) => p.status === "PAID" && (!dealId || p.dealId === dealId));
  const map: Record<ExpenseType, number> = { MATERIALS: 0, EQUIPMENT: 0, LABOR: 0, SPECIAL_TECH: 0 };
  for (const p of rows) {
    const key = (p.expenseType || "MATERIALS") as ExpenseType;
    map[key] = (map[key] ?? 0) + p.amount;
  }
  return map;
}

export function dealFinance(deal: Deal, payments: Payment[], incomes: Income[], avrs: Avr[]) {
  const spent = paidOf(payments, deal.id);
  const paid = incomeOf(incomes, deal.id);
  const avr = avrOf(avrs, deal.id);
  const dueUs = Math.max(0, deal.amount - paid);
  const avrDebt = Math.max(0, avr.sum - paid);
  const byType = expensesByType(payments, deal.id);
  return { spent, paid, dueUs, avr, avrDebt, byType };
}
