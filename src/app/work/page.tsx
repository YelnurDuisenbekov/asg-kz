import { Suspense } from "react";
import { readDb } from "@/lib/db";
import { WorkClient } from "@/components/WorkClient";

export default async function WorkPage() {
  const db = await readDb();
  return (
    <Suspense>
      <WorkClient
        items={(db.workItems ?? []).filter((w) => w.status !== "SIGNED")}
        people={db.people ?? []}
        customers={db.customers ?? []}
      />
    </Suspense>
  );
}
