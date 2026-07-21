import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { audit, readDatabase, updateDatabase } from "@/features/platform/server-store";

const integrationSchema = z.object({ id: z.enum(["google-classroom", "microsoft-teams", "lms-gradebook", "calendar"]), status: z.enum(["not_connected", "configured"]) });

export async function GET() {
  const access = await requireAccount(["admin"]);
  if (access.response) return access.response;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account!);
  if (resourceError) return resourceError;
  return NextResponse.json({ integrations: database.integrations });
}

export async function PATCH(request: Request) {
  const access = await requireAccount(["admin"]);
  if (access.response || !access.account) return access.response;
  const parsed = integrationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid integration setting." }, { status: 400 });
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  const updated = await updateDatabase((database) => ({ ...database, integrations: database.integrations.map((item) => item.id === parsed.data.id ? { ...item, status: parsed.data.status, configuredBy: access.account!.id, updatedAt: new Date().toISOString() } : item), audits: [audit(access.account!, "updated_integration", parsed.data.id, { status: parsed.data.status }), ...database.audits].slice(0, 500) }));
  return NextResponse.json({ integrations: updated.integrations });
}
