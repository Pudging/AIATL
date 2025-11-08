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
  const gameSessionId = (body?.gameSessionId || "").toString();
  const slot = Number(body?.slot);
  if (!gameSessionId || !Number.isInteger(slot) || slot < 0 || slot > 2) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const client = await mongoClientPromise;
  const db = client.db();
  const playerAssignments = db.collection("playerAssignments");
  await playerAssignments.deleteOne({ gameSessionId, slot });
  return NextResponse.json({ ok: true });
}
