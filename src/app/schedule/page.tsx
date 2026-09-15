import { ScheduleBoard } from "@/components/ScheduleBoard";
import { readDb } from "@/lib/db";

export default async function SchedulePage() {
  const db = await readDb();
  return <ScheduleBoard deals={db.deals} />;
}
