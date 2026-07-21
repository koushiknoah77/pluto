import { NextResponse } from "next/server";
import { studentAssessmentSchema } from "@/features/platform/contracts";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { audit, readDatabase, updateDatabase } from "@/features/platform/server-store";

export async function GET() {
  const access = await requireAccount(["teacher", "admin"]);
  if (access.response || !access.account) return access.response;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  return NextResponse.json({ assessments: database.studentAssessments.filter((item) => item.missionId === database.program.mission.id), students: database.students, rubric: database.program.rubric });
}

export async function POST(request: Request) {
  const access = await requireAccount(["teacher", "admin"]);
  if (access.response || !access.account) return access.response;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  const body = await request.json().catch(() => null);
  const parsed = studentAssessmentSchema.safeParse({ ...(body && typeof body === "object" ? body : {}), missionId: database.program.mission.id });
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid student, rubric criterion, score, feedback, and evidence links." }, { status: 400 });
  if (!database.students.some((student) => student.id === parsed.data.studentId)) return NextResponse.json({ error: "That student is not enrolled in the active class." }, { status: 404 });
  if (!database.program.rubric.some((item) => item.criterion === parsed.data.criterion)) return NextResponse.json({ error: "Use a criterion from the active mission rubric." }, { status: 400 });
  const allowedEvidence = new Set([...database.program.sources.map((item) => item.id), ...database.program.artifacts.map((item) => item.id), ...database.files.map((item) => item.id)]);
  if (parsed.data.evidenceIds.some((id) => !allowedEvidence.has(id))) return NextResponse.json({ error: "Every evidence link must point to an active source, artefact, or file." }, { status: 400 });
  const assessment = { ...parsed.data, updatedAt: new Date().toISOString(), updatedBy: access.account.id };
  const updated = await updateDatabase((current) => ({
    ...current,
    studentAssessments: [...current.studentAssessments.filter((item) => !(item.missionId === assessment.missionId && item.studentId === assessment.studentId && item.criterion === assessment.criterion)), assessment],
    audits: [audit(access.account!, "saved_student_assessment", `${assessment.studentId}:${assessment.criterion}`, { evidence: assessment.evidenceIds.length }), ...current.audits].slice(0, 500)
  }));
  return NextResponse.json({ assessment: updated.studentAssessments.find((item) => item.missionId === assessment.missionId && item.studentId === assessment.studentId && item.criterion === assessment.criterion) });
}
