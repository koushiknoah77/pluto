import { NextResponse } from "next/server";
import { assessmentDraftSchema } from "@/features/platform/contracts";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { audit, allRubricScoresPresent, programmeForAccount, readDatabase, updateDatabase } from "@/features/platform/server-store";

export async function POST(request: Request) {
  const access = await requireAccount(["teacher"]);
  if (access.response || !access.account) return access.response;
  const parsed = assessmentDraftSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Assessment draft is incomplete or invalid." }, { status: 400 });
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  const expectedCriteria = database.program.mission.rubric.map((item) => item.criterion).sort().join("|");
  const submittedCriteria = parsed.data.rubric.map((item) => item.criterion).sort().join("|");
  const weightTotal = parsed.data.rubric.reduce((sum, item) => sum + item.weight, 0);
  if (expectedCriteria !== submittedCriteria || weightTotal !== 100) return NextResponse.json({ error: "Use the active mission rubric and keep its weights at 100%." }, { status: 400 });
  const release = Boolean(parsed.data.release);
  if (release && (!database.program.finalSubmitted || !allRubricScoresPresent({ ...database.program, rubric: parsed.data.rubric }))) return NextResponse.json({ error: "Complete every score after the team submits before releasing the assessment." }, { status: 409 });
  const updated = await updateDatabase((current) => {
    const newlyReleased = release && !current.program.assessmentReleased;
    const program = {
      ...current.program,
      rubric: parsed.data.rubric,
      assessmentReleased: current.program.assessmentReleased || release,
      notifications: newlyReleased ? [{ id: `assess-${Date.now()}`, text: "Teacher assessment released to Team Sundown.", unread: true }, ...current.program.notifications] : current.program.notifications,
      activities: newlyReleased ? [{ id: `activity-${Date.now()}`, actor: current.program.classRoom.teacher, action: "Released the teacher assessment", kind: "submission" as const, time: "Just now" }, ...current.program.activities].slice(0, 200) : current.program.activities
    };
    return { ...current, program, audits: [audit(access.account!, newlyReleased ? "released_assessment" : "saved_assessment_draft", program.mission.id), ...current.audits].slice(0, 500) };
  });
  return NextResponse.json({ program: programmeForAccount(updated.program, access.account) });
}
