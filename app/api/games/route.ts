import { NextResponse } from 'next/server';
import { fetchLiveScoreboard, simplifyScoreboard } from '@/lib/nba';

export async function GET() {
  try {
    const data = await fetchLiveScoreboard();
    const games = simplifyScoreboard(data);
    return NextResponse.json({ games });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch live games' }, { status: 500 });
  }
}


