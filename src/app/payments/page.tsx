import { readDb } from "@/lib/db";
import { PaymentsClient } from "@/components/PaymentsClient";

export default function PaymentsPage() {
  const db = readDb();
  return (
    <PaymentsClient
      payments={db.payments}
      contracts={db.contracts}
      expenseTypes={db.expenseTypes}
      counterparties={db.counterparties}
    />
  );
}
