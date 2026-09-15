"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { deleteDeal, upsertDeal } from "@/lib/actions";
import { clusterLabel, daysLeft, executorLabel, money, tenderStatusLabel, uniqueNames } from "@/lib/format";
import { toIso } from "@/lib/deadline";
import { CLUSTERS, clusterIndex, draftFromForm, fillFieldsMessage, missingFields } from "@/lib/gates";
import type { Avr, Cluster, Deal, Income, NamedItem, Payment } from "@/lib/types";
import { DeadlineField, DocsField, Field, MoneyInput, NamedChecklist, NamedSelect, inputClass } from "./fields";
import { DealLedger } from "./DealLedger";
import { TaskTree } from "./TaskTree";
import { showNotice } from "./ChangeNotice";

function Timer({ label, days, from }: { label: string; days?: number; from?: string }) {
  if (!days) return <p className="text-sm text-slate-500">{label}: укажите количество дней</p>;
  const start = from ? new Date(from) : new Date();
  const due = new Date(start);
  due.setDate(due.getDate() + days);
  const left = daysLeft({ mode: "DATE", date: toIso(due) }) ?? 0;
  const pct = Math.max(0, Math.min(100, ((days - left) / days) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className={left < 0 ? "text-red-700" : "text-slate-600"}>
          {left < 0 ? `просрочено на ${-left} дн.` : `осталось ${left} из ${days} дн.`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-sm bg-slate-200">
        <div className={`h-full ${left < 0 ? "bg-red-600" : "bg-slate-800"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const box = "border border-slate-300 bg-white p-3";
const pill =
  "min-h-9 flex-1 rounded-md px-2 text-center text-xs font-medium leading-tight sm:text-sm";

export function DealEditor({
  deal,
  customers,
  subcontractors,
  payments = [],
  incomes = [],
  avrs = [],
}: {
  deal?: Deal;
  customers: NamedItem[];
  subcontractors: NamedItem[];
  payments?: Payment[];
  incomes?: Income[];
  avrs?: Avr[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [cluster, setCluster] = useState<Cluster>(deal?.cluster ?? "PRETENDER");
  const [executor, setExecutor] = useState(deal?.executor ?? "ASG");
  const [tenderStatus, setTenderStatus] = useState(deal?.tenderStatus ?? "REVIEW");
  const [executionType, setExecutionType] = useState(deal?.executionType ?? "OWN");
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [subs, setSubs] = useState<string[]>(deal?.subcontractorIds ?? []);
  const [extraSubs, setExtraSubs] = useState<NamedItem[]>([]);

  const showTender = clusterIndex(cluster) >= 1;
  const showConclusion = clusterIndex(cluster) >= 2;
  const showExecution = clusterIndex(cluster) >= 3;
  const miss = (key: string) => missing.has(key);

  function tryCluster(next: Cluster) {
    if (clusterIndex(next) <= clusterIndex(cluster)) {
      setMissing(new Set());
      setError("");
      if (next !== cluster) showNotice([`Этап: ${clusterLabel(cluster)} → ${clusterLabel(next)}`]);
      setCluster(next);
      return;
    }
    if (clusterIndex(next) > clusterIndex(cluster) + 1) {
      const step = CLUSTERS[clusterIndex(cluster) + 1];
      setError(`Сначала заполните этап «${clusterLabel(cluster)}» и перейдите на «${clusterLabel(step)}»`);
      return;
    }
    const form = formRef.current;
    if (!form) return;
    const draft = draftFromForm(new FormData(form), deal, {
      cluster,
      executor,
      tenderStatus,
      executionType,
      subcontractorIds: subs,
    });
    const missList = missingFields(draft, cluster);
    if (clusterIndex(next) >= 2 && tenderStatus !== "WON") {
      if (!missList.some((m) => m.key === "tenderStatus")) {
        missList.push({ key: "tenderStatus", label: "Статус тендера (Выиграли)" });
      }
    }
    if (missList.length) {
      setMissing(new Set(missList.map((m) => m.key)));
      setError(fillFieldsMessage(missList) ?? "");
      return;
    }
    setMissing(new Set());
    setError("");
    setCluster(next);
    showNotice([`Этап: ${clusterLabel(cluster)} → ${clusterLabel(next)}`]);
  }

  async function onSubmit(formData: FormData) {
    setBusy(true);
    setError("");
    const res = await upsertDeal(formData);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    showNotice(res.changes?.length ? res.changes : ["Договор сохранён"]);
    router.push(`/deals/${res.id}`);
    router.refresh();
  }

  const sortedSubs = useMemo(
    () => uniqueNames([...subcontractors, ...extraSubs]),
    [subcontractors, extraSubs],
  );

  return (
    <>
    <form ref={formRef} action={onSubmit} className="space-y-3">
      {deal ? <input type="hidden" name="id" value={deal.id} /> : null}
      <input type="hidden" name="cluster" value={cluster} />
      <input type="hidden" name="executor" value={executor} />
      <input type="hidden" name="tenderStatus" value={tenderStatus} />
      <input type="hidden" name="executionType" value={executionType} />

      <section className={box}>
        <div className="grid grid-cols-4 gap-1">
          {CLUSTERS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => tryCluster(c)}
              className={`min-h-10 rounded-md px-1 py-1.5 text-center text-[11px] font-semibold leading-tight sm:text-xs ${
                cluster === c ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-800"
              }`}
            >
              {c === "CONCLUSION" ? "Заключение" : c === "EXECUTION" ? "Исполнение" : clusterLabel(c)}
            </button>
          ))}
        </div>
        {error ? <p className="mt-2 border border-red-500 bg-red-50 px-2 py-2 text-sm text-red-800">{error}</p> : null}
      </section>

      <section className={box}>
        <h2 className="mb-3 text-sm font-semibold">Предтендер</h2>
        <div className="flex flex-col gap-3">
          <Field label="Исполнитель">
            <div className="flex gap-1">
              {(["ASG", "STROYPROJECT"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setExecutor(v)}
                  className={`${pill} ${executor === v ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"}`}
                >
                  {executorLabel(v)}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Заказчик" invalid={miss("customer")}>
            <NamedSelect
              name="customer"
              kind="customers"
              items={customers}
              defaultValue={deal?.customer}
              placeholder="Выберите заказчика"
              addLabel="Добавить заказчика"
            />
          </Field>
          <Field label="Наименование" invalid={miss("title")}>
            <input name="title" required defaultValue={deal?.title} className={inputClass} placeholder="Как называется работа" />
          </Field>
          <Field label="Сумма" invalid={miss("amount")}>
            <MoneyInput name="amount" defaultValue={deal?.amount} />
          </Field>
          {showExecution ? null : (
            <DeadlineField prefix="deadline" label="Срок исполнения" value={deal?.deadline} invalid={miss("deadline")} />
          )}
          <Field label="Документы" hint="ТЗ и материалы предтендера" invalid={miss("documents")}>
            <DocsField name="documents" keepName="keepDocIds" existing={deal?.documents} />
          </Field>
        </div>
      </section>

      {showTender ? (
        <section className={box}>
          <h2 className="mb-3 text-sm font-semibold">Тендер</h2>
          <div className="flex flex-col gap-3">
            <Field label="Номер объявления" invalid={miss("announcementNumber")}>
              <input name="announcementNumber" defaultValue={deal?.announcementNumber} className={inputClass} />
            </Field>
            <Field label="Номер лота" invalid={miss("lotNumber")}>
              <input name="lotNumber" defaultValue={deal?.lotNumber} className={inputClass} />
            </Field>
            <Field label="Ссылка на тендер" invalid={miss("tenderUrl")}>
              <input name="tenderUrl" defaultValue={deal?.tenderUrl} className={inputClass} placeholder="https://" />
            </Field>
            <Field label="Статус тендера" invalid={miss("tenderStatus")}>
              <div className="flex gap-1">
                {(
                  [
                    ["REVIEW", "Рассмотрение"],
                    ["LOST", "Проиграли"],
                    ["WON", "Выиграли"],
                  ] as const
                ).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      if (v === tenderStatus) return;
                      if (!confirm(`Уверены, что хотите сменить статус тендера на «${l}»?`)) return;
                      showNotice([`Статус тендера: ${tenderStatusLabel(tenderStatus)} → ${tenderStatusLabel(v)}`]);
                      setTenderStatus(v);
                    }}
                    className={`${pill} ${tenderStatus === v ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>
            {tenderStatus === "REVIEW" ? (
              <DeadlineField prefix="resultsDeadline" label="Срок ожидания результатов" value={deal?.resultsDeadline} invalid={miss("resultsDeadline")} />
            ) : null}
            <Field label="Документы на подачу" invalid={miss("submissionDocuments")}>
              <DocsField name="submissionDocuments" keepName="keepSubDocIds" existing={deal?.submissionDocuments} />
            </Field>
            {tenderStatus === "WON" ? (
              <Field label="Протокол" invalid={miss("protocolDocuments")}>
                <DocsField name="protocolDocuments" keepName="keepProtoDocIds" existing={deal?.protocolDocuments} />
              </Field>
            ) : null}
          </div>
        </section>
      ) : null}

      {showConclusion ? (
        <>
          <section className={box}>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">ПТО</div>
            <h2 className="mb-3 text-sm font-semibold">Смета</h2>
            <div className="flex flex-col gap-3">
              <Field label="Материалы" invalid={miss("estimate")}>
                <MoneyInput name="estMaterials" defaultValue={deal?.estimate.materials} />
              </Field>
              <Field label="Оборудование" invalid={miss("estimate")}>
                <MoneyInput name="estEquipment" defaultValue={deal?.estimate.equipment} />
              </Field>
              <Field label="Работа" invalid={miss("estimate")}>
                <MoneyInput name="estLabor" defaultValue={deal?.estimate.labor} />
              </Field>
              <Field label="Спецтехника" invalid={miss("estimate")}>
                <MoneyInput name="estSpecialTech" defaultValue={deal?.estimate.specialTech} />
              </Field>
              <Field label="Сметная прибыль" invalid={miss("estimate")}>
                <MoneyInput name="estProfit" defaultValue={deal?.estimate.profit} />
              </Field>
              <p className="text-sm text-slate-600">
                Итого:{" "}
                {money(
                  (deal?.estimate.materials ?? 0) +
                    (deal?.estimate.equipment ?? 0) +
                    (deal?.estimate.labor ?? 0) +
                    (deal?.estimate.specialTech ?? 0) +
                    (deal?.estimate.profit ?? 0),
                )}
              </p>
            </div>
          </section>
          <section className={box}>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">ПТО</div>
            <h2 className="mb-2 text-sm font-semibold">Сетевой график</h2>
            <TaskTree name="tasksJson" defaultTasks={deal?.tasks ?? []} />
          </section>
          <section className={box}>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Тендерный отдел</div>
            <h2 className="mb-3 text-sm font-semibold">Согласование и подписание</h2>
            <div className="flex flex-col gap-3">
              <Field label="Номер договора" invalid={miss("contractNumber")}>
                <input name="contractNumber" defaultValue={deal?.contractNumber} className={inputClass} />
              </Field>
              <Field label="Дата договора" invalid={miss("contractDate")}>
                <input type="date" name="contractDate" defaultValue={deal?.contractDate} className={inputClass} />
              </Field>
              <Field label="Срок согласования, календарных дней" invalid={miss("approvalDays")}>
                <input type="number" min={0} name="approvalDays" defaultValue={deal?.approvalDays ?? ""} className={inputClass} />
              </Field>
              <Field label="Срок подписания, календарных дней" invalid={miss("signingDays")}>
                <input type="number" min={0} name="signingDays" defaultValue={deal?.signingDays ?? ""} className={inputClass} />
              </Field>
              <Timer label="Согласование договора" days={deal?.approvalDays} from={deal?.conclusionStartedAt} />
              <Timer label="Подписание договора" days={deal?.signingDays} from={deal?.conclusionStartedAt} />
            </div>
          </section>
        </>
      ) : null}

      {showExecution ? (
        <section className={box}>
          <h2 className="mb-3 text-sm font-semibold">Исполнение</h2>
          <div className="flex flex-col gap-3">
            <DeadlineField prefix="deadline" label="Срок исполнения договора" value={deal?.deadline} invalid={miss("deadline")} />
            <Field label="Статус исполнения">
              <div className="flex gap-1">
                {(
                  [
                    ["OWN", "Своими силами"],
                    ["PARTIAL_SUB", "Частичный субподряд"],
                    ["FULL_SUB", "Полный субподряд"],
                  ] as const
                ).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setExecutionType(v)}
                    className={`${pill} ${executionType === v ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>
            {executionType !== "OWN" ? (
              <Field label="Субподряд — можно выбрать несколько" invalid={miss("subcontractorIds")}>
                <NamedChecklist
                  name="subcontractorIds"
                  kind="subcontractors"
                  items={sortedSubs}
                  selected={subs}
                  placeholder="Выберите субподряд"
                  addLabel="Добавить субподряд"
                  onToggle={(id, on) => setSubs(on ? [...subs, id] : subs.filter((x) => x !== id))}
                  onCreated={(item) => {
                    setExtraSubs((x) => uniqueNames([...x, item]));
                    setSubs((x) => (x.includes(item.id) ? x : [...x, item.id]));
                  }}
                />
              </Field>
            ) : null}
          </div>
        </section>
      ) : null}

      {!showConclusion ? <input type="hidden" name="tasksJson" value={JSON.stringify(deal?.tasks ?? [])} /> : null}

      {error ? <p className="border border-red-500 bg-red-50 px-3 py-3 text-sm text-red-800">{error}</p> : null}

      <div className="flex flex-col gap-2">
        <button disabled={busy} className="min-h-11 rounded-md bg-slate-900 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? "Сохраняем…" : deal ? "Сохранить" : "Создать предтендер"}
        </button>
        {deal ? (
          <button
            type="button"
            className="min-h-11 text-sm font-medium text-red-800"
            onClick={async () => {
              if (!confirm("Удалить договор?")) return;
              await deleteDeal(deal.id);
              showNotice(["Договор удалён"]);
              router.push("/");
            }}
          >
            Удалить
          </button>
        ) : null}
      </div>
    </form>
    {showExecution && deal ? (
      <DealLedger deal={deal} payments={payments} incomes={incomes} avrs={avrs} />
    ) : null}
    </>
  );
}
