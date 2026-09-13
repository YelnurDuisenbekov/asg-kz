import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import type { Database } from "./types";

const DATA_DIR = process.env.VERCEL
  ? join("/tmp", "asg-data")
  : join(process.cwd(), "data");
const DB_PATH = join(DATA_DIR, "db.json");

function emptyDb(): Database {
  return {
    settings: { approachingDays: 7 },
    subcontractors: [],
    counterparties: [],
    contracts: [],
    expenseTypes: [
      { id: "exp-contract", name: "По договору", isSystem: true, code: "CONTRACT" },
      { id: "exp-aup", name: "АУП", isSystem: true },
      { id: "exp-fot", name: "ФОТ", isSystem: true },
      { id: "exp-tax", name: "Налоги", isSystem: true },
    ],
    incomeTypes: [
      { id: "inc-contract", name: "По договору", isSystem: true, code: "CONTRACT" },
    ],
    payments: [],
    incomes: [],
    plannedIncomes: [],
    tasks: [],
  };
}

function ensure() {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(join(DATA_DIR, "uploads"), { recursive: true });
}

export function readDb(): Database {
  ensure();
  try {
    const raw = readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as Database;
    const base = emptyDb();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...parsed.settings },
      expenseTypes: parsed.expenseTypes?.length ? parsed.expenseTypes : base.expenseTypes,
      incomeTypes: parsed.incomeTypes?.length ? parsed.incomeTypes : base.incomeTypes,
      contracts: (parsed.contracts ?? []).map((c) => ({
        ...c,
        documents: c.documents ?? [],
      })),
      payments: (parsed.payments ?? []).map((p) => ({
        ...p,
        status: p.status ?? "PENDING",
      })),
      counterparties: (() => {
        const list = [...(parsed.counterparties ?? [])];
        for (const p of parsed.payments ?? []) {
          const name = p.counterparty?.trim();
          if (name && !list.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
            list.push({ id: `cp-${list.length}-${name}`, name });
          }
        }
        return list;
      })(),
    };
  } catch {
    const db = emptyDb();
    writeDb(db);
    return db;
  }
}

export function writeDb(db: Database) {
  ensure();
  const tmp = `${DB_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  renameSync(tmp, DB_PATH);
}

export function mutateDb<T>(fn: (db: Database) => T): T {
  const db = readDb();
  const result = fn(db);
  writeDb(db);
  return result;
}

export function uid() {
  return crypto.randomUUID();
}

export function uploadsDir() {
  ensure();
  return join(DATA_DIR, "uploads");
}

export function dbDir() {
  return dirname(DB_PATH);
}
