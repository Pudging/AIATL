import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mongoClientPromise } from "@/lib/mongodb";

type ShotInput = {
  playerUserId: string;
  gameId: string;
  gameSessionId?: string;
  made: boolean;
  points: number;
  shotTypeActual?: string | null;
  shotTypePredicted?: string | null;
  matchedGesture?: boolean | null;
  period?: string | number | null;
  clock?: string | null;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const shots = ([] as ShotInput[]).concat(body?.shots || []);
  if (!shots.length) {
    return NextResponse.json({ error: "No shots provided" }, { status: 400 });
  }
  // Basic validation
  for (const s of shots) {
    if (!s.playerUserId || !s.gameId) {
      return NextResponse.json(
        { error: "Invalid shot payload" },
        { status: 400 }
      );
    }
  }
  const client = await mongoClientPromise;
  const db = client.db();
  const shotsCol = db.collection("shots");
  const docs = shots.map((s) => ({
    userId: s.playerUserId,
    gameId: s.gameId,
    gameSessionId: s.gameSessionId ?? null,
    timestamp: new Date(),
    made: !!s.made,
    points: s.points ?? 0,
    shotTypeActual: s.shotTypeActual ?? null,
    shotTypePredicted: s.shotTypePredicted ?? null,
    matchedGesture:
      typeof s.matchedGesture === "boolean" ? s.matchedGesture : null,
    period: s.period != null ? String(s.period) : null,
    clock: s.clock ?? null,
  }));
  const res = await shotsCol.insertMany(docs);
  return NextResponse.json({ ok: true, count: res.insertedCount });
}
