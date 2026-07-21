import { NextResponse } from "next/server";
import { assignmentMutationSchema, assignmentProposalSchema } from "@/features/platform/contracts";
import { proposeAssignments } from "@/features/platform/assignment-engine";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { audit, programmeForAccount, readDatabase, updateDatabase } from "@/features/platform/server-store";

export async function GET() {
  const access = await requireAccount(["teacher", "admin"]);
  if (access.response || !access.account) return access.response;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  return NextResponse.json({ students: database.students, proposal: database.assignmentProposal, assignmentHistory: database.assignmentHistory, mission: { id: database.program.mission.id, title: database.program.mission.title, roles: database.program.mission.roles.map((role) => role.title) }, classRoom: database.program.classRoom });
}

export async function POST(request: Request) {
  const access = await requireAccount(["teacher", "admin"]);
  if (access.response || !access.account) return access.response;
  const parsed = assignmentMutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose whether to propose or approve an assignment." }, { status: 400 });
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  const activeStudents = database.students.filter((student) => student.status !== "archived");
  if (activeStudents.length === 0) return NextResponse.json({ error: "Import an active student roster before creating assignments." }, { status: 409 });
  if (parsed.data.action === "propose") {
    const proposal = proposeAssignments(activeStudents, database.program.mission.roles.map((role) => role.title), parsed.data.teamCount || database.program.teams.length || 1, database.program.mission.id, database.program.classRoom.name, access.account.name);
    const updated = await updateDatabase((current) => ({ ...current, assignmentProposal: proposal, audits: [audit(access.account!, "proposed_assignments", proposal.id, { teams: proposal.teamCount, students: activeStudents.length }), ...current.audits].slice(0, 500) }));
    return NextResponse.json({ proposal: updated.assignmentProposal });
  }
  if (parsed.data.action === "undo") {
    const historyId = parsed.data.historyId;
    const previous = historyId === "latest"
      ? database.assignmentHistory[0]
      : database.assignmentHistory.find((item) => item.id === historyId);
    if (!previous) return NextResponse.json({ error: "There is no previous approved assignment to restore." }, { status: 404 });
    const students = new Map(activeStudents.map((student) => [student.id, student]));
    const assigned = previous.teams.flatMap((team) => team.memberIds);
    if (assigned.length !== activeStudents.length || new Set(assigned).size !== assigned.length || assigned.some((id) => !students.has(id))) return NextResponse.json({ error: "The previous assignment no longer matches the active roster." }, { status: 409 });
    const teams = previous.teams.map((team) => ({
      id: team.id,
      name: team.name,
      colour: team.colour,
      milestone: 0,
      health: "waiting" as const,
      lastActivity: "Restored by teacher",
      members: team.memberIds.map((id) => ({ id, name: students.get(id)!.name, role: team.roles[id] || "Contributor", contribution: 0, checkIn: "waiting" as const }))
    }));
    const updated = await updateDatabase((current) => ({
      ...current,
      program: { ...current.program, teams, classRoom: { ...current.program.classRoom, studentCount: activeStudents.length } },
      assignmentProposal: { ...previous, status: "approved" as const },
      assignmentHistory: current.assignmentHistory.filter((item) => item.id !== previous.id),
      audits: [audit(access.account!, "undid_assignments", previous.id, { teams: teams.length, students: assigned.length }), ...current.audits].slice(0, 500)
    }));
    return NextResponse.json({ program: programmeForAccount(updated.program, access.account), proposal: updated.assignmentProposal, assignmentHistory: updated.assignmentHistory });
  }
  const proposal = parsed.data.proposal || database.assignmentProposal;
  if (!proposal || proposal.id !== parsed.data.proposalId) return NextResponse.json({ error: "That assignment proposal is no longer available. Generate a new one." }, { status: 409 });
  const validProposal = assignmentProposalSchema.safeParse(proposal);
  if (!validProposal.success || validProposal.data.missionId !== database.program.mission.id) return NextResponse.json({ error: "Assignment proposal does not match the active mission." }, { status: 409 });
  const missionRoles = new Set(database.program.mission.roles.map((role) => role.title));
  const teamIds = validProposal.data.teams.map((team) => team.id);
  const proposalRoles = Object.values(validProposal.data.teams.flatMap((team) => Object.values(team.roles)));
  if (validProposal.data.teams.length !== validProposal.data.teamCount || new Set(teamIds).size !== teamIds.length || validProposal.data.teamCount > activeStudents.length || proposalRoles.some((role) => !missionRoles.has(role))) {
    return NextResponse.json({ error: "The assignment proposal has invalid teams or roles. Generate a new proposal." }, { status: 409 });
  }
  const students = new Map(activeStudents.map((student) => [student.id, student]));
  const assigned = validProposal.data.teams.flatMap((team) => team.memberIds);
  if (new Set(assigned).size !== assigned.length || assigned.some((id) => !students.has(id)) || assigned.length !== activeStudents.length) return NextResponse.json({ error: "Every active rostered student must appear exactly once in the proposal." }, { status: 409 });
  const teams = validProposal.data.teams.map((team) => ({
    id: team.id,
    name: team.name,
    colour: team.colour,
    milestone: 0,
    health: "waiting" as const,
    lastActivity: "Awaiting first milestone",
    members: team.memberIds.map((id) => ({ id, name: students.get(id)!.name, role: team.roles[id] || "Contributor", contribution: 0, checkIn: "waiting" as const }))
  }));
  const updated = await updateDatabase((current) => ({
    ...current,
    program: { ...current.program, teams, classRoom: { ...current.program.classRoom, studentCount: activeStudents.length } },
    assignmentProposal: { ...validProposal.data, status: "approved" },
    assignmentHistory: current.assignmentProposal ? [current.assignmentProposal, ...current.assignmentHistory].slice(0, 20) : current.assignmentHistory,
    audits: [audit(access.account!, "approved_assignments", validProposal.data.id, { teams: teams.length, students: assigned.length }), ...current.audits].slice(0, 500)
  }));
  return NextResponse.json({ program: programmeForAccount(updated.program, access.account), proposal: updated.assignmentProposal, assignmentHistory: updated.assignmentHistory });
}
