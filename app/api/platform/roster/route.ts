import { NextResponse } from "next/server";
import { rosterImportSchema, studentProfileSchema, type StudentProfile } from "@/features/platform/contracts";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { accountForEmail, audit, readDatabase, STUDENT_ACCOUNT_ID, updateDatabase } from "@/features/platform/server-store";

function csvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) { value += '"'; index += 1; continue; }
    if (character === '"') { quoted = !quoted; continue; }
    if (character === "," && !quoted) { values.push(value.trim()); value = ""; continue; }
    value += character;
  }
  values.push(value.trim());
  return values;
}

function csvRows(csv: string): StudentProfile[] {
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const headers = csvLine(lines[0]).map((header) => header.replace(/^\uFEFF/, "").trim().toLowerCase());
  const index = (name: string) => headers.indexOf(name);
  return lines.slice(1).map((line, rowIndex) => {
    const values = csvLine(line);
    const name = values[index("name")] || values[0] || `Student ${rowIndex + 1}`;
    const email = values[index("email")] || undefined;
    const interests = (values[index("interests")] || "community projects").split(/[;|]/).map((item) => item.trim()).filter(Boolean);
    const strengths = (values[index("strengths")] || "collaboration").split(/[;|]/).map((item) => item.trim()).filter(Boolean);
    const availability = values[index("availability")]?.toLowerCase() === "limited" ? "limited" : "full";
    const availabilityWindows = (values[index("availabilitywindows")] || values[index("availability windows")] || "").split(/[;|]/).map((item) => item.trim()).filter(Boolean);
    const preferredRoles = (values[index("preferredroles")] || values[index("preferred roles")] || "").split(/[;|]/).map((item) => item.trim()).filter(Boolean);
    const avoidStudentIds = (values[index("avoidstudentids")] || values[index("avoid student ids")] || "").split(/[;|]/).map((item) => item.trim()).filter(Boolean);
    const accommodations = (values[index("accommodations")] || "").split(/[;|]/).map((item) => item.trim()).filter(Boolean);
    const accessibilityNotes = values[index("accessibilitynotes")] || values[index("accessibility notes")];
    const userId = values[index("userid")] || values[index("user id")];
    const idBase = (email || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || `student-${rowIndex + 1}`;
    return {
      id: idBase,
      ...(userId ? { userId } : {}),
      ...(email?.toLowerCase() === "student@pluto.local" ? { userId: STUDENT_ACCOUNT_ID } : {}),
      name,
      ...(email ? { email } : {}),
      grade: "",
      interests,
      strengths,
      availability,
      ...(availabilityWindows.length ? { availabilityWindows } : {}),
      ...(preferredRoles.length ? { preferredRoles } : {}),
      ...(avoidStudentIds.length ? { avoidStudentIds } : {}),
      ...(accommodations.length ? { accommodations } : {}),
      ...(accessibilityNotes ? { accessibilityNotes } : {})
    };
  });
}

function uniqueIds(students: StudentProfile[]) {
  const seen = new Map<string, number>();
  return students.map((student) => {
    const count = seen.get(student.id) || 0;
    seen.set(student.id, count + 1);
    return count ? { ...student, id: `${student.id}-${count + 1}` } : student;
  });
}

export async function GET() {
  const access = await requireAccount(["teacher", "admin"]);
  if (access.response || !access.account) return access.response;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  return NextResponse.json({ students: database.students, classRoom: database.program.classRoom });
}

export async function POST(request: Request) {
  const access = await requireAccount(["teacher", "admin"]);
  if (access.response || !access.account) return access.response;
  const parsed = rosterImportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Upload a roster CSV or at least one valid student record." }, { status: 400 });
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  const mapped = (parsed.data.students || csvRows(parsed.data.csv || "")).map((student) => {
    const account = student.email ? accountForEmail(student.email) : null;
    return {
      ...student,
      grade: student.grade || database.program.classRoom.grade,
      ...(student.userId || account?.role !== "student" ? {} : account ? { userId: account.id } : {})
    };
  });
  const imported = uniqueIds(mapped);
  const valid = imported.filter((student) => studentProfileSchema.safeParse(student).success);
  if (!valid.length) return NextResponse.json({ error: "No valid students were found. Include a name and optional comma-separated interests and strengths." }, { status: 400 });
  const updated = await updateDatabase((current) => {
    const missing = current.students.filter((student) => !valid.some((candidate) => candidate.id === student.id));
    const nextStudents = parsed.data.mode === "merge"
      ? [...current.students.filter((student) => !valid.some((candidate) => candidate.id === student.id)), ...valid]
      : parsed.data.archiveMissing ? [...valid, ...missing.map((student) => ({ ...student, status: "archived" as const }))] : valid;
    const importedIds = new Set(valid.map((student) => student.id));
    const students = nextStudents.map((student) => importedIds.has(student.id) ? { ...student, status: "active" as const } : { ...student, status: "archived" as const });
    const teams = current.program.teams.map((team) => ({ ...team, members: team.members.filter((member) => importedIds.has(member.id)) }));
    return { ...current, students, assignmentProposal: undefined, program: { ...current.program, classRoom: { ...current.program.classRoom, studentCount: valid.length }, school: { ...current.program.school, students: Math.max(current.program.school.students, valid.length) }, teams }, audits: [audit(access.account!, "imported_roster", current.program.classRoom.name, { students: valid.length, mode: parsed.data.mode, archiveMissing: parsed.data.archiveMissing }), ...current.audits].slice(0, 500) };
  });
  return NextResponse.json({ students: updated.students, imported: valid.length, rejected: imported.length - valid.length, mode: parsed.data.mode });
}
