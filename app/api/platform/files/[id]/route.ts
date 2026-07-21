import { readFile, unlink } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { canAccessStoredFile, DATA_DIRECTORY, readDatabase, updateDatabase, audit } from "@/features/platform/server-store";

function downloadName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "pluto-file";
}

function storedPath(storedName: string) {
  const directory = path.resolve(DATA_DIRECTORY, "uploads");
  const target = path.resolve(directory, storedName);
  if (!target.startsWith(`${directory}${path.sep}`)) throw new Error("Invalid stored file path.");
  return target;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAccount();
  if (access.response || !access.account) return access.response;
  const { id } = await params;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  const file = database.files.find((item) => item.id === id);
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
  if (file.missionId !== database.program.mission.id) return NextResponse.json({ error: "That file is no longer part of the active mission." }, { status: 404 });
  if (!canAccessStoredFile(database, access.account, file.ownerId, file.publicationState)) return NextResponse.json({ error: "You do not have access to this file." }, { status: 403 });
  try {
    const body = await readFile(storedPath(file.storedName));
    void updateDatabase((current) => ({ ...current, audits: [audit(access.account!, "downloaded_file", file.id), ...current.audits].slice(0, 500) }));
    return new NextResponse(body, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${downloadName(file.originalName)}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return NextResponse.json({ error: "The stored file is unavailable." }, { status: 404 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAccount(["teacher", "admin"]);
  if (access.response || !access.account) return access.response;
  const { id } = await params;
  const body = await request.json().catch(() => null) as { publicationState?: unknown } | null;
  if (body?.publicationState !== "private" && body?.publicationState !== "teacher_approved" && body?.publicationState !== "partner_visible") {
    return NextResponse.json({ error: "Choose private, teacher approved, or partner visible." }, { status: 400 });
  }
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  const file = database.files.find((item) => item.id === id);
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
  const publicationState = body.publicationState;
  const updated = await updateDatabase((current) => ({
    ...current,
    files: current.files.map((item) => item.id === id ? { ...item, publicationState } : item),
    audits: [audit(access.account!, "updated_file_publication", id, { publicationState }), ...current.audits].slice(0, 500)
  }));
  const next = updated.files.find((item) => item.id === id)!;
  return NextResponse.json({ file: { id: next.id, missionId: next.missionId, ownerId: next.ownerId, originalName: next.originalName, mimeType: next.mimeType, size: next.size, version: next.version, artifactId: next.artifactId, publicationState: next.publicationState, createdAt: next.createdAt, downloadUrl: `/api/platform/files/${next.id}` } });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAccount(["teacher", "student", "admin"]);
  if (access.response || !access.account) return access.response;
  const { id } = await params;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  const file = database.files.find((item) => item.id === id);
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
  if (file.missionId !== database.program.mission.id) return NextResponse.json({ error: "That file is not part of the active mission." }, { status: 404 });
  if (access.account.role === "student" && file.ownerId !== access.account.id) return NextResponse.json({ error: "You do not have access to delete this file." }, { status: 403 });
  try { await unlink(storedPath(file.storedName)); } catch { /* Metadata removal still makes the file inaccessible. */ }
  await updateDatabase((current) => ({ ...current, files: current.files.filter((item) => item.id !== id), audits: [audit(access.account!, "deleted_file", id), ...current.audits].slice(0, 500) }));
  return NextResponse.json({ ok: true });
}
