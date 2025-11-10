import type { ParsedGameState } from "@/components/types";
import { fetchBoxScore, fetchPlayByPlay, parseGameState } from "@/lib/nba";

type GameId = string;

export type GameStateWithTimestamp = {
  state: ParsedGameState;
  timeActual: string;
};

const ESTIMATED_TIMESTAMP_STEP_MS = 1000;

const toTimestamp = (value?: string | null): number | null => {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
};

const ensureTimestamp = (
  candidate: string | null | undefined,
  fallback: string | null | undefined
): string | null => {
  if (candidate && toTimestamp(candidate) !== null) return candidate;
  if (!fallback) return null;
  const fallbackMs = toTimestamp(fallback);
  if (fallbackMs === null) return null;
  return new Date(fallbackMs + ESTIMATED_TIMESTAMP_STEP_MS).toISOString();
};

export const shouldLoadFullHistory = (gameId: GameId, loadAll: boolean) =>
  loadAll && gameId.toUpperCase() === "TEST002";

export async function getGameState(
  gameId: GameId,
  timestamp?: number
): Promise<ParsedGameState> {
  const [pbp, boxScore] = await Promise.all([
    fetchPlayByPlay(gameId, timestamp),
    fetchBoxScore(gameId),
  ]);
  return parseGameState(pbp, boxScore);
}

export async function getHistoricalGameStates(
  gameId: GameId
): Promise<GameStateWithTimestamp[]> {
  const [pbp, boxScore] = await Promise.all([
    fetchPlayByPlay(gameId),
    fetchBoxScore(gameId),
  ]);

  const actions: any[] = Array.isArray(pbp?.game?.actions)
    ? pbp.game.actions
    : [];
  console.log(`[GameState] Historical fetch: ${actions.length} actions found.`);

  let missingTimestamps = 0;
  const historicalStates: GameStateWithTimestamp[] = [];

  for (let i = 0; i < actions.length; i++) {
    const partialGame = {
      ...pbp,
      game: {
        ...pbp.game,
        actions: actions.slice(0, i + 1),
      },
    };

    const state = parseGameState(partialGame, boxScore);
    const currentAction = actions[i];
    const prevAction = i > 0 ? actions[i - 1] : null;

    const resolvedTimestamp = ensureTimestamp(
      currentAction?.timeActual,
      prevAction?.timeActual
    );

    if (!resolvedTimestamp) {
      missingTimestamps += 1;
      continue;
    }

    historicalStates.push({
      state,
      timeActual: resolvedTimestamp,
    });
  }

  if (missingTimestamps > 0) {
    console.warn(
      `[GameState] ${missingTimestamps} actions missing timestamps (skipped or estimated).`
    );
  }

  return historicalStates;
}

export const gameStateService = {
  getGameState,
  getHistoricalGameStates,
  shouldLoadFullHistory,
};
