import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mongoClientPromise } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await getServerSession(authOptions); // optional; allow unauth to view
  const gameId = params.id;
  if (!gameId) {
    return NextResponse.json({ error: "Missing game id" }, { status: 400 });
  }
  const client = await mongoClientPromise;
  const db = client.db();
  const gameSessions = db.collection("gameSessions");
  const playerAssignments = db.collection("playerAssignments");
  const usersCol = db.collection("users");

  const sessions = await gameSessions
    .find({ gameId, active: true })
    .project({ joinCode: 1, hostUserId: 1, hostKey: 1 })
    .toArray();

  const result = [] as Array<{
    id: string;
    joinCode: string;
    hostName: string | null;
    players: Array<{
      slot: number;
      points: number;
      user: { id: string; name: string | null; image: string | null };
    }>;
  }>;

  for (const s of sessions) {
    const sid = (s as any)._id.toString();

    // Get host name if authenticated
    let hostName: string | null = null;
    if ((s as any).hostUserId) {
      try {
        const hostUser = await usersCol.findOne({
          _id: new ObjectId((s as any).hostUserId),
        });
        hostName = hostUser?.name ?? null;
      } catch {}
    }

    const assignments = await playerAssignments
      .find({ gameSessionId: sid })
      .toArray();
    const players = await Promise.all(
      assignments.map(async (p: any) => {
        let user = null as any;
        try {
          user = await usersCol.findOne({ _id: new ObjectId(p.userId) });
        } catch {
          user = null;
        }
        return {
          slot: p.slot,
          points: typeof p.points === "number" ? p.points : 0,
          user: {
            id: p.userId,
            name: user?.name ?? null,
            image: user?.image ?? null,
          },
        };
      })
    );
    result.push({
      id: sid,
      joinCode: (s as any).joinCode,
      hostName,
      players,
    });
  }

  return NextResponse.json({ sessions: result });
}
