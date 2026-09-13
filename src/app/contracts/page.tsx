import { readDb } from "@/lib/db";
import { ContractsClient } from "@/components/ContractsClient";

export default function ContractsPage() {
  const db = readDb();
  return <ContractsClient contracts={db.contracts} subcontractors={db.subcontractors} />;
}
