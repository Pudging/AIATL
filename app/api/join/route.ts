import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mongoClientPromise } from "@/lib/mongodb";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const code = (body?.code || "").toString().toUpperCase();
  if (!code || code.length < 4) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const client = await mongoClientPromise;
  const db = client.db();
  const gameSessions = db.collection("gameSessions");
  const playerAssignments = db.collection("playerAssignments");

  const gs = await gameSessions.findOne({ joinCode: code, active: true });
  if (!gs) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Already joined?
  const existing = await playerAssignments.findOne({
    gameSessionId: (gs as any)._id.toString(),
    userId: session.user.id,
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      gameId: (gs as any).gameId,
      assignment: { slot: existing.slot },
    });
  }

  // Find next available slot 0..2
  const existingPlayers = await playerAssignments
    .find({ gameSessionId: (gs as any)._id.toString() })
    .toArray();
  const taken = new Set(existingPlayers.map((p: any) => p.slot as number));
  const available = [0, 1, 2].find((s) => !taken.has(s));
  if (available === undefined) {
    return NextResponse.json({ error: "Game is full" }, { status: 409 });
  }

  const toInsert = {
    gameSessionId: (gs as any)._id.toString(),
    userId: session.user.id,
    slot: available,
    joinedAt: new Date(),
  };
  await playerAssignments.insertOne(toInsert);

  return NextResponse.json({
    ok: true,
    gameId: (gs as any).gameId,
    assignment: { slot: available },
  });
}
