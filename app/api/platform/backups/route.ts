import { NextResponse } from "next/server";
import { requireAccount } from "@/features/platform/server-auth";
import { createRelationalBackup, listRelationalBackups } from "@/features/platform/relational-store";

export async function GET() {
  const access = await requireAccount(["admin"]);
  if (access.response || !access.account) return access.response;
  return NextResponse.json({ backups: await listRelationalBackups() });
}

export async function POST() {
  const access = await requireAccount(["admin"]);
  if (access.response || !access.account) return access.response;
  try {
    const path = await createRelationalBackup();
    return NextResponse.json({ ok: true, backup: path.split(/[\\/]/).pop() }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "The relational store could not be backed up." }, { status: 503 });
  }
}
