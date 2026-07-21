import { NextResponse } from "next/server";
import { readDatabase } from "@/features/platform/server-store";

export async function GET() {
  const sessionConfigured = process.env.NODE_ENV !== "production" || Boolean(process.env.PLUTO_SESSION_SECRET);
  let storeReady = false;
  if (sessionConfigured) {
    try {
      await readDatabase();
      storeReady = true;
    } catch {
      storeReady = false;
    }
  }
  const ready = sessionConfigured && storeReady;
  const aiMode = process.env.OPENAI_API_KEY ? "live" : "template";
  return NextResponse.json({
    ok: ready,
    ready,
    sessionConfigured,
    storeReady,
    mentorConfigured: Boolean(process.env.OPENAI_API_KEY),
    aiMode,
    aiCapabilities: {
      missionDrafting: aiMode,
      coaching: aiMode,
      transcription: process.env.OPENAI_API_KEY ? "live" : "queued"
    }
  }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
