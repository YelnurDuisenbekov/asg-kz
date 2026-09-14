import { NextRequest, NextResponse } from "next/server";
import { readDb, readUpload } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storedName: string }> },
) {
  const { storedName } = await params;
  if (!storedName || storedName.includes("..") || storedName.includes("/") || storedName.includes("\\")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const db = await readDb();
  const doc = [
    ...db.payments.flatMap((p) => p.documents),
    ...db.contracts.flatMap((c) => c.documents ?? []),
    ...(db.workItems ?? []).flatMap((w) => w.documents ?? []),
  ].find((d) => d.storedName === storedName);
  if (!doc) return new NextResponse("Not found", { status: 404 });
  const file = await readUpload(storedName);
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`,
      "Content-Type": "application/octet-stream",
    },
  });
}
