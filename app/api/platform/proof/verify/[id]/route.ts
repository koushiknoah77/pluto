import { NextResponse } from "next/server";
import { allStudentsHaveConsent, rateLimited, readDatabase } from "@/features/platform/server-store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "public";
  if (rateLimited(`proof:${forwarded}`, 60, 60_000)) return NextResponse.json({ error: "Too many verification requests. Please try again shortly." }, { status: 429, headers: { "Cache-Control": "no-store" } });
  if (id !== "2026-0716-SUNDOWN" && !/^proof-[a-z0-9-]{12,120}$/.test(id)) return NextResponse.json({ id, verified: false, mission: null, school: null, issuedAt: null }, { headers: { "Cache-Control": "no-store" } });
  const database = await readDatabase();
  const requestedId = id === "2026-0716-SUNDOWN" ? database.program.proofId : id;
  const snapshot = database.proofSnapshots.find((item) => item.proofId === requestedId);
  const verified = Boolean(snapshot && !snapshot.revokedAt && allStudentsHaveConsent(database, "public-proof"));
  return NextResponse.json({ id, verified, mission: verified ? snapshot?.missionTitle || null : null, school: verified ? snapshot?.schoolName || null : null, issuedAt: verified ? snapshot?.issuedAt.slice(0, 10) ?? null : null }, { headers: { "Cache-Control": "no-store" } });
}
