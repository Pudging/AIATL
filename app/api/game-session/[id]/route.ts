import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mongoClientPromise } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

async function generateUniqueCode(): Promise<string> {
  const client = await mongoClientPromise;
  const db = client.db();
  const gameSessions = db.collection("gameSessions");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  // Try up to N attempts to avoid rare collision
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    const existing = await gameSessions.findOne({
      joinCode: code,
      active: true,
    });
    if (!existing) return code;
  }
  // Fallback: include timestamp suffix if collisions persist
  return `J${Date.now().toString().slice(-6)}`;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const cookieStore = cookies();
  let hostKey = cookieStore.get("hostKey")?.value ?? null;
  const gameId = params.id;
  if (!gameId) {
    return NextResponse.json({ error: "Missing game id" }, { status: 400 });
  }
  const client = await mongoClientPromise;
  const db = client.db();
  const gameSessions = db.collection("gameSessions");
  const playerAssignments = db.collection("playerAssignments");
  const usersCol = db.collection("users");

  // Allow explicit sessionId selection via query parameter for remote hosts
  const url = new URL(_req.url);
  const sessionIdParam = url.searchParams.get("sessionId");

  let gs: (Record<string, any> & { _id: ObjectId }) | null = null;
  if (sessionIdParam) {
    gs = (await gameSessions.findOne({
      _id: new ObjectId(sessionIdParam),
    })) as any;
  } else if (session?.user?.id) {
    // Authenticated host: use hostUserId to isolate sessions
    gs = (await gameSessions.findOne({
      gameId,
      active: true,
      hostUserId: session.user.id,
    })) as any;
    if (!gs) {
      const code = await generateUniqueCode();
      const doc = {
        gameId,
        joinCode: code,
        hostUserId: session.user.id,
        hostKey: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const res = await gameSessions.insertOne(doc);
      gs = { ...doc, _id: res.insertedId } as any;
    }
  } else {
    // Unauthenticated host: use persistent hostKey cookie per device
    if (!hostKey) {
      hostKey = crypto.randomUUID();
    }
    gs = (await gameSessions.findOne({
      gameId,
      active: true,
      hostKey,
    })) as any;
    if (!gs) {
      const code = await generateUniqueCode();
      const doc = {
        gameId,
        joinCode: code,
        hostUserId: null,
        hostKey,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const res = await gameSessions.insertOne(doc);
      gs = { ...doc, _id: res.insertedId } as any;
    }
  }

  // If selecting by explicit sessionId, validate it matches the requested game
  if (sessionIdParam && gs && (gs as any).gameId !== gameId) {
    return NextResponse.json(
      { error: "Session does not belong to this game" },
      { status: 400 }
    );
  }

  // Creation handled in selection branches above

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
        points: typeof p.points === "number" ? p.points : 0,
        user: {
          id: p.userId,
          name: user?.name ?? null,
          image: user?.image ?? null,
        },
      };
    })
  );

  const response = NextResponse.json({
    id: (gs as any)._id.toString(),
    gameId: (gs as any).gameId,
    joinCode: (gs as any).joinCode,
    players,
  });
  if (!session?.user?.id && hostKey) {
    response.cookies.set("hostKey", hostKey, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}
