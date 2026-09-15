import { PaymentsClient } from "@/components/PaymentsClient";
import { readDb } from "@/lib/db";

export default async function PaymentsPage() {
  const db = await readDb();
  return <PaymentsClient payments={db.payments} deals={db.deals} counterparties={db.counterparties} />;
}
