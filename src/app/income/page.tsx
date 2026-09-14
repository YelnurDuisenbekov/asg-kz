import { readDb } from "@/lib/db";
import { IncomeClient } from "@/components/IncomeClient";

export default async function IncomePage() {
  const db = await readDb();
  return (
    <IncomeClient
      incomes={db.incomes}
      planned={db.plannedIncomes}
      contracts={db.contracts}
      incomeTypes={db.incomeTypes}
    />
  );
}
