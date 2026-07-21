import { randomUUID } from "crypto";
import type { AssignmentProposal, StudentProfile } from "./contracts";

const colours = ["violet", "blue", "mint", "amber", "rose"] as const;

function words(values: string[]) {
  return values.join(" ").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function affinity(student: StudentProfile, role: string) {
  const profileWords = new Set(words([...student.interests, ...student.strengths]));
  const roleWords = words([role]);
  const synonyms: Record<string, string[]> = {
    research: ["research", "evidence", "source", "reading", "writing"],
    data: ["data", "math", "analysis", "numbers", "survey", "coding"],
    message: ["message", "communication", "language", "writing", "speaking"],
    design: ["design", "visual", "art", "creative", "presentation"]
  };
  const preferred = student.preferredRoles?.some((item) => item.toLowerCase() === role.toLowerCase()) ? 4 : 0;
  return roleWords.reduce((score, word) => score + (profileWords.has(word) ? 3 : 0) + (synonyms[word]?.some((item) => profileWords.has(item)) ? 2 : 0), preferred);
}

function bestRole(student: StudentProfile, roles: string[], usedRoles: Map<string, number>) {
  return [...roles].sort((a, b) => {
    const score = affinity(student, b) - affinity(student, a);
    return score || (usedRoles.get(a) || 0) - (usedRoles.get(b) || 0) || a.localeCompare(b);
  })[0] || "Contributor";
}

export function proposeAssignments(students: StudentProfile[], roles: string[], teamCount: number, missionId: string, className: string, createdBy: string): AssignmentProposal {
  const count = Math.max(1, Math.min(teamCount, students.length, 20));
  const teams = Array.from({ length: count }, (_, index) => ({
    id: `team-proposed-${index + 1}`,
    name: `Team ${["Sundown", "River", "Canopy", "Harbour", "Mango"][index] || index + 1}`,
    colour: colours[index % colours.length],
    memberIds: [] as string[],
    roles: {} as Record<string, string>,
    rationale: ""
  }));
  const usedRoles = new Map<string, number>();
  const availabilityById = new Map(students.map((student) => [student.id, student.availability]));
  const ordered = [...students].sort((a, b) => {
    const aScore = Math.max(...roles.map((role) => affinity(a, role)), 0);
    const bScore = Math.max(...roles.map((role) => affinity(b, role)), 0);
    return bScore - aScore || a.name.localeCompare(b.name);
  });
  for (const student of ordered) {
    const role = bestRole(student, roles, usedRoles);
    const eligibleTeams = teams.filter((team) => !(student.avoidStudentIds || []).some((id) => team.memberIds.includes(id)));
    const target = [...(eligibleTeams.length ? eligibleTeams : teams)].sort((a, b) => {
      const aHasRole = Object.values(a.roles).includes(role) ? 1 : 0;
      const bHasRole = Object.values(b.roles).includes(role) ? 1 : 0;
      const aLimited = student.availability === "limited" ? a.memberIds.filter((id) => availabilityById.get(id) === "limited").length : 0;
      const bLimited = student.availability === "limited" ? b.memberIds.filter((id) => availabilityById.get(id) === "limited").length : 0;
      const aSupport = a.memberIds.filter((id) => students.find((item) => item.id === id)?.accommodations?.length).length;
      const bSupport = b.memberIds.filter((id) => students.find((item) => item.id === id)?.accommodations?.length).length;
      return aHasRole - bHasRole || aLimited - bLimited || aSupport - bSupport || a.memberIds.length - b.memberIds.length || a.id.localeCompare(b.id);
    })[0];
    target.memberIds.push(student.id);
    target.roles[student.id] = role;
    usedRoles.set(role, (usedRoles.get(role) || 0) + 1);
  }
  for (const team of teams) {
    const roleSummary = Object.values(team.roles).reduce<Record<string, number>>((summary, role) => ({ ...summary, [role]: (summary[role] || 0) + 1 }), {});
    team.rationale = `${team.memberIds.length} learners balanced across the mission roles${Object.keys(roleSummary).length ? ` (${Object.entries(roleSummary).map(([role, total]) => `${total} ${role}`).join(", ")})` : ""}. Teacher approval is required before this becomes active.`;
  }
  return { id: `assignment-${randomUUID()}`, missionId, className, createdBy, createdAt: new Date().toISOString(), status: "draft", teamCount: count, teams };
}
