import Link from "next/link";
import { PipelineBoard } from "@/components/PipelineBoard";
import { readDb } from "@/lib/db";

export default async function HomePage() {
  const db = await readDb();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Договоры</h1>
        <Link href="/deals/new" className="inline-flex min-h-9 items-center bg-slate-900 px-3 text-sm font-semibold text-white">
          Добавить
        </Link>
      </div>
      <PipelineBoard deals={db.deals} payments={db.payments} incomes={db.incomes} avrs={db.avrs} />
    </div>
  );
}
