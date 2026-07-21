import { NextResponse } from "next/server";
import { programMutationActionSchema, programStateSchema } from "@/features/platform/contracts";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { allStudentsHaveConsent, applyProgramMutation, audit, programmeForAccount, readDatabase, studentMissionVisible, updateDatabase } from "@/features/platform/server-store";

export async function GET() {
  const access = await requireAccount();
  if (access.response) return access.response;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account!);
  if (resourceError) return resourceError;
  if (access.account?.role === "student" && !studentMissionVisible(database.program)) {
    return NextResponse.json({ error: "This mission is waiting for teacher approval before student access opens." }, { status: 403 });
  }
  const visibleProgram = programmeForAccount(database.program, access.account!);
  return NextResponse.json({ program: visibleProgram, account: access.account, unread: visibleProgram.notifications.filter((item) => item.unread).length });
}

export async function PATCH(request: Request) {
  const access = await requireAccount();
  if (access.response || !access.account) return access.response;
  const body = await request.json().catch(() => null) as { program?: unknown; action?: unknown } | null;
  const action = programMutationActionSchema.safeParse(body?.action);
  const candidate = programStateSchema.safeParse(body?.program);
  if (!action.success || !candidate.success) return NextResponse.json({ error: "This programme update was invalid or out of date." }, { status: 400 });
  try {
    const current = await readDatabase();
    const resourceError = resourceAccessResponse(current, access.account);
    if (resourceError) return resourceError;
    if (access.account.role === "teacher" && candidate.data.publicProofConsent && !current.program.publicProofConsent && !allStudentsHaveConsent(current, "public-proof")) {
      return NextResponse.json({ error: "Public Proof sharing requires an active public-proof consent record." }, { status: 403 });
    }
    const updated = await updateDatabase((database) => {
      const program = applyProgramMutation(database.program, candidate.data, access.account!, action.data);
      const eligible = program.finalSubmitted && program.assessmentReleased && program.partnerValidated && program.publicProofConsent && allStudentsHaveConsent(database, "public-proof");
      const existingSnapshot = database.proofSnapshots.find((snapshot) => snapshot.proofId === program.proofId);
      const proofSnapshots = eligible && !existingSnapshot
        ? [...database.proofSnapshots, {
          proofId: program.proofId,
          missionId: program.mission.id,
          missionTitle: program.mission.title,
          schoolName: program.school.name,
          partnerOrganisation: program.partner.organisation,
          issuedAt: program.proofIssuedAt || new Date().toISOString(),
          snapshotJson: JSON.stringify({ mission: program.mission, school: { name: program.school.name, district: program.school.district }, partner: { organisation: program.partner.organisation, impactNote: program.partner.impactNote }, rubric: program.rubric, assessmentReleased: program.assessmentReleased, partnerValidated: program.partnerValidated }),
        }]
        : database.proofSnapshots;
      return {
        ...database,
        program,
        proofSnapshots,
        audits: [audit(access.account!, action.data, "programme", { proofSnapshotCreated: eligible && !existingSnapshot }), ...database.audits].slice(0, 500)
      };
    });
    return NextResponse.json({ program: programmeForAccount(updated.program, access.account) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "This update is not permitted." }, { status: 403 });
  }
}
