import { NextResponse } from "next/server";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { readDatabase } from "@/features/platform/server-store";

export async function GET() {
  const access = await requireAccount(["admin", "teacher"]);
  if (access.response) return access.response;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account!);
  if (resourceError) return resourceError;
  const audits = database.audits.slice(0, 100).map((record) => ({ id: record.id, actorRole: record.actorRole, action: record.action, target: record.target, createdAt: record.createdAt, metadata: record.metadata }));
  return NextResponse.json({ audits });
}
