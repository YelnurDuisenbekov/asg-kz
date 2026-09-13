import { readDb } from "@/lib/db";
import { IncomeClient } from "@/components/IncomeClient";

export default function IncomePage() {
  const db = readDb();
  return (
    <IncomeClient
      incomes={db.incomes}
      planned={db.plannedIncomes}
      contracts={db.contracts}
      incomeTypes={db.incomeTypes}
    />
  );
}
