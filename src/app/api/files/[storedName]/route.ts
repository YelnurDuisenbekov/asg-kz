import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { join } from "path";
import { stat } from "fs/promises";
import { readDb, uploadsDir } from "@/lib/db";
import { Readable } from "stream";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storedName: string }> },
) {
  const { storedName } = await params;
  if (!storedName || storedName.includes("..") || storedName.includes("/") || storedName.includes("\\")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const db = readDb();
  const doc = [
    ...db.payments.flatMap((p) => p.documents),
    ...db.contracts.flatMap((c) => c.documents ?? []),
  ].find((d) => d.storedName === storedName);
  if (!doc) return new NextResponse("Not found", { status: 404 });
  const path = join(uploadsDir(), storedName);
  try {
    await stat(path);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  const stream = createReadStream(path);
  const web = Readable.toWeb(stream) as ReadableStream;
  return new NextResponse(web, {
    headers: {
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`,
      "Content-Type": "application/octet-stream",
    },
  });
}
