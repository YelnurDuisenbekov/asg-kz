import { Suspense } from "react";
import { readDb } from "@/lib/db";
import { ContractsClient } from "@/components/ContractsClient";

export default function ContractsPage() {
  const db = readDb();
  return (
    <Suspense>
      <ContractsClient
        contracts={db.contracts}
        subcontractors={db.subcontractors}
        people={db.people ?? []}
        customers={db.customers ?? []}
        tasks={db.tasks ?? []}
        approachingDays={db.settings.approachingDays}
        payments={db.payments ?? []}
        incomes={db.incomes ?? []}
        plannedIncomes={db.plannedIncomes ?? []}
        expenseTypes={db.expenseTypes ?? []}
        incomeTypes={db.incomeTypes ?? []}
      />
    </Suspense>
  );
}
