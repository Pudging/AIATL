import { NextResponse } from "next/server";
import { mongoClientPromise } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
  const client = await mongoClientPromise;
  const db = client.db();
  const shotsCol = db.collection("shots");
  const usersCol = db.collection("users");

  // Get all unique user IDs from shots
  const userIds = await shotsCol.distinct("userId");

  // Get user info for each
  const players = await Promise.all(
    userIds.map(async (userId: string) => {
      let user = null;
      try {
        // Try as ObjectId first
        const objId = new ObjectId(userId);
        user = await usersCol.findOne({ _id: objId });
      } catch {
        // If not a valid ObjectId, check if shots exist for this string ID
        const shots = await shotsCol.findOne({ userId });
        if (shots) {
          user = { _id: userId, name: null, image: null };
        }
      }

      if (!user) return null;

      // Get shot count for this user
      const shotCount = await shotsCol.countDocuments({ userId });

      return {
        id: typeof user._id === "string" ? user._id : user._id.toString(),
        name: user.name ?? "Unknown Player",
        image: user.image ?? null,
        shotCount,
      };
    })
  );

  // Filter out nulls and sort by shot count
  const validPlayers = players
    .filter((p) => p !== null)
    .sort((a, b) => b!.shotCount - a!.shotCount);

  return NextResponse.json({ players: validPlayers });
}
