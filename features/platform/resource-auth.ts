import type { PilotAccount, PilotDatabase, StudentProfile } from "./contracts";

/**
 * The active-program adapter still exposes one programme to the UI, but every
 * request goes through this scope check. When the multi-mission query layer is
 * introduced, the same function can receive a mission/class row instead of
 * relying on the active-program projection.
 */
export type ActiveResourceScope = {
  schoolId: string;
  missionId: string;
  classId: string;
  organisationId: string;
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "record";
}
export function activeResourceScope(database: PilotDatabase): ActiveResourceScope {
  return {
    schoolId: database.schoolId,
    missionId: database.program.mission.id,
    classId: `class-${slug(database.program.classRoom.name)}`,
    organisationId: `organisation-${slug(database.program.partner.organisation)}`
  };
}

export function studentForAccount(database: PilotDatabase, account: PilotAccount): StudentProfile | null {
  if (account.role !== "student") return null;
  return database.students.find((student) => student.userId === account.id || student.email === account.email || student.id === account.studentId) || null;
}

export function canAccessActiveResource(database: PilotDatabase, account: PilotAccount) {
  const scope = activeResourceScope(database);
  if (account.schoolId !== scope.schoolId) return false;
  if (account.role === "student") return Boolean(studentForAccount(database, account));
  if (account.role === "partner" && account.organisationId && account.organisationId !== scope.organisationId) {
    // A partner can submit a new organisation name during intake. Until the
    // organisation selector is persisted, only reject mismatches once a live
    // mission exists; draft intake remains available to the signed-in partner.
    return ["draft", "awaiting_review"].includes(database.program.mission.status);
  }
  return true;
}
