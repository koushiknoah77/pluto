import OpenAI from "openai";
import { NextResponse } from "next/server";
import { fallbackMentor } from "@/features/mentor/fallback";
import { mentorRequestSchema, mentorResponseSchema } from "@/features/mentor/schema";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { rateLimited, readDatabase, studentMissionVisible } from "@/features/platform/server-store";

function hasSolutionShape(text: string) {
  return /```|function\s+\w+\s*\(|const\s+\w+\s*=\s*\(/i.test(text);
}

export async function POST(request: Request) {
  const access = await requireAccount(["student", "teacher"]);
  if (access.response || !access.account) return access.response;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  if (access.account.role === "student" && !studentMissionVisible(database.program)) return NextResponse.json({ error: "The Pluto mentor opens after teacher mission approval." }, { status: 403 });
  if (rateLimited(`mentor:${access.account.id}`, 20, 60_000)) return NextResponse.json({ error: "Please pause for a moment before asking Pluto again." }, { status: 429 });
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 40_000) return NextResponse.json({ error: "Mentor context is too large." }, { status: 413 });
  const body = await request.json().catch(() => null);
  const parsed = mentorRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid mentor context." }, { status: 400 });

  const fallback = fallbackMentor(parsed.data.validation, parsed.data.attemptCount);
  if (!process.env.OPENAI_API_KEY) return NextResponse.json(fallback);

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 12_000 });
    const response = await client.responses.create({
      model: process.env.OPENAI_MENTOR_MODEL || "gpt-5.6",
      input: [
        {
          role: "system",
          content: "You are Pluto, a patient Socratic JavaScript mentor. Use only supplied evidence. Keep each answer under 90 words. Do not write code blocks, complete functions, copy-paste solutions, or claim code ran. Respect the learner's style: step-by-step gives one focused question plus one concrete action; hints only asks a question before a cue; challenge asks the learner to predict then test; minimal help gives one terse observation or question. Return JSON matching the requested schema."
        },
        {
          role: "user",
          content: JSON.stringify({
            task: parsed.data.task,
            attemptCount: parsed.data.attemptCount,
            validation: parsed.data.validation,
            currentFiles: parsed.data.files,
            learnerGoal: parsed.data.learnerGoal || null,
            learningStyle: parsed.data.learningStyle || "Guide me step-by-step",
            learnerQuestion: parsed.data.question || null
          })
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "pluto_mentor_response",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["mode", "message", "evidence", "nextAction", "conceptTags", "hintLevel"],
            properties: {
              mode: { type: "string", enum: ["question", "nudge", "celebrate", "clarify"] },
              message: { type: "string" },
              evidence: { type: "string" },
              nextAction: { type: "string" },
              conceptTags: { type: "array", items: { type: "string" } },
              hintLevel: { type: "integer", minimum: 1, maximum: 4 }
            }
          }
        }
      }
    });
    const output = mentorResponseSchema.safeParse(JSON.parse(response.output_text));
    if (!output.success || hasSolutionShape(`${output.data.message} ${output.data.nextAction}`)) return NextResponse.json(fallback);
    return NextResponse.json(output.data);
  } catch {
    return NextResponse.json(fallback);
  }
}
