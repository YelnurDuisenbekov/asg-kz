import { ListsClient } from "@/components/ListsClient";
import { readDb } from "@/lib/db";

export default async function ListsPage() {
  const db = await readDb();
  return <ListsClient customers={db.customers} subcontractors={db.subcontractors} counterparties={db.counterparties} />;
}
