import { readDb } from "@/lib/db";
import { PaymentsClient } from "@/components/PaymentsClient";

export default async function PaymentsPage() {
  const db = await readDb();
  return (
    <PaymentsClient
      payments={db.payments}
      contracts={db.contracts}
      expenseTypes={db.expenseTypes}
      counterparties={db.counterparties}
    />
  );
}
