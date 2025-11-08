import { NextResponse } from "next/server";
import { mongoClientPromise } from "@/lib/mongodb";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code")?.toUpperCase();

  if (!code || code.length < 4) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const client = await mongoClientPromise;
  const db = client.db();
  const gameSessions = db.collection("gameSessions");

  const gs = await gameSessions.findOne({ joinCode: code, active: true });
  if (!gs) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    gameId: (gs as any).gameId,
  });
}
