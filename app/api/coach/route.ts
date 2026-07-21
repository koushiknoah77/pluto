import OpenAI from "openai";
import { NextResponse } from "next/server";
import { coachRequestSchema, coachResponseSchema } from "@/features/missions/schema";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { audit, rateLimited, readDatabase, studentMissionVisible, updateDatabase } from "@/features/platform/server-store";

function fallback(question: string, mode: "template" | "restricted" = "template", evidenceCount = 0, citations: Array<{ sourceId: string; title: string; url: string }> = []) {
  return {
    acknowledgement: "You are doing the right thing by checking your evidence before making the next claim.",
    question: `Which part of “${question.slice(0, 100)}” can your team answer using a source or observation you can show the teacher?`,
    nextStep: "Write one claim, add the source that supports it, and note one limitation before updating the team board.",
    sourceReminder: mode === "restricted"
      ? "AI is restricted for this school. Use the approved source record and ask your teacher before making a new claim."
      : "Do not use personal data. Cite the organisation and URL for every factual claim.",
    escalation: false,
    mode,
    evidenceCount,
    citations
  };
}

export async function POST(request: Request) {
  const access = await requireAccount(["student", "teacher"]);
  if (access.response || !access.account) return access.response;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  if (access.account.role === "student" && !studentMissionVisible(database.program)) return NextResponse.json({ error: "The Pluto coach opens after teacher mission approval." }, { status: 403 });
  if (rateLimited(`coach:${access.account.id}`, 20, 60_000)) return NextResponse.json({ error: "Please pause for a moment before asking Pluto again." }, { status: 429 });
  const parsed = coachRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please share a focused question about the active mission." }, { status: 400 });
  const approvedEvidence = database.program.sources
    .filter((source) => source.confidence === "verified")
    .slice(0, 4)
    .map((source) => `${source.title} (${source.publisher}): ${source.claim} — ${source.url}`)
    .join("\n");
  const citations = database.program.sources
    .filter((source) => source.confidence === "verified")
    .slice(0, 4)
    .map((source) => ({ sourceId: source.id, title: source.title, url: source.url }));
  const evidenceCount = database.program.sources.filter((source) => source.confidence === "verified").length;
  const restricted = database.program.school.aiPolicy === "Restricted";
  const local = fallback(parsed.data.learnerQuestion, restricted ? "restricted" : "template", evidenceCount, citations);
  const record = (mode: "live" | "template" | "restricted") => void updateDatabase((current) => ({ ...current, audits: [audit(access.account!, "ai_coach_response", database.program.mission.id, { mode, evidenceCount, policy: database.program.school.aiPolicy }), ...current.audits].slice(0, 500) }));
  // Restricted is a server-side capability boundary: a client cannot opt into a live model.
  if (restricted) { record("restricted"); return NextResponse.json(local); }
  if (!process.env.OPENAI_API_KEY) { record("template"); return NextResponse.json(local); }
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 12_000 });
    const response = await client.responses.create({
      model: process.env.OPENAI_MENTOR_MODEL || "gpt-5.6",
      input: [
        { role: "system", content: "You are Pluto, a concise Socratic project coach for school students. Do not complete the work, invent sources, or request personal data. Use only the approved evidence supplied by the server; if it is insufficient, ask the learner to find and submit a source for teacher review. Give one evidence-based question, one next action, and a source reminder. Set escalation true for personal safety, privacy, exploitation, health, legal, or distress concerns; tell students to pause and ask their teacher. Return only valid JSON." },
        { role: "user", content: JSON.stringify({ ...parsed.data, approvedEvidence }) }
      ],
          text: { format: { type: "json_schema", name: "pluto_student_coach", strict: true, schema: { type: "object", additionalProperties: false, required: ["acknowledgement", "question", "nextStep", "sourceReminder", "escalation", "citations"], properties: { acknowledgement: { type: "string" }, question: { type: "string" }, nextStep: { type: "string" }, sourceReminder: { type: "string" }, escalation: { type: "boolean" }, citations: { type: "array", items: { type: "object", additionalProperties: false, required: ["sourceId", "title", "url"], properties: { sourceId: { type: "string" }, title: { type: "string" }, url: { type: "string" } } } } } } } }
    });
    const answer = coachResponseSchema.safeParse(JSON.parse(response.output_text));
    if (!answer.success) { record("template"); return NextResponse.json(local); }
    record("live");
    return NextResponse.json({ ...answer.data, mode: "live", evidenceCount, citations });
  } catch {
    record("template");
    return NextResponse.json(local);
  }
}
