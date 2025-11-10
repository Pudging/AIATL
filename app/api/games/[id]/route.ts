import { NextResponse } from "next/server";
import {
  getGameState,
  getHistoricalGameStates,
  shouldLoadFullHistory,
} from "@/lib/gameStateService";

type Params = { params: { id: string } };

export async function GET(req: Request, { params }: Params) {
  try {
    const { searchParams } = new URL(req.url);
    const loadAll = searchParams.get("loadAll") === "true";
    const timestampParam = searchParams.get("timestamp");
    const parsedTimestamp = timestampParam
      ? Number.parseInt(timestampParam, 10)
      : undefined;
    const gameId = params.id;

    if (shouldLoadFullHistory(gameId, loadAll)) {
      const states = await getHistoricalGameStates(gameId);
      return NextResponse.json({ gameId, states });
    }

    const state = await getGameState(gameId, parsedTimestamp);
    return NextResponse.json({ gameId, state });
  } catch (error) {
    console.error("[Game API] Failed to fetch game data:", error);
    return NextResponse.json(
      { error: "Failed to fetch game data" },
      { status: 500 }
    );
  }
}
