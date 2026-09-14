import { readDb } from "@/lib/db";
import { ScheduleClient } from "@/components/ScheduleClient";

export default async function SchedulePage() {
  const db = await readDb();
  return <ScheduleClient contracts={db.contracts} tasks={db.tasks} settings={db.settings} />;
}
