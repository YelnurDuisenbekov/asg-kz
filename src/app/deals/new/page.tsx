import Link from "next/link";
import { DealEditor } from "@/components/DealEditor";
import { readDb } from "@/lib/db";

export default async function NewDealPage() {
  const db = await readDb();
  return (
    <div className="space-y-2">
      <Link href="/" className="text-sm text-slate-600">
        ← Назад
      </Link>
      <DealEditor customers={db.customers} subcontractors={db.subcontractors} />
    </div>
  );
}
