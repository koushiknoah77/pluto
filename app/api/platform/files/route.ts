import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { activeConsent, audit, canAccessStoredFile, DATA_DIRECTORY, rateLimited, readDatabase, studentMissionVisible, updateDatabase } from "@/features/platform/server-store";

export const runtime = "nodejs";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain", "text/csv", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const ACCEPTED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "webp", "txt", "csv", "pptx", "docx"]);

function safeName(name: string) { return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "upload"; }

export async function GET() {
  const access = await requireAccount();
  if (access.response || !access.account) return access.response;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  const files = database.files.filter((file) => file.missionId === database.program.mission.id && canAccessStoredFile(database, access.account!, file.ownerId, file.publicationState));
  return NextResponse.json({ files: files.map((file) => ({ id: file.id, missionId: file.missionId, ownerId: file.ownerId, originalName: file.originalName, mimeType: file.mimeType, size: file.size, version: file.version, artifactId: file.artifactId, publicationState: file.publicationState, createdAt: file.createdAt, downloadUrl: `/api/platform/files/${file.id}` })) });
}

export async function POST(request: Request) {
  const access = await requireAccount(["teacher", "student", "partner"]);
  if (access.response || !access.account) return access.response;
  if (rateLimited(`files:${access.account.id}`, 20, 60_000)) return NextResponse.json({ error: "Too many uploads in a short period. Please wait before uploading again." }, { status: 429 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file"); const missionId = form?.get("missionId"); const artifactId = form?.get("artifactId");
  if (!(file instanceof File) || typeof missionId !== "string" || missionId.length < 3) return NextResponse.json({ error: "Attach a valid file to the active mission." }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Files must be 10 MB or smaller." }, { status: 413 });
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  if (access.account.role === "student" && !studentMissionVisible(database.program)) return NextResponse.json({ error: "Student uploads open after teacher mission approval." }, { status: 403 });
  if (missionId !== database.program.mission.id) return NextResponse.json({ error: "Files can only be attached to the active mission." }, { status: 400 });
  if (access.account.role === "student" && !activeConsent(database, access.account.id, "learning-record")) return NextResponse.json({ error: "A learning-record consent is required before uploading student work." }, { status: 403 });
  const originalName = safeName(file.name);
  const extension = originalName.split(".").pop()?.toLowerCase() || "";
  if (!ACCEPTED_TYPES.has(file.type) || !ACCEPTED_EXTENSIONS.has(extension)) return NextResponse.json({ error: "That file type is not accepted for the pilot." }, { status: 415 });
  if (typeof artifactId === "string" && artifactId && !database.program.artifacts.some((artifact) => artifact.id === artifactId)) return NextResponse.json({ error: "Choose an artefact from the active mission." }, { status: 400 });
  const previous = database.files.filter((item) => item.missionId === missionId && item.originalName === originalName && item.ownerId === access.account!.id).length;
  const id = `file-${randomUUID()}`; const storedName = `${id}-${safeName(file.name)}`; const directory = path.join(DATA_DIRECTORY, "uploads");
  await mkdir(directory, { recursive: true }); await writeFile(path.join(directory, storedName), Buffer.from(await file.arrayBuffer()));
  const stored = { id, missionId, ownerId: access.account.id, originalName, storedName, mimeType: file.type, size: file.size, version: previous + 1, artifactId: typeof artifactId === "string" && artifactId ? artifactId : undefined, publicationState: "private" as const, createdAt: new Date().toISOString() };
  const updated = await updateDatabase((current) => ({ ...current, files: [stored, ...current.files], audits: [audit(access.account!, "uploaded_file", id, { bytes: file.size, version: stored.version }), ...current.audits].slice(0, 500) }));
  const publicFile = updated.files[0];
  return NextResponse.json({ file: { id: publicFile.id, missionId: publicFile.missionId, ownerId: publicFile.ownerId, originalName: publicFile.originalName, mimeType: publicFile.mimeType, size: publicFile.size, version: publicFile.version, artifactId: publicFile.artifactId, publicationState: publicFile.publicationState, createdAt: publicFile.createdAt, downloadUrl: `/api/platform/files/${publicFile.id}` } }, { status: 201 });
}
