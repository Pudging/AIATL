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
  const delta = Number(body?.delta ?? 0);
  if (!gameSessionId || !Number.isInteger(slot)) {
    return NextResponse.json(
      { error: "Missing gameSessionId or slot" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: "Invalid delta" }, { status: 400 });
  }
  const client = await mongoClientPromise;
  const db = client.db();
  const playerAssignments = db.collection("playerAssignments");

  const res = await playerAssignments.findOneAndUpdate(
    { gameSessionId, slot },
    {
      $inc: { points: delta },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" as any }
  );
  const updated = res?.value as any;
  if (!updated) {
    return NextResponse.json(
      { error: "Assignment not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({
    ok: true,
    slot,
    points: typeof updated.points === "number" ? updated.points : 0,
  });
}
