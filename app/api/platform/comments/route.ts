import { NextResponse } from "next/server";
import { commentSchema } from "@/features/platform/contracts";
import { requireAccount, resourceAccessResponse } from "@/features/platform/server-auth";
import { audit, rateLimited, readDatabase, studentMissionVisible, updateDatabase } from "@/features/platform/server-store";

export async function GET() {
  const access = await requireAccount();
  if (access.response || !access.account) return access.response;
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  const comments = database.comments.filter((comment) => comment.missionId === database.program.mission.id).filter((comment) => {
    if (access.account!.role === "teacher" || access.account!.role === "admin") return true;
    return comment.thread === (access.account!.role === "partner" ? "partner" : "team");
  });
  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  const access = await requireAccount();
  if (access.response || !access.account) return access.response;
  if (rateLimited(`comments:${access.account.id}`, 60, 60_000)) return NextResponse.json({ error: "Too many comments in a short period. Please pause before posting again." }, { status: 429 });
  const parsed = commentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Write a focused comment of up to 1,000 characters." }, { status: 400 });
  if ((access.account.role === "student" && parsed.data.thread !== "team") || (access.account.role === "partner" && parsed.data.thread !== "partner")) {
    return NextResponse.json({ error: "That comment thread is not available to your role." }, { status: 403 });
  }
  const database = await readDatabase();
  const resourceError = resourceAccessResponse(database, access.account);
  if (resourceError) return resourceError;
  if (access.account.role === "student" && !studentMissionVisible(database.program)) return NextResponse.json({ error: "Team discussion opens after teacher mission approval." }, { status: 403 });
  if (parsed.data.missionId !== database.program.mission.id) return NextResponse.json({ error: "Comments must belong to the active mission." }, { status: 400 });
  if (parsed.data.parentId && !database.comments.some((comment) => comment.id === parsed.data.parentId && comment.missionId === parsed.data.missionId && comment.thread === parsed.data.thread)) return NextResponse.json({ error: "That comment thread could not be found." }, { status: 400 });
  const comment = { ...parsed.data, id: `comment-${crypto.randomUUID()}`, author: { id: access.account.id, name: access.account.name, role: access.account.role }, createdAt: new Date().toISOString() };
  const recipientId = access.account.role === "partner" ? "teacher-devi" : access.account.role === "teacher" ? "partner-anitha" : "teacher-devi";
  const updated = await updateDatabase((database) => ({
    ...database,
    comments: [comment, ...database.comments].slice(0, 500),
    program: { ...database.program, notifications: [{ id: `notification-${crypto.randomUUID()}`, text: `${access.account!.name} posted a ${comment.thread} comment.`, unread: true, recipientId }, ...database.program.notifications].slice(0, 200) },
    audits: [audit(access.account!, "posted_comment", comment.id, { thread: comment.thread, recipientId }), ...database.audits].slice(0, 500)
  }));
  return NextResponse.json({ comment: updated.comments[0] }, { status: 201 });
}
