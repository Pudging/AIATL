import { NextResponse } from "next/server";
import { mongoClientPromise } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { sessionId } = body;

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const client = await mongoClientPromise;
  const db = client.db();
  const gameSessions = db.collection("gameSessions");
  const playerAssignments = db.collection("playerAssignments");

  try {
    // Delete all player assignments for this session
    await playerAssignments.deleteMany({ gameSessionId: sessionId });

    // Delete the session
    await gameSessions.deleteOne({ _id: new ObjectId(sessionId) });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error removing session:", error);
    return NextResponse.json(
      { error: "Failed to remove session" },
      { status: 500 }
    );
  }
}
