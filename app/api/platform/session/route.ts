import { NextResponse } from "next/server";
import { loginSchema } from "@/features/platform/contracts";
import { accountFromSession, demoAccounts, publicAccount, rateLimited, SESSION_COOKIE, sessionValue } from "@/features/platform/server-store";

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie")?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
  const account = accountFromSession(cookie);
  return NextResponse.json({ account });
}

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(`login:${forwarded}`, 8, 60_000)) return NextResponse.json({ error: "Too many sign-in attempts. Please wait a minute." }, { status: 429 });
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid demo email and password." }, { status: 400 });
  const account = demoAccounts.find((item) => item.email === parsed.data.email.toLowerCase() && item.password === parsed.data.password);
  if (!account) return NextResponse.json({ error: "Those sign-in details are not recognised." }, { status: 401 });
  try {
    const response = NextResponse.json({ account: publicAccount(account) });
    response.cookies.set({ name: SESSION_COOKIE, value: sessionValue(account), httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
    return response;
  } catch {
    return NextResponse.json({ error: "The production session secret is not configured." }, { status: 503 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: SESSION_COOKIE, value: "", httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
