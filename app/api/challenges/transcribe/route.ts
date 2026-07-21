import OpenAI from "openai";
import { NextResponse } from "next/server";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { audit, DATA_DIRECTORY, rateLimited, readDatabase, updateDatabase } from "@/features/platform/server-store";
import type { PilotAccount } from "@/features/platform/contracts";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

function safeOriginalName(name: string) {
  const clean = name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 100);
  return clean || "voice-note.webm";
}

async function persistVoiceNote(owner: PilotAccount, audio: File, status: "queued" | "transcribed", transcript?: string) {
  const id = `voice-${randomUUID()}`;
  const originalName = safeOriginalName(audio.name);
  const storedName = `${id}-${originalName}`;
  const uploadDirectory = path.join(DATA_DIRECTORY, "uploads");
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(path.join(uploadDirectory, storedName), Buffer.from(await audio.arrayBuffer()));
  const note = { id, ownerId: owner.id, originalName, storedName, mimeType: audio.type, size: audio.size, status, ...(transcript ? { transcript } : {}), createdAt: new Date().toISOString() };
  await updateDatabase((database) => ({
    ...database,
    voiceNotes: [note, ...database.voiceNotes].slice(0, 200),
    audits: [audit(owner, status === "queued" ? "queued_voice_note" : "transcribed_voice_note", id, { size: audio.size }), ...database.audits].slice(0, 500)
  }));
  return { id, originalName, status };
}

export async function POST(request: Request) {
  const access = await requireAccount(["partner", "teacher", "admin"]);
  if (access.response || !access.account) return access.response;
  const resourceError = resourceAccessResponse(await readDatabase(), access.account);
  if (resourceError) return resourceError;
  if (rateLimited(`transcribe:${access.account.id}`, 5, 60_000)) return NextResponse.json({ error: "Voice-note transcription is temporarily rate limited. Please wait a minute." }, { status: 429 });
  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  const language = form?.get("language");
  if (!(audio instanceof File) || !audio.type.startsWith("audio/")) {
    return NextResponse.json({ error: "Please upload an audio recording." }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: "Voice notes must be 15 MB or smaller." }, { status: 413 });
  if (!process.env.OPENAI_API_KEY) {
    const voiceNote = await persistVoiceNote(access.account, audio, "queued");
    return NextResponse.json({ transcript: null, queuedForReview: true, voiceNote });
  }
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30_000 });
    const result = await client.audio.transcriptions.create({
      file: audio,
      model: process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
      ...(typeof language === "string" && language.length <= 60 ? { language } : {})
    });
    const transcript = result.text.slice(0, 1_600);
    const voiceNote = await persistVoiceNote(access.account, audio, "transcribed", transcript);
    return NextResponse.json({ transcript, queuedForReview: false, voiceNote });
  } catch {
    const voiceNote = await persistVoiceNote(access.account, audio, "queued").catch(() => null);
    return NextResponse.json({ error: "We could not transcribe that recording. A coordinator can still review the attachment.", queuedForReview: Boolean(voiceNote), voiceNote }, { status: 502 });
  }
}
