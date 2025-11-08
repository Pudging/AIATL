import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mongoClientPromise } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const gameId = params.id;
  if (!gameId) {
    return NextResponse.json({ error: "Missing game id" }, { status: 400 });
  }
  const client = await mongoClientPromise;
  const db = client.db();
  const gameSessions = db.collection("gameSessions");
  const playerAssignments = db.collection("playerAssignments");
  const usersCol = db.collection("users");

  let gs = (await gameSessions.findOne({ gameId, active: true })) as
    | (Record<string, any> & { _id: ObjectId })
    | null;
  if (!gs) {
    const doc = {
      gameId,
      joinCode: generateCode(),
      hostUserId: session?.user?.id ?? null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const res = await gameSessions.insertOne(doc);
    gs = { ...doc, _id: res.insertedId } as any;
  }

  if (!gs) {
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }

  const assignments = await playerAssignments
    .find({ gameSessionId: (gs as any)._id.toString() })
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
        user: {
          id: p.userId,
          name: user?.name ?? null,
          image: user?.image ?? null,
        },
      };
    })
  );

  return NextResponse.json({
    id: (gs as any)._id.toString(),
    gameId: (gs as any).gameId,
    joinCode: (gs as any).joinCode,
    players,
  });
}
