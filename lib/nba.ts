import axios from 'axios';
import type { ParsedGameState, SimplifiedGame } from '@/components/types';

const SCOREBOARD_URL = 'https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json';
const PLAYBYPLAY_URL = (gameId: string) => `https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`;

export async function fetchLiveScoreboard(): Promise<any> {
  const { data } = await axios.get(SCOREBOARD_URL, { timeout: 10000 });
  return data;
}

export async function fetchPlayByPlay(gameId: string): Promise<any> {
  const { data } = await axios.get(PLAYBYPLAY_URL(gameId), { timeout: 10000 });
  return data;
}

export function simplifyScoreboard(scoreboardJson: any): SimplifiedGame[] {
  const games = scoreboardJson?.scoreboard?.games ?? [];
  return games
    .filter((g: any) => g.gameStatus === 2) // only live
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

export function parseGameState(playByPlayJson: any): ParsedGameState {
  const game = playByPlayJson?.game ?? {};
  const actions: any[] = Array.isArray(game.actions) ? game.actions : [];
  const lastAction = actions.length ? actions[actions.length - 1] : null;

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
      shooter = {
        personId: a.personId?.toString() || a.playerId?.toString() || a.player1Id?.toString(),
        name: a.playerNameI || a.playerName || a.player1Name,
        teamTricode: a.teamTricode || a.teamTricode1 || a.teamTricode2,
        result: a.shotResult || a.result || null
      };
    }
    if (!ballHandler && ['rebound', 'turnover', 'steal', 'shot', 'foul', 'violation'].includes(a?.actionType)) {
      ballHandler = {
        personId: a.personId?.toString() || a.playerId?.toString() || a.player1Id?.toString(),
        name: a.playerNameI || a.playerName || a.player1Name,
        teamTricode: a.teamTricode || a.teamTricode1 || a.teamTricode2
      };
    }
  }

  const period = game.period ?? null;
  const clock = game.gameClock || lastAction?.clock || '';

  return {
    period,
    clock,
    score,
    shooter,
    ballHandler,
    lastAction,
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


