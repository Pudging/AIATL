import { NextResponse } from 'next/server';
import { fetchPlayByPlay, parseGameState } from '@/lib/nba';

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  try {
    const raw = await fetchPlayByPlay(params.id);
    const state = parseGameState(raw);
    return NextResponse.json({ gameId: params.id, state });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch game play-by-play' }, { status: 500 });
  }
}


