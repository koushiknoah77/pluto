import { NextResponse } from "next/server";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { audit, readDatabase, updateDatabase } from "@/features/platform/server-store";

function csv(value: string | number) { return `"${String(value).replaceAll('"', '""')}"`; }

export async function GET() {
  const access = await requireAccount(["teacher", "admin"]);
  if (access.response || !access.account) return access.response;
  const current = await readDatabase();
  const resourceError = resourceAccessResponse(current, access.account);
  if (resourceError) return resourceError;
  const database = await updateDatabase((next) => ({ ...next, audits: [audit(access.account!, "exported_gradebook", "gradebook"), ...next.audits].slice(0, 500) }));
  const headers = ["Team", "Student", ...database.program.rubric.map((item) => item.criterion), "Assessment status"];
  const rows = database.program.teams.flatMap((team) => team.members.map((member) => {
    const studentScores = database.program.rubric.map((item) => database.studentAssessments.find((assessment) => assessment.missionId === database.program.mission.id && assessment.studentId === member.id && assessment.criterion === item.criterion)?.score ?? item.score ?? "");
    return [team.name, member.name, ...studentScores, studentScores.some((score) => score === "") ? "In progress" : "Complete"];
  }));
  const content = [headers, ...rows].map((row) => row.map(csv).join(",")).join("\n");
  return new NextResponse(content, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=pluto-gradebook.csv", "Cache-Control": "no-store" } });
}
