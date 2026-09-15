import Link from "next/link";
import { notFound } from "next/navigation";
import { DealEditor } from "@/components/DealEditor";
import { readDb } from "@/lib/db";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDb();
  const deal = db.deals.find((d) => d.id === id);
  if (!deal) notFound();
  return (
    <div className="space-y-2">
      <Link href="/" className="text-sm text-slate-600">
        ← Назад
      </Link>
      <DealEditor
        deal={deal}
        customers={db.customers}
        subcontractors={db.subcontractors}
        payments={db.payments.filter((p) => p.dealId === deal.id)}
        incomes={db.incomes.filter((i) => i.dealId === deal.id)}
        avrs={db.avrs.filter((a) => a.dealId === deal.id)}
      />
    </div>
  );
}
