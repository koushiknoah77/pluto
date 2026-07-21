import { NextResponse } from "next/server";
import { citationCheckSchema, type CitationCheck } from "@/features/platform/contracts";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { audit, rateLimited, readDatabase, updateDatabase } from "@/features/platform/server-store";

const trustedHosts = [".gov", ".edu", "who.int", "un.org", "kerala.gov.in", "kochicity.kerala.gov.in"];

function isPrivateHost(host: string) {
  return host === "localhost" || host === "::1" || host === "127.0.0.1" || host.startsWith("10.") || host.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
}

function pageTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, " ").trim().slice(0, 240) || "Untitled source";
}

function excerpt(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1_800);
}

export async function POST(request: Request) {
  const access = await requireAccount();
  if (access.response || !access.account) return access.response;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  if (rateLimited(`research:${access.account.id}`, 60, 60_000)) return NextResponse.json({ error: "Too many source checks in a short period. Please pause before checking another source." }, { status: 429 });
  const parsed = citationCheckSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid source URL and the claim it supports." }, { status: 400 });
  const source = new URL(parsed.data.url);
  const host = source.hostname.toLowerCase();
  if (source.protocol !== "https:" || isPrivateHost(host)) return NextResponse.json({ error: "Only public HTTPS sources can be checked." }, { status: 400 });
  const strongHost = trustedHosts.some((item) => item.startsWith(".") ? host.endsWith(item) : host === item || host.endsWith(`.${item}`));
  let retrieved = false;
  let title = "";
  let sourceExcerpt = "";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    const response = await fetch(source.toString(), { headers: { "User-Agent": "PlutoResearchBot/1.0" }, signal: controller.signal, redirect: "error" });
    clearTimeout(timeout);
    if (response.ok) {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html") || contentType.includes("text/plain")) {
        const html = (await response.text()).slice(0, 200_000);
        title = pageTitle(html);
        sourceExcerpt = excerpt(html);
        retrieved = Boolean(sourceExcerpt);
      }
    }
  } catch {
    // A source can still be submitted for teacher review when retrieval is unavailable.
  }
  const check: CitationCheck = {
    host,
    rating: strongHost && retrieved ? "strong" : host.includes("blog") || host.includes("social") ? "weak" : "review",
    reasons: strongHost
      ? ["The source is on Pluto's high-confidence public-source list.", retrieved ? "The page was retrieved and an excerpt was captured for teacher review." : "The page could not be retrieved; verify it manually before approval."]
      : ["The host is not in Pluto's limited high-confidence public-source list.", retrieved ? "The page was retrieved, but a teacher must verify the author, date, claim, and conflicts." : "The page could not be retrieved; check author, publication date, evidence, and conflicts manually."],
    citation: `${title || host}. "${parsed.data.claim.slice(0, 180)}." Accessed ${new Date().toLocaleDateString("en-CA")}.`,
    requiresTeacherReview: true
  };
  await updateDatabase((database) => ({ ...database, audits: [audit(access.account!, "checked_source", host, { rating: check.rating, retrieved }), ...database.audits].slice(0, 500) }));
  return NextResponse.json({ check, retrieval: { retrieved, title, excerpt: sourceExcerpt, contentType: retrieved ? "text" : null } });
}

export async function PATCH(request: Request) {
  const access = await requireAccount(["teacher", "admin"]);
  if (access.response || !access.account) return access.response;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  const body = await request.json().catch(() => null) as { sourceId?: unknown; confidence?: unknown } | null;
  if (typeof body?.sourceId !== "string" || (body.confidence !== "verified" && body.confidence !== "unverified" && body.confidence !== "review")) return NextResponse.json({ error: "Choose a source and a valid review status." }, { status: 400 });
  const updated = await updateDatabase((database) => {
    const source = database.program.sources.find((item) => item.id === body.sourceId);
    if (!source) throw new Error("Source not found.");
    const next = { ...database.program, sources: database.program.sources.map((item) => item.id === body.sourceId ? { ...item, confidence: body.confidence as "verified" | "review" | "unverified", ...(body.confidence === "verified" ? { approvedAt: new Date().toISOString(), approvedBy: access.account!.id } : {}) } : item) };
    return { ...database, program: next, audits: [audit(access.account!, "reviewed_source", source.id, { confidence: body.confidence as string }), ...database.audits].slice(0, 500) };
  }).catch(() => null);
  if (!updated) return NextResponse.json({ error: "Source not found." }, { status: 404 });
  return NextResponse.json({ program: updated.program, source: updated.program.sources.find((item) => item.id === body.sourceId) });
}
