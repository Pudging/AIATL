import { NextResponse } from "next/server";
import { mongoClientPromise } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const client = await mongoClientPromise;
  const db = client.db();
  const shotsCol = db.collection("shots");
  const usersCol = db.collection("users");

  // Get user info
  let user = null;
  try {
    user = await usersCol.findOne({ _id: new ObjectId(userId) });
  } catch {}

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get all shots for this user
  const shots = await shotsCol
    .find({ userId })
    .sort({ timestamp: -1 })
    .toArray();

  // Calculate overall stats
  const totalShots = shots.length;
  const madeShots = shots.filter((s: any) => s.made).length;
  const missedShots = totalShots - madeShots;
  const overallAccuracy = totalShots > 0 ? (madeShots / totalShots) * 100 : 0;

  // Calculate gesture match accuracy
  const shotsWithGesture = shots.filter(
    (s: any) => s.matchedGesture !== null && s.matchedGesture !== undefined
  );
  const matchedGestures = shotsWithGesture.filter(
    (s: any) => s.matchedGesture === true
  ).length;
  const gestureAccuracy =
    shotsWithGesture.length > 0
      ? (matchedGestures / shotsWithGesture.length) * 100
      : 0;

  // Calculate shot type accuracy
  const shotsWithTypes = shots.filter(
    (s: any) => s.shotTypeActual && s.shotTypePredicted
  );
  const correctTypes = shotsWithTypes.filter(
    (s: any) => s.shotTypeActual === s.shotTypePredicted
  ).length;
  const typeAccuracy =
    shotsWithTypes.length > 0
      ? (correctTypes / shotsWithTypes.length) * 100
      : 0;

  // Group by game
  const gameStats = new Map<
    string,
    {
      gameId: string;
      totalShots: number;
      made: number;
      missed: number;
      accuracy: number;
      totalPoints: number;
      lastPlayed: Date;
    }
  >();

  for (const shot of shots as any[]) {
    const gameId = shot.gameId;
    if (!gameStats.has(gameId)) {
      gameStats.set(gameId, {
        gameId,
        totalShots: 0,
        made: 0,
        missed: 0,
        accuracy: 0,
        totalPoints: 0,
        lastPlayed: shot.timestamp,
      });
    }
    const stats = gameStats.get(gameId)!;
    stats.totalShots++;
    if (shot.made) {
      stats.made++;
    } else {
      stats.missed++;
    }
    stats.totalPoints += shot.points ?? 0;
    if (shot.timestamp > stats.lastPlayed) {
      stats.lastPlayed = shot.timestamp;
    }
  }

  // Calculate accuracy for each game
  const gameStatsArray = Array.from(gameStats.values()).map((stats) => ({
    ...stats,
    accuracy: stats.totalShots > 0 ? (stats.made / stats.totalShots) * 100 : 0,
  }));

  // Sort by last played
  gameStatsArray.sort(
    (a, b) => b.lastPlayed.getTime() - a.lastPlayed.getTime()
  );

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      name: user.name ?? "Unknown",
      image: user.image ?? null,
    },
    overall: {
      totalShots,
      made: madeShots,
      missed: missedShots,
      accuracy: overallAccuracy,
      gestureAccuracy,
      typeAccuracy,
    },
    games: gameStatsArray,
  });
}
