import { clusterLabel, dateRu, executionLabel, money, tenderStatusLabel } from "./format";
import { dueDate, toIso } from "./deadline";
import { expenseLabel } from "./finance";
import type { Deal, Payment } from "./types";

function line(label: string, from: string, to: string) {
  if (from === to) return null;
  return `${label}: ${from || "—"} → ${to || "—"}`;
}

function endLabel(deal: Deal) {
  const due = dueDate(deal.deadline);
  return due ? dateRu(toIso(due)) : "";
}

export function describeDealChanges(prev: Deal | undefined, next: Deal): string[] {
  if (!prev) return [`Создан договор «${next.title}»`];
  const out: (string | null)[] = [];
  out.push(line("Этап", clusterLabel(prev.cluster), clusterLabel(next.cluster)));
  out.push(line("Наименование", prev.title, next.title));
  out.push(line("Заказчик", prev.customer, next.customer));
  out.push(line("Сумма", money(prev.amount), money(next.amount)));
  out.push(line("Статус тендера", tenderStatusLabel(prev.tenderStatus), tenderStatusLabel(next.tenderStatus)));
  out.push(line("Номер договора", prev.contractNumber ?? "", next.contractNumber ?? ""));
  out.push(line("Дата заключения", dateRu(prev.contractDate), dateRu(next.contractDate)));
  out.push(line("Окончание договора", endLabel(prev), endLabel(next)));
  out.push(line("Исполнение", executionLabel(prev.executionType), executionLabel(next.executionType)));
  if ((prev.subcontractorIds || []).join() !== (next.subcontractorIds || []).join()) {
    out.push(`Субподряд: выбрано ${next.subcontractorIds.length}`);
  }
  const pe = prev.estimate;
  const ne = next.estimate;
  if (pe.materials !== ne.materials) out.push(line("Смета · материалы", money(pe.materials), money(ne.materials)));
  if (pe.equipment !== ne.equipment) out.push(line("Смета · оборудование", money(pe.equipment), money(ne.equipment)));
  if (pe.labor !== ne.labor) out.push(line("Смета · работа", money(pe.labor), money(ne.labor)));
  if (pe.specialTech !== ne.specialTech) out.push(line("Смета · спецтехника", money(pe.specialTech), money(ne.specialTech)));
  if (JSON.stringify(prev.tasks) !== JSON.stringify(next.tasks)) out.push("Обновлён сетевой график");
  return out.filter((x): x is string => Boolean(x));
}

export function describePaymentChanges(prev: Payment | undefined, next: Payment): string[] {
  if (!prev) return [`Добавлен расход ${money(next.amount)} (${expenseLabel(next.expenseType)}) · ${next.purpose}`];
  const out: (string | null)[] = [];
  out.push(line("Контрагент", prev.counterparty, next.counterparty));
  out.push(line("Сумма", money(prev.amount), money(next.amount)));
  out.push(line("Назначение", prev.purpose, next.purpose));
  out.push(line("Тип расхода", expenseLabel(prev.expenseType), expenseLabel(next.expenseType)));
  out.push(line("Статус", prev.status, next.status));
  return out.filter((x): x is string => Boolean(x));
}
