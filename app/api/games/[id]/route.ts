import { NextResponse } from 'next/server';
import { fetchPlayByPlay, fetchBoxScore, parseGameState } from '@/lib/nba';

type Params = { params: { id: string } };

export async function GET(req: Request, { params }: Params) {
  try {
    // Get timestamp from query params for test game
    const { searchParams } = new URL(req.url);
    const timestamp = searchParams.get('timestamp');
    
    const [pbp, boxScore] = await Promise.all([
      fetchPlayByPlay(params.id, timestamp ? parseInt(timestamp) : undefined),
      fetchBoxScore(params.id)
    ]);
    const state = parseGameState(pbp, boxScore);
    return NextResponse.json({ gameId: params.id, state });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch game data' }, { status: 500 });
  }
}


