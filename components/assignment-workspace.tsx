"use client";

import { useEffect, useState } from "react";
import type { AssignmentProposal, StudentProfile } from "@/features/platform/contracts";
import type { ProgramPage, ProgramState } from "@/features/program/state";

type AssignmentWorkspaceProps = {
  program: ProgramState;
  update: (fn: (state: ProgramState) => ProgramState) => void;
  go?: (page: ProgramPage) => void;
};

const template = "name,email,userId,interests,strengths,availability,availabilityWindows,preferredRoles,accommodations,accessibilityNotes\nAsha Raman,asha@example.org,student-asha,research;writing,research,full,morning,research lead,,\nKabir Menon,kabir@example.org,,data;math,analysis,full,afternoon,data lead,,\nNila Kurian,nila@example.org,,design;visuals,creative,limited,morning,design lead,quiet workspace,";

export default function AssignmentWorkspace({ program, update }: AssignmentWorkspaceProps) {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [proposal, setProposal] = useState<AssignmentProposal | undefined>();
  const [hasHistory, setHasHistory] = useState(false);
  const [csv, setCsv] = useState(template);
  const [teamCount, setTeamCount] = useState(program.teams.length || 1);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const response = await fetch("/api/platform/assignments");
    if (!response.ok) return;
    const data = await response.json() as { students: StudentProfile[]; proposal?: AssignmentProposal; assignmentHistory?: AssignmentProposal[] };
    setStudents(data.students || []);
    setProposal(data.proposal);
    setHasHistory(Boolean(data.assignmentHistory?.length));
    if (data.proposal?.teamCount) setTeamCount(data.proposal.teamCount);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const importRoster = async () => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/platform/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv })
      });
      const data = await response.json().catch(() => ({})) as { students?: StudentProfile[]; error?: string };
      if (!response.ok) { setMessage(data.error || "Roster could not be imported."); return; }
      setStudents(data.students || []);
      setProposal(undefined);
      setMessage(`${data.students?.length || 0} students imported. Generate a balanced proposal next.`);
    } catch { setMessage("Connection interrupted while importing the roster."); } finally { setBusy(false); }
  };

  const propose = async () => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/platform/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "propose", teamCount })
      });
      const data = await response.json().catch(() => ({})) as { proposal?: AssignmentProposal; error?: string };
      if (!response.ok || !data.proposal) { setMessage(data.error || "Assignment proposal could not be created."); return; }
      setProposal(data.proposal);
      setMessage("Proposal ready. Review every team and role before approving.");
    } catch { setMessage("Connection interrupted while creating the proposal."); } finally { setBusy(false); }
  };

  const changeRole = (teamId: string, studentId: string, role: string) => setProposal((current) => current ? {
    ...current,
    teams: current.teams.map((team) => team.id === teamId ? { ...team, roles: { ...team.roles, [studentId]: role } } : team)
  } : current);

  const approve = async () => {
    if (!proposal) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/platform/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", proposalId: proposal.id, proposal })
      });
      const data = await response.json().catch(() => ({})) as { program?: ProgramState; proposal?: AssignmentProposal; error?: string };
      if (!response.ok || !data.program) { setMessage(data.error || "Assignment proposal could not be approved."); return; }
      update(() => data.program!);
      setProposal(data.proposal);
      setMessage("Assignment approved. Students can now see their team roles after the mission gate opens.");
    } catch { setMessage("Connection interrupted while approving assignments."); } finally { setBusy(false); }
  };

  const undo = async () => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/platform/assignments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "undo", historyId: "latest" }) });
      const data = await response.json().catch(() => ({})) as { program?: ProgramState; proposal?: AssignmentProposal; assignmentHistory?: AssignmentProposal[]; error?: string };
      if (!response.ok || !data.program) { setMessage(data.error || "The previous assignment could not be restored."); return; }
      update(() => data.program!);
      setProposal(data.proposal);
      setHasHistory(Boolean(data.assignmentHistory?.length));
      setMessage("The previous approved assignment was restored.");
    } catch { setMessage("Connection interrupted while restoring the previous assignment."); } finally { setBusy(false); }
  };

  const profile = (id: string) => students.find((student) => student.id === id);
  const roles = program.mission.roles.map((role) => role.title);
  const maxTeams = Math.max(1, Math.min(8, students.length || 3));

  return <section className="assignment-workspace">
    <div className="assignment-header"><p>Roster and assignment</p><h1>Put the right people around the problem.</h1><span>Import the class context, let Pluto propose balanced teams, then make the final decision yourself.</span></div>
    <div className="assignment-grid">
      <section className="os-card assignment-import"><p className="card-kicker">1 - Import class context</p><h2>Student roster</h2><p>Use one row per student. Interests, role preferences, availability, and accommodations guide the proposal; support notes stay teacher-only.</p><textarea value={csv} onChange={(event) => setCsv(event.target.value)} aria-label="Student roster CSV" spellCheck={false} /><button className="button secondary" onClick={() => void importRoster()} disabled={busy}>Import roster</button><small>Columns: name, email, userId, interests, strengths, availability, availabilityWindows, preferredRoles, accommodations, accessibilityNotes. Separate multiple values with semicolons.</small><div className="roster-count">{students.length ? `${students.length} students ready` : "No roster imported yet"}</div></section>
      <section className="os-card assignment-controls"><p className="card-kicker">2 - Generate a proposal</p><h2>Balanced by role and team size</h2><p>Pluto matches profile signals to mission roles, spreads strong matches across teams, and separates limited-availability learners where possible.</p><label>Number of teams<select value={teamCount} onChange={(event) => setTeamCount(Number(event.target.value))}>{Array.from({ length: maxTeams }, (_, index) => <option value={index + 1} key={index + 1}>{index + 1} team{index ? "s" : ""}</option>)}</select></label><button className="button primary" onClick={() => void propose()} disabled={busy || students.length === 0}>Generate assignment proposal</button><small>Mission roles: {roles.join(" / ")}</small></section>
    </div>
    {proposal && <section className="assignment-proposal"><div className="assignment-proposal-head"><div><p className="card-kicker">3 - Teacher review</p><h2>{proposal.status === "approved" ? "Approved assignment" : "Review this proposal"}</h2><span>{proposal.className} / {proposal.teams.length} teams / generated from {students.length} profiles</span></div><div className="assignment-actions"><button className="button secondary" onClick={() => void undo()} disabled={busy || !hasHistory}>Undo last approval</button><button className="button primary" onClick={() => void approve()} disabled={busy || proposal.status === "approved"}>Approve assignments</button></div></div><div className="assignment-team-grid">{proposal.teams.map((team) => <article className="assignment-team" key={team.id}><div><strong>{team.name}</strong><small>{team.memberIds.length} students</small></div>{team.memberIds.map((studentId) => { const student = profile(studentId); return <label key={studentId}><span>{student?.name || studentId}<small>{student?.interests.join(" / ")}</small>{student?.accommodations?.length ? <small className="assignment-support-note">Accommodations: {student.accommodations.join(" / ")}</small> : student?.accessibilityNotes && <small className="assignment-support-note">Support note: {student.accessibilityNotes}</small>}</span><select aria-label={`${student?.name || studentId} role`} value={team.roles[studentId] || roles[0]} onChange={(event) => changeRole(team.id, studentId, event.target.value)} disabled={proposal.status === "approved"}>{roles.map((role) => <option value={role} key={role}>{role}</option>)}</select></label>; })}<p>{team.rationale}</p></article>)}</div></section>}
    {message && <p className="platform-feedback assignment-message">{message}</p>}
  </section>;
}
