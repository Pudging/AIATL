import { NextResponse } from 'next/server';
import { fetchLiveScoreboard, simplifyScoreboard } from '@/lib/nba';

export async function GET() {
  try {
    const data = await fetchLiveScoreboard();
    const games = simplifyScoreboard(data);
    return NextResponse.json({ games });
  } catch (error) {
    console.error('[API /games] Error fetching scoreboard:', error);
    // Return empty games array instead of error - let frontend show test games
    return NextResponse.json({ games: [] });
  }
}


