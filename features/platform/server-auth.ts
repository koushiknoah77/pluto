import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { AppRole } from "@/features/program/state";
import type { PilotAccount } from "./contracts";
import { accountFromSession, SESSION_COOKIE } from "./server-store";
import type { PilotDatabase } from "./contracts";
import { canAccessActiveResource } from "./resource-auth";

export async function sessionAccount(): Promise<PilotAccount | null> {
  try {
    const cookieStore = await cookies();
    return accountFromSession(cookieStore.get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}

export async function requireAccount(roles?: AppRole[]) {
  const account = await sessionAccount();
  if (!account) return { account: null, response: NextResponse.json({ error: "Sign in is required." }, { status: 401 }) };
  if (roles && !roles.includes(account.role)) return { account: null, response: NextResponse.json({ error: "This role is not allowed to perform that action." }, { status: 403 }) };
  return { account, response: null };
}

export function resourceAccessResponse(database: PilotDatabase, account: PilotAccount) {
  return canAccessActiveResource(database, account)
    ? null
    : NextResponse.json({ error: "You do not have access to this school resource." }, { status: 403 });
}
