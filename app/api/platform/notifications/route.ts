import { NextResponse } from "next/server";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { audit, programmeForAccount, readDatabase, updateDatabase } from "@/features/platform/server-store";

export async function GET() {
  const access = await requireAccount();
  if (access.response) return access.response;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account!);
  if (resourceError) return resourceError;
  return NextResponse.json({ notifications: programmeForAccount(database.program, access.account!).notifications });
}

export async function PATCH() {
  const access = await requireAccount();
  if (access.response || !access.account) return access.response;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  const updated = await updateDatabase((current) => ({ ...current, program: { ...current.program, notifications: current.program.notifications.map((item) => (!item.recipientId || item.recipientId === access.account!.id) ? { ...item, unread: false } : item) }, audits: [audit(access.account!, "read_notifications", "notifications"), ...current.audits].slice(0, 500) }));
  return NextResponse.json({ notifications: updated.program.notifications.filter((item) => !item.recipientId || item.recipientId === access.account!.id) });
}
