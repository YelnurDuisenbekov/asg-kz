import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { BlobNotFoundError, del, get, put } from "@vercel/blob";
import type { Database } from "./types";

const DATA_DIR = join(process.cwd(), "data");
const DB_PATH = join(DATA_DIR, "db.json");
const DB_BLOB = "db.json";
const UPLOAD_PREFIX = "uploads/";

function useBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN) && Boolean(process.env.VERCEL);
}

function emptyDb(): Database {
  return {
    settings: { approachingDays: 7 },
    subcontractors: [],
    counterparties: [],
    people: [],
    customers: [],
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
    workItems: [],
  };
}

function normalize(parsed: Partial<Database> | null | undefined): Database {
  const base = emptyDb();
  if (!parsed) return base;
  return {
    ...base,
    ...parsed,
    settings: { ...base.settings, ...parsed.settings },
    expenseTypes: parsed.expenseTypes?.length ? parsed.expenseTypes : base.expenseTypes,
    incomeTypes: parsed.incomeTypes?.length ? parsed.incomeTypes : base.incomeTypes,
    contracts: (parsed.contracts ?? []).map((c) => ({
      ...c,
      title: c.title ?? "",
      documents: c.documents ?? [],
    })),
    people: parsed.people ?? [],
    payments: (parsed.payments ?? []).map((p) => ({
      ...p,
      status: p.status ?? "PENDING",
    })),
    workItems: (parsed.workItems ?? []).map((w) => ({
      ...w,
      documents: w.documents ?? [],
      status: w.status ?? "NEW",
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
    customers: (() => {
      const list = [...(parsed.customers ?? [])];
      for (const name of [
        ...(parsed.contracts ?? []).map((c) => c.customer),
        ...(parsed.workItems ?? []).map((w) => w.customer),
      ]) {
        const n = name?.trim();
        if (n && !list.some((c) => c.name.toLowerCase() === n.toLowerCase())) {
          list.push({ id: `cu-${list.length}-${n}`, name: n });
        }
      }
      return list;
    })(),
  };
}

function ensureLocal() {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(join(DATA_DIR, "uploads"), { recursive: true });
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>) {
  return Buffer.from(await new Response(stream).arrayBuffer());
}

async function readBlobJson(): Promise<Database> {
  const result = await get(DB_BLOB, { access: "private", useCache: false });
  if (!result?.stream) return normalize(null);
  const raw = (await streamToBuffer(result.stream)).toString("utf8");
  return normalize(JSON.parse(raw) as Database);
}

async function writeBlobJson(db: Database) {
  await put(DB_BLOB, JSON.stringify(db, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  });
}

export async function readDb(): Promise<Database> {
  if (useBlob()) {
    try {
      return await readBlobJson();
    } catch (error) {
      if (error instanceof BlobNotFoundError) return normalize(null);
      throw error;
    }
  }

  ensureLocal();
  try {
    const raw = readFileSync(DB_PATH, "utf8");
    return normalize(JSON.parse(raw) as Database);
  } catch {
    const db = normalize(null);
    writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
    return db;
  }
}

export async function writeDb(db: Database) {
  if (useBlob()) {
    await writeBlobJson(db);
    return;
  }
  ensureLocal();
  const tmp = `${DB_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  renameSync(tmp, DB_PATH);
}

export async function mutateDb<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const db = await readDb();
  const result = await fn(db);
  await writeDb(db);
  return result;
}

export function uid() {
  return crypto.randomUUID();
}

function uploadPath(storedName: string) {
  return `${UPLOAD_PREFIX}${storedName}`;
}

export async function saveUpload(storedName: string, data: Buffer) {
  if (useBlob()) {
    await put(uploadPath(storedName), data, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/octet-stream",
      cacheControlMaxAge: 60,
    });
    return;
  }
  ensureLocal();
  await mkdir(join(DATA_DIR, "uploads"), { recursive: true });
  await writeFile(join(DATA_DIR, "uploads", storedName), data);
}

export async function deleteUpload(storedName: string) {
  if (useBlob()) {
    await del(uploadPath(storedName)).catch(() => undefined);
    return;
  }
  await unlink(join(DATA_DIR, "uploads", storedName)).catch(() => undefined);
}

export async function readUpload(storedName: string): Promise<Buffer | null> {
  if (useBlob()) {
    const result = await get(uploadPath(storedName), { access: "private", useCache: true });
    if (!result?.stream) return null;
    return streamToBuffer(result.stream);
  }
  try {
    return await readFile(join(DATA_DIR, "uploads", storedName));
  } catch {
    return null;
  }
}
