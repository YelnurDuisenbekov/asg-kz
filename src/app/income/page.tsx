import { IncomeClient } from "@/components/IncomeClient";
import { readDb } from "@/lib/db";

export default async function IncomePage() {
  const db = await readDb();
  return <IncomeClient incomes={db.incomes} deals={db.deals} />;
}
