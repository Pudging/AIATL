import { NextResponse } from 'next/server';
import { fetchPlayByPlay, fetchBoxScore, parseGameState } from '@/lib/nba';

type Params = { params: { id: string } };

export async function GET(req: Request, { params }: Params) {
  try {
    const { searchParams } = new URL(req.url);
    const timestamp = searchParams.get('timestamp');
    const loadAll = searchParams.get('loadAll') === 'true';
    
    // For TEST002 with loadAll, return all historical states with timestamps
    if (params.id.toUpperCase() === 'TEST002' && loadAll) {
      const [pbp, boxScore] = await Promise.all([
        fetchPlayByPlay(params.id),
        fetchBoxScore(params.id)
      ]);
      
      // Parse the full game data
      const actions = pbp?.game?.actions || [];
      console.log(`[API TEST002] Total actions in NBA data: ${actions.length}`);
      const allStates = [];
      
      // Create a state for EVERY action to capture all significant events
      let missingTimestamps = 0;
      
      for (let i = 0; i < actions.length; i++) {
        const partialPbp = {
          ...pbp,
          game: {
            ...pbp.game,
            actions: actions.slice(0, i + 1)
          }
        };
        const state = parseGameState(partialPbp, boxScore);
        
        // Get the timestamp from the current action
        const currentAction = actions[i];
        const timeActual = currentAction?.timeActual;
        
        if (!timeActual) {
          missingTimestamps++;
          // Use previous action's timestamp or estimate
          const prevTimeActual = i > 0 ? actions[i - 1]?.timeActual : null;
          if (prevTimeActual) {
            // Add 1 second to previous timestamp as fallback
            const prevTime = new Date(prevTimeActual).getTime();
            const estimatedTimeActual = new Date(prevTime + 1000).toISOString();
            allStates.push({
              state,
              timeActual: estimatedTimeActual
            });
          } else {
            // Skip if no timestamp available
            continue;
          }
        } else {
          allStates.push({
            state,
            timeActual
          });
        }
      }
      
      if (missingTimestamps > 0) {
        console.log(`[API TEST002] Warning: ${missingTimestamps} actions had missing timestamps (estimated)`);
      }
      
      console.log(`[API TEST002] Created ${allStates.length} states (one per action)`);
      
      // Debug: Log states around Q4 6:15 to check for gaps
      const q4States = allStates.filter((s: any) => s.state.period === 4);
      console.log(`[API TEST002] Q4 has ${q4States.length} states`);
      
      return NextResponse.json({ gameId: params.id, states: allStates });
    }
    
    // Normal single state response
    const [pbp, boxScore] = await Promise.all([
      fetchPlayByPlay(params.id, timestamp ? parseInt(timestamp) : undefined),
      fetchBoxScore(params.id)
    ]);
    const state = parseGameState(pbp, boxScore);
    return NextResponse.json({ gameId: params.id, state });
  } catch (error) {
    console.error('Error in game API:', error);
    return NextResponse.json({ error: 'Failed to fetch game data' }, { status: 500 });
  }
}


