import { createDemoMission } from "@/features/missions/demo";
import type { Mission } from "@/features/missions/schema";

export type AppRole = "partner" | "teacher" | "student" | "admin";
export type ProgramPage =
  | "landing" | "partner_dashboard" | "partner_intake" | "partner_validation"
  | "teacher_dashboard" | "teacher_mission" | "teacher_teams" | "teacher_monitor" | "teacher_assessment"
  | "student_mission" | "student_workspace" | "student_research" | "student_artifacts" | "student_reflection" | "student_submit"
  | "admin_dashboard" | "admin_partners" | "admin_governance" | "admin_analytics" | "proof";

export type TeamMember = { id: string; name: string; role: string; contribution: number; checkIn: "on track" | "needs support" | "waiting" };
export type Team = { id: string; name: string; colour: string; members: TeamMember[]; milestone: number; health: "on track" | "needs support" | "waiting"; lastActivity: string };
export type Source = { id: string; title: string; publisher: string; url: string; claim: string; confidence: "verified" | "review" | "unverified"; addedBy: string };
export type Artifact = { id: string; title: string; type: "Poster" | "Social tiles" | "Report" | "Data summary" | "Presentation"; status: "draft" | "ready" | "submitted"; owner: string; updated: string };
export type RubricScore = { criterion: string; weight: number; score: number | null; feedback: string };
export type Activity = { id: string; action: string; actor: string; time: string; kind: "mission" | "team" | "safety" | "submission" | "partner" };

export type ProgramState = {
  version: 1;
  mission: Mission;
  school: { name: string; district: string; students: number; aiPolicy: "Teacher reviewed" | "Restricted"; consentStatus: "Complete" | "Needs review" };
  partner: { organisation: string; contact: string; verified: boolean; challengeStatus: "draft" | "in review" | "active" | "delivered" | "validated"; impactNote: string };
  classRoom: { name: string; grade: string; teacher: string; deadline: string; studentCount: number };
  teams: Team[];
  sources: Source[];
  artifacts: Artifact[];
  reflections: Record<string, string>;
  rubric: RubricScore[];
  activities: Activity[];
  notifications: { id: string; text: string; unread: boolean; recipientId?: string }[];
  partnerValidated: boolean;
  finalSubmitted: boolean;
  assessmentReleased: boolean;
  publicProofConsent: boolean;
  proofIssuedAt: string | null;
  proofId: string;
};

const now = "Today, 10:30 AM";

export function createDemoProgram(): ProgramState {
  const mission = { ...createDemoMission(), status: "in_progress" as const };
  return {
    version: 1,
    mission,
    school: { name: "Harbourview Senior School", district: "Kochi Urban District", students: 842, aiPolicy: "Teacher reviewed", consentStatus: "Complete" },
    partner: { organisation: mission.organisation, contact: "Anitha Menon · Community outreach", verified: true, challengeStatus: "active", impactNote: "We need material that families can understand and use without specialist support." },
    classRoom: { name: "Grade 10 · Environmental Systems", grade: "Grade 10", teacher: "Ms. Devi Nair", deadline: "30 July 2026", studentCount: 28 },
    teams: [
      { id: "team-sundown", name: "Team Sundown", colour: "violet", milestone: 1, health: "on track", lastActivity: "Source log updated 18 min ago", members: [{ id: "s1", name: "Asha R.", role: "Research lead", contribution: 82, checkIn: "on track" }, { id: "s2", name: "Kabir M.", role: "Data lead", contribution: 74, checkIn: "on track" }, { id: "s3", name: "Nila K.", role: "Message lead", contribution: 68, checkIn: "on track" }, { id: "s4", name: "Arjun P.", role: "Design lead", contribution: 76, checkIn: "on track" }] },
      { id: "team-river", name: "Team River", colour: "blue", milestone: 1, health: "needs support", lastActivity: "No source added in 2 days", members: [{ id: "s5", name: "Isha S.", role: "Research lead", contribution: 46, checkIn: "needs support" }, { id: "s6", name: "Joel T.", role: "Data lead", contribution: 58, checkIn: "waiting" }, { id: "s7", name: "Riya N.", role: "Message lead", contribution: 65, checkIn: "on track" }, { id: "s8", name: "Vikram L.", role: "Design lead", contribution: 71, checkIn: "on track" }] },
      { id: "team-canopy", name: "Team Canopy", colour: "mint", milestone: 2, health: "on track", lastActivity: "Survey summary reviewed 1 hr ago", members: [{ id: "s9", name: "Maya V.", role: "Research lead", contribution: 89, checkIn: "on track" }, { id: "s10", name: "Samir D.", role: "Data lead", contribution: 83, checkIn: "on track" }, { id: "s11", name: "Lena J.", role: "Message lead", contribution: 70, checkIn: "on track" }, { id: "s12", name: "Hari B.", role: "Design lead", contribution: 72, checkIn: "on track" }] }
    ],
    sources: [
      { id: "src-1", title: "Kerala Solid Waste Management Rules", publisher: "Government of Kerala", url: "https://lsgkerala.gov.in", claim: "Households should separate organic, recyclable, and reject waste before collection.", confidence: "verified", addedBy: "Asha R." },
      { id: "src-2", title: "Waste separation explainer", publisher: "Kochi Municipal Waste Cell", url: "https://kochicity.kerala.gov.in", claim: "Clear labels reduce contamination in household recycling.", confidence: "review", addedBy: "Kabir M." }
    ],
    artifacts: [
      { id: "art-1", title: "Family sorting poster v2", type: "Poster", status: "draft", owner: "Nila K.", updated: "18 min ago" },
      { id: "art-2", title: "Survey patterns summary", type: "Data summary", status: "ready", owner: "Kabir M.", updated: "1 hr ago" },
      { id: "art-3", title: "Campaign evidence report", type: "Report", status: "draft", owner: "Asha R.", updated: "Yesterday" }
    ],
    reflections: {},
    rubric: mission.rubric.map((item) => ({ criterion: item.criterion, weight: item.weight, score: null, feedback: "" })),
    activities: [
      { id: "a1", action: "Mission approved with survey safeguards", actor: "Ms. Devi Nair", time: "Yesterday", kind: "safety" },
      { id: "a2", action: "Added a local-government source", actor: "Asha R.", time: "18 min ago", kind: "team" },
      { id: "a3", action: "Reviewed Team Canopy's survey summary", actor: "Ms. Devi Nair", time: "1 hr ago", kind: "mission" },
      { id: "a4", action: "Confirmed campaign materials are useful for families", actor: "Kochi Municipal Waste Cell", time: "2 days ago", kind: "partner" }
    ],
    notifications: [{ id: "n1", text: "Team River needs a check-in before the next milestone.", unread: true }, { id: "n2", text: "Partner feedback is ready for the final campaign kit.", unread: true }],
    partnerValidated: false,
    finalSubmitted: false,
    assessmentReleased: false,
    publicProofConsent: false,
    proofIssuedAt: null,
    // The server replaces this local fallback with a random, private verification id.
    proofId: "proof-sundown-local"
  };
}

const KEY = "pluto:complete-program:v1";

export function readProgram(): ProgramState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ProgramState;
    return data?.version === 1 && data.mission && Array.isArray(data.teams) ? data : null;
  } catch { return null; }
}

export function writeProgram(program: ProgramState) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(program));
}

export function appendActivity(state: ProgramState, activity: Omit<Activity, "id" | "time">): ProgramState {
  return { ...state, activities: [{ ...activity, id: `activity-${Date.now()}`, time: now }, ...state.activities].slice(0, 20) };
}
