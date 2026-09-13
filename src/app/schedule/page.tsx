import { readDb } from "@/lib/db";
import { ScheduleClient } from "@/components/ScheduleClient";

export default function SchedulePage() {
  const db = readDb();
  return <ScheduleClient contracts={db.contracts} tasks={db.tasks} settings={db.settings} />;
}
