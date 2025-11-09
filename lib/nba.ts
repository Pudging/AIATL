import axios from 'axios';
import type { ParsedGameState, SimplifiedGame } from '@/components/types';
import { TEST_GAME_DATA, TEST_BOXSCORE_DATA, TEST002_GAME_DATA, TEST002_BOXSCORE_DATA, getTestGameDataAtTimestamp } from './testGameData';

const SCOREBOARD_URL = 'https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json';
const PLAYBYPLAY_URL = (gameId: string) => `https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`;
const BOXSCORE_URL = (gameId: string) => `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`;

export async function fetchLiveScoreboard(): Promise<any> {
  const { data } = await axios.get(SCOREBOARD_URL, { timeout: 10000 });
  return data;
}

export async function fetchPlayByPlay(gameId: string, timestamp?: number): Promise<any> {
  // Use test data if gameId is TEST001 (case insensitive)
  if (gameId.toUpperCase() === 'TEST001') {
    return getTestGameDataAtTimestamp(timestamp ?? 6);
  }
  
  // Use TEST002 to fetch real NBA playoff game data
  if (gameId.toUpperCase() === 'TEST002') {
    try {
      console.log('[NBA API] Fetching TEST002 from NBA API...');
      const { data } = await axios.get('https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_0042400121.json', { timeout: 10000 });
      console.log(`[NBA API] Successfully fetched TEST002 - ${data?.game?.actions?.length || 0} actions`);
      return data;
    } catch (error: any) {
      console.error('[NBA API] Error fetching TEST002 data:', error.message);
      console.error('[NBA API] Using fallback data with', TEST002_GAME_DATA?.game?.actions?.length || 0, 'actions');
      return TEST002_GAME_DATA;
    }
  }
  
  try {
    const { data } = await axios.get(PLAYBYPLAY_URL(gameId), { timeout: 10000 });
    return data;
  } catch (error) {
    console.error('Error fetching play-by-play, using test data:', error);
    return TEST_GAME_DATA;
  }
}

export async function fetchBoxScore(gameId: string): Promise<any> {
  // Use test data if gameId is TEST001 (case insensitive)
  if (gameId.toUpperCase() === 'TEST001') {
    return TEST_BOXSCORE_DATA;
  }
  
  // Use TEST002 to fetch real NBA playoff boxscore
  if (gameId.toUpperCase() === 'TEST002') {
    try {
      const { data } = await axios.get('https://cdn.nba.com/static/json/liveData/boxscore/boxscore_0042400121.json', { timeout: 10000 });
      return data;
    } catch (error) {
      console.error('Error fetching TEST002 boxscore, using fallback:', error);
      return TEST002_BOXSCORE_DATA;
    }
  }
  
  try {
    const { data } = await axios.get(BOXSCORE_URL(gameId), { timeout: 10000 });
    return data;
  } catch (error) {
    console.error('Error fetching boxscore, using test data:', error);
    return TEST_BOXSCORE_DATA;
  }
}

export function simplifyScoreboard(scoreboardJson: any): SimplifiedGame[] {
  const games = scoreboardJson?.scoreboard?.games ?? [];
  console.log('[NBA] Raw games count:', games.length);
  console.log('[NBA] Sample game statuses:', games.slice(0, 3).map((g: any) => ({
    id: g.gameId,
    status: g.gameStatus,
    statusText: g.gameStatusText
  })));
  
  return games
    .filter((g: any) => {
      // gameStatus: 1 = not started, 2 = live, 3 = finished
      // Include live games and games that are about to start
      return g.gameStatus === 2 || g.gameStatus === 1;
    })
    .map((g: any) => {
      const gameId = g.gameId as string;
      const home = g.homeTeam;
      const away = g.awayTeam;
      const period = g.period ?? g.gameStatusText;
      return {
        id: gameId,
        status: g.gameStatus,
        statusText: g.gameStatusText,
        period,
        gameClock: g.gameClock ?? '',
        home: {
          name: home.teamName,
          tricode: home.teamTricode,
          id: Number(home.teamId),
          score: Number(home.score) || 0,
          logo: teamLogoUrl(home.teamId)
        },
        away: {
          name: away.teamName,
          tricode: away.teamTricode,
          id: Number(away.teamId),
          score: Number(away.score) || 0,
          logo: teamLogoUrl(away.teamId)
        }
      };
    });
}

