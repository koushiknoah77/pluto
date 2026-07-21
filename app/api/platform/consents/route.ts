import { NextResponse } from "next/server";
import { consentSchema } from "@/features/platform/contracts";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { audit, readDatabase, updateDatabase } from "@/features/platform/server-store";

export async function GET() {
  const access = await requireAccount(["teacher", "admin"]);
  if (access.response) return access.response;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account!);
  if (resourceError) return resourceError;
  return NextResponse.json({ consents: database.consents });
}

export async function POST(request: Request) {
  const access = await requireAccount(["teacher", "admin"]);
  if (access.response || !access.account) return access.response;
  const parsed = consentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Record a valid consent basis and scope." }, { status: 400 });
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  const consent = { ...parsed.data, id: `consent-${crypto.randomUUID()}`, recordedBy: access.account.id, recordedAt: new Date().toISOString() };
  const updated = await updateDatabase((database) => ({ ...database, consents: [consent, ...database.consents], audits: [audit(access.account!, "recorded_consent", consent.id, { basis: consent.basis }), ...database.audits].slice(0, 500) }));
  return NextResponse.json({ consent: updated.consents[0] }, { status: 201 });
}

export async function DELETE(request: Request) {
  const access = await requireAccount(["teacher", "admin"]);
  if (access.response || !access.account) return access.response;
  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  if (typeof body?.id !== "string" || body.id.length < 3) return NextResponse.json({ error: "Provide the consent record to revoke." }, { status: 400 });
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  const updated = await updateDatabase((database) => {
    if (!database.consents.some((consent) => consent.id === body.id && !consent.revokedAt)) throw new Error("Consent record not found or already revoked.");
    return { ...database, consents: database.consents.map((consent) => consent.id === body.id ? { ...consent, revokedAt: new Date().toISOString() } : consent), audits: [audit(access.account!, "revoked_consent", body.id as string), ...database.audits].slice(0, 500) };
  }).catch(() => null);
  if (!updated) return NextResponse.json({ error: "Consent record not found or already revoked." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
