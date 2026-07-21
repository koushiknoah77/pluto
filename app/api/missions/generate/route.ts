import OpenAI from "openai";
import { NextResponse } from "next/server";
import { buildSafeMission } from "@/features/missions/demo";
import { generatedMissionSchema, missionRequestSchema, safetyReviewSchema } from "@/features/missions/schema";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { audit, rateLimited, readDatabase, updateDatabase } from "@/features/platform/server-store";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 20_000;

function challengeSafety(challenge: string) {
  const explicitRisk = [
    /\bcollect(?:ing)?\s+(?:names?|phone numbers?|email addresses?|home addresses?|photos?|identifiers?)\b/i,
    /\b(?:contact|message|meet|visit)\s+(?:strangers?|minors?|residents?\s+at\s+home)\b/i,
    /\b(?:diagnose|treat|prescribe)\s+(?:patients?|people|medical|legal|financial|illness|conditions?)\b/i,
    /\b(?:weapons?|drugs?|explosives?|asbestos|hazardous\s+materials?)\b/i,
    /\b(?:enter|work in|go to)\s+(?:unsafe|private|restricted|abandoned)\s+(?:places?|sites?|homes?|buildings?)\b/i
  ];
  return explicitRisk.some((pattern) => pattern.test(challenge)) ? {
    suitable: false,
    concerns: ["The challenge appears to involve personal data, direct contact, professional advice, or hazardous activity."],
    safeguards: ["A teacher or safeguarding lead must reshape the scope before students work on it.", "Use public, aggregate evidence and school-supervised tasks only."],
    requiresAdultSupport: true
  } : null;
}

function missionFormat() {
  return {
    type: "json_schema" as const,
    name: "pluto_learning_mission",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["title", "summary", "drivingQuestion", "partnerNeed", "duration", "subjectLinks", "roles", "researchQuestions", "milestones", "deliverables", "sourceGuidance", "rubric", "safety"],
      properties: {
        title: { type: "string" }, summary: { type: "string" }, drivingQuestion: { type: "string" }, partnerNeed: { type: "string" }, duration: { type: "string" },
        subjectLinks: { type: "array", items: { type: "object", additionalProperties: false, required: ["subject", "learningOutcome"], properties: { subject: { type: "string" }, learningOutcome: { type: "string" } } } },
        roles: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "responsibility", "evidence"], properties: { title: { type: "string" }, responsibility: { type: "string" }, evidence: { type: "string" } } } },
        researchQuestions: { type: "array", items: { type: "string" } },
        milestones: { type: "array", items: { type: "object", additionalProperties: false, required: ["week", "title", "outcome", "studentActions"], properties: { week: { type: "string" }, title: { type: "string" }, outcome: { type: "string" }, studentActions: { type: "array", items: { type: "string" } } } } },
        deliverables: { type: "array", items: { type: "string" } }, sourceGuidance: { type: "array", items: { type: "string" } },
        rubric: { type: "array", items: { type: "object", additionalProperties: false, required: ["criterion", "evidence", "weight"], properties: { criterion: { type: "string" }, evidence: { type: "string" }, weight: { type: "integer" } } } },
        safety: { type: "object", additionalProperties: false, required: ["suitable", "concerns", "safeguards", "requiresAdultSupport"], properties: { suitable: { type: "boolean" }, concerns: { type: "array", items: { type: "string" } }, safeguards: { type: "array", items: { type: "string" } }, requiresAdultSupport: { type: "boolean" } } }
      }
    }
  };
}

export async function POST(request: Request) {
  const access = await requireAccount(["partner", "teacher", "admin"]);
  if (access.response || !access.account) return access.response;
  if (rateLimited(`mission:${access.account.id}`, 10, 60_000)) return NextResponse.json({ error: "Mission drafting is temporarily rate limited. Please wait a minute." }, { status: 429 });
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return NextResponse.json({ error: "Challenge submission is too large." }, { status: 413 });
  const body = await request.json().catch(() => null);
  const parsed = missionRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please provide a clear organisation, locality, grade, subjects, and challenge." }, { status: 400 });

  const safety = challengeSafety(parsed.data.challenge);
  if (safety) return NextResponse.json({ error: "This challenge needs a teacher or safeguarding lead to reshape it before Pluto can create a student mission.", safety }, { status: 422 });

  const fallback = buildSafeMission(parsed.data);
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  const restricted = database.program.school.aiPolicy === "Restricted";
  const record = (mode: "live" | "template") => void updateDatabase((current) => ({ ...current, audits: [audit(access.account!, "ai_mission_generation", database.program.mission.id, { mode, policy: database.program.school.aiPolicy, model: mode === "live" ? (process.env.OPENAI_MISSION_MODEL || process.env.OPENAI_MENTOR_MODEL || "gpt-5.6") : "safe-template" }), ...current.audits].slice(0, 500) }));
  if (!process.env.OPENAI_API_KEY || restricted) { record("template"); return NextResponse.json({ mission: fallback, source: "safe_template", mode: "template", policy: restricted ? "Restricted" : undefined }); }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 15_000 });
    const response = await client.responses.create({
      model: process.env.OPENAI_MISSION_MODEL || process.env.OPENAI_MENTOR_MODEL || "gpt-5.6",
      input: [
        {
          role: "system",
          content: "You are Pluto's safeguarded curriculum designer. Turn only the supplied local community challenge into an age-appropriate, teacher-reviewable learning mission. Never instruct minors to contact strangers, enter unsafe locations, collect identifying data, use personal photos, make promises on behalf of a partner, or replace professional services. Prefer school-supervised, low-risk work with public sources and aggregate-only data. Include meaningful safeguards. AI may draft, but a teacher must approve every mission before students or partners see it. Return only the requested JSON."
        },
        { role: "user", content: JSON.stringify(parsed.data) }
      ],
      text: { format: missionFormat() }
    });
    const mission = generatedMissionSchema.safeParse(JSON.parse(response.output_text));
    if (!mission.success) { record("template"); return NextResponse.json({ mission: fallback, source: "safe_template", mode: "template" }); }
    const safety = safetyReviewSchema.safeParse(mission.data.safety);
    if (!safety.success || !safety.data.suitable) {
      return NextResponse.json({ error: "This challenge needs a teacher or safeguarding lead to reshape it before Pluto can create a student mission.", safety: safety.success ? safety.data : fallback.safety }, { status: 422 });
    }
    record("live");
    return NextResponse.json({ mission: mission.data, source: "ai_draft", mode: "live" });
  } catch {
    record("template");
    return NextResponse.json({ mission: fallback, source: "safe_template", mode: "template" });
  }
}