export function parseGameState(playByPlayJson: any, boxScoreJson?: any): ParsedGameState {
  const game = playByPlayJson?.game ?? {};
  const actions: any[] = Array.isArray(game.actions) ? game.actions : [];
  const lastAction = actions.length ? actions[actions.length - 1] : null;

  // Extract player stats from boxscore
  const playerStatsMap = new Map<string, any>();
  if (boxScoreJson?.game) {
    const homeStats = boxScoreJson.game.homeTeam?.players ?? [];
    const awayStats = boxScoreJson.game.awayTeam?.players ?? [];
    [...homeStats, ...awayStats].forEach((p: any) => {
      if (p.personId) {
        playerStatsMap.set(p.personId.toString(), {
          name: p.name || p.nameI || `${p.firstName} ${p.familyName}`,
          jerseyNum: p.jerseyNum,
          position: p.position,
          statistics: p.statistics || {},
          teamTricode: p.teamTricode
        });
      }
    });
  }

  // Derive score from the latest action when available; fallback to game-level score
  let derivedHome: number | null = null;
  let derivedAway: number | null = null;
  for (let i = actions.length - 1; i >= 0; i--) {
    const a = actions[i];
    const sh = a?.scoreHome ?? a?.homeScore ?? a?.scoreHomeTotal ?? null;
    const sa = a?.scoreAway ?? a?.awayScore ?? a?.scoreAwayTotal ?? null;
    if ((sh !== null && sh !== undefined) || (sa !== null && sa !== undefined)) {
      derivedHome = Number(sh ?? derivedHome ?? 0);
      derivedAway = Number(sa ?? derivedAway ?? 0);
      break;
    }
  }
  const score = {
    home: derivedHome ?? (Number(game.homeTeam?.score) || 0),
    away: derivedAway ?? (Number(game.awayTeam?.score) || 0)
  };

  const playerStats = new Map<string, { name: string; teamTricode?: string; fga: number; fgm: number; pts: number }>();
  for (const a of actions) {
    if (a?.actionType === 'shot') {
      const personId: string | undefined = a.personId?.toString() || a.playerId?.toString() || a.player1Id?.toString();
      const name: string | undefined = a.playerNameI || a.playerName || a.player1Name;
      const team: string | undefined = a.teamTricode || a.teamTricode1 || a.teamTricode2;
      if (!personId) continue;
      const entry = playerStats.get(personId) || { name: name ?? 'Unknown', teamTricode: team, fga: 0, fgm: 0, pts: 0 };
      entry.fga += 1;
      const shotResult = (a.shotResult || a.subType || a.result || '').toString().toLowerCase?.() ?? '';
      const made = shotResult.includes('made') || shotResult === 'make';
      if (made) {
        entry.fgm += 1;
        const is3 = (a.subType || a.shotType)?.toString().toLowerCase?.().includes('3') || a.points === 3 || a.pointsTotal === 3;
        entry.pts += is3 ? 3 : 2;
      }
      playerStats.set(personId, entry);
    }
  }

  let shooter: ParsedGameState['shooter'] = null;
  let ballHandler: ParsedGameState['ballHandler'] = null;
  for (let i = actions.length - 1; i >= 0 && (!shooter || !ballHandler); i--) {
    const a = actions[i];
    if (!shooter && a?.actionType === 'shot') {
      const personId = a.personId?.toString() || a.playerId?.toString() || a.player1Id?.toString();
      const boxStats = personId ? playerStatsMap.get(personId) : null;
      shooter = {
        personId,
        name: a.playerNameI || a.playerName || a.player1Name,
        teamTricode: a.teamTricode || a.teamTricode1 || a.teamTricode2,
        result: a.shotResult || a.result || null,
        liveStats: boxStats?.statistics
      };
    }
    if (!ballHandler && ['rebound', 'turnover', 'steal', 'shot', 'foul', 'violation'].includes(a?.actionType)) {
      const personId = a.personId?.toString() || a.playerId?.toString() || a.player1Id?.toString();
      const boxStats = personId ? playerStatsMap.get(personId) : null;
      ballHandler = {
        personId,
        name: a.playerNameI || a.playerName || a.player1Name,
        teamTricode: a.teamTricode || a.teamTricode1 || a.teamTricode2,
        liveStats: boxStats?.statistics
      };
    }
  }

  const period = lastAction?.period ?? game.period ?? null;
  const clock = lastAction?.clock || game.gameClock || '';

  const recentActions = actions.slice(-10).reverse().map((act: any) => ({
    playerName: act.playerNameI || act.playerName,
    teamTricode: act.teamTricode,
    actionType: act.actionType,
    shotResult: act.shotResult,
    description: act.description
  }));

  let lastShot: any = null;
  for (let i = actions.length - 1; i >= 0; i--) {
    const a = actions[i];
    if (a?.actionType === 'shot' || a?.actionType === '2pt' || a?.actionType === '3pt') {
      const shotTypeStr = (a.subType || a.shotType || a.actionType || '').toString();
      const is3 = shotTypeStr.toLowerCase().includes('3') || a.points === 3 || a.pointsTotal === 3;
      const shotResultStr = (a.shotResult || a.result || '').toString();
      const personId =
        a.personId?.toString() || a.playerId?.toString() || a.player1Id?.toString();
      lastShot = {
        playerId: personId,
        playerName: a.playerNameI || a.playerName || 'Unknown',
        teamTricode: a.teamTricode || a.teamTricode1,
        shotResult: shotResultStr || 'Unknown',
        shotType: shotTypeStr || (is3 ? '3PT' : '2PT'),
        points: is3 ? 3 : 2,
        description: a.description || a.descriptionLong
      };
      break;
    }
  }

  return {
    period,
    clock,
    score,
    homeTeam: game.homeTeam?.teamTricode ?? game.homeTeam?.teamName,
    awayTeam: game.awayTeam?.teamTricode ?? game.awayTeam?.teamName,
    shooter,
    ballHandler,
    lastAction,
    lastShot,
    recentActions,
    players: Array.from(playerStats.entries()).map(([personId, s]) => ({
      personId,
      ...s,
      fgPct: s.fga ? Math.round((s.fgm / s.fga) * 100) : 0
    }))
  };
}

function teamLogoUrl(teamId: number | string): string {
  return `https://cdn.nba.com/logos/nba/${teamId}/global/L/logo.svg`;
}

