import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { DATA_DIRECTORY, readDatabase } from "@/features/platform/server-store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAccount(["partner", "teacher", "admin"]);
  if (access.response || !access.account) return access.response;
  const { id } = await params;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account!);
  if (resourceError) return resourceError;
  const note = database.voiceNotes.find((item) => item.id === id);
  if (!note || (access.account.role === "partner" && note.ownerId !== access.account.id)) return NextResponse.json({ error: "Voice note not found." }, { status: 404 });
  const uploadDirectory = path.resolve(DATA_DIRECTORY, "uploads");
  const filePath = path.resolve(uploadDirectory, note.storedName);
  if (!filePath.startsWith(`${uploadDirectory}${path.sep}`)) return NextResponse.json({ error: "Voice note path is invalid." }, { status: 400 });
  try {
    const data = await readFile(filePath);
    return new NextResponse(data, { headers: { "Content-Type": note.mimeType, "Content-Length": String(data.byteLength), "Content-Disposition": `inline; filename="${note.originalName}"`, "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Voice note attachment is unavailable." }, { status: 404 });
  }
}
