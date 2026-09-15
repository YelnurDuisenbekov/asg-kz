import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { BlobNotFoundError, del, get, put } from "@vercel/blob";
import type { Database, Deal } from "./types";

const DATA_DIR = join(process.cwd(), "data");
const DB_PATH = join(DATA_DIR, "db.json");
const DB_BLOB = "db.json";
const UPLOAD_PREFIX = "uploads/";

function useBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN) && Boolean(process.env.VERCEL);
}

function emptyEstimate() {
  return { materials: 0, equipment: 0, labor: 0, specialTech: 0, profit: 0 };
}

function emptyDb(): Database {
  return {
    schemaVersion: 2,
    customers: [],
    counterparties: [],
    subcontractors: [],
    deals: [],
    payments: [],
    incomes: [],
    avrs: [],
  };
}

function normalizeDeal(d: Partial<Deal>): Deal {
  return {
    id: d.id ?? crypto.randomUUID(),
    cluster: d.cluster ?? "PRETENDER",
    executor: d.executor ?? "ASG",
    title: d.title ?? "",
    customer: d.customer ?? "",
    amount: d.amount ?? 0,
    documents: d.documents ?? [],
    deadline: d.deadline ?? { mode: "DATE" },
    createdAt: d.createdAt ?? new Date().toISOString(),
    clusterEnteredAt: d.clusterEnteredAt ?? d.createdAt ?? new Date().toISOString(),
    announcementNumber: d.announcementNumber,
    lotNumber: d.lotNumber,
    tenderUrl: d.tenderUrl,
    submissionDocuments: d.submissionDocuments ?? [],
    resultsDeadline: d.resultsDeadline,
    tenderStatus: d.tenderStatus,
    protocolDocuments: d.protocolDocuments ?? [],
    contractNumber: d.contractNumber,
    contractDate: d.contractDate,
    estimate: { ...emptyEstimate(), ...d.estimate },
    tasks: d.tasks ?? [],
    approvalDays: d.approvalDays,
    signingDays: d.signingDays,
    conclusionStartedAt: d.conclusionStartedAt,
    executionType: d.executionType,
    subcontractorIds: d.subcontractorIds ?? [],
  };
}

function normalize(parsed: Partial<Database> | null | undefined): Database {
  const base = emptyDb();
  if (!parsed || parsed.schemaVersion !== 2) return base;
  return {
    ...base,
    ...parsed,
    schemaVersion: 2,
    customers: parsed.customers ?? [],
    counterparties: parsed.counterparties ?? [],
    subcontractors: parsed.subcontractors ?? [],
    deals: (parsed.deals ?? []).map(normalizeDeal),
    payments: (parsed.payments ?? []).map((p) => ({
      ...p,
      expenseType: p.expenseType ?? "MATERIALS",
    })),
    incomes: parsed.incomes ?? [],
    avrs: parsed.avrs ?? [],
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
