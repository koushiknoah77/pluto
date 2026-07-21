import { NextResponse } from "next/server";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { readDatabase } from "@/features/platform/server-store";

export async function GET() {
  const access = await requireAccount(["partner", "teacher", "admin"]);
  if (access.response || !access.account) return access.response;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account!);
  if (resourceError) return resourceError;
  const notes = database.voiceNotes
    .filter((note) => access.account?.role === "partner" ? note.ownerId === access.account.id : true)
    .map((note) => ({ id: note.id, ownerId: note.ownerId, originalName: note.originalName, mimeType: note.mimeType, size: note.size, status: note.status, transcript: note.transcript, createdAt: note.createdAt, downloadUrl: `/api/challenges/voice-notes/${note.id}` }));
  return NextResponse.json({ voiceNotes: notes });
}
