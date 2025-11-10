import type { ParsedGameState } from "@/components/types";

export const clockToSeconds = (clock: string): number => {
  if (!clock) return 0;

  if (clock.startsWith("PT")) {
    const minutesMatch = clock.match(/(\d+)M/);
    const secondsMatch = clock.match(/(\d+(?:\.\d+)?)S/);
    const minutes = parseInt(minutesMatch?.[1] ?? "0", 10);
    const seconds = Math.floor(parseFloat(secondsMatch?.[1] ?? "0"));
    return minutes * 60 + Math.floor(seconds);
  }

  const parts = clock.split(":");
  if (parts.length === 2) {
    const mm = parseInt(parts[0] ?? "0", 10);
    const ss = parseInt(parts[1] ?? "0", 10);
    return mm * 60 + ss;
  }
  return 0;
};

export const formatClock = (clock: string): string => {
  if (!clock) return "--:--";
  if (!clock.startsWith("PT")) return clock;

  const minutesMatch = clock.match(/(\d+)M/);
  const secondsMatch = clock.match(/(\d+(?:\.\d+)?)S/);
  const minutes = minutesMatch ? parseInt(minutesMatch[1] ?? "0", 10) : 0;
  const seconds = secondsMatch
    ? Math.floor(parseFloat(secondsMatch[1] ?? "0"))
    : 0;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export type StateQueueItem = {
  state: ParsedGameState;
  timestamp: number;
};

export function findStateByGameClock({
  targetClock,
  targetPeriod,
  queue,
}: {
  targetClock: string;
  targetPeriod?: number;
  queue: StateQueueItem[];
}): { state: ParsedGameState; timestamp: number; delaySeconds: number } | null {
  if (!targetClock || queue.length === 0) return null;

  const latestState = queue[queue.length - 1]!.state;
  const searchPeriod = targetPeriod ?? latestState.period;

  const targetSeconds = clockToSeconds(targetClock);
  let closestMatch: {
    state: ParsedGameState;
    timestamp: number;
    diff: number;
  } | null = null;

  for (const item of queue) {
    const statePeriod =
      typeof item.state.period === "number"
        ? item.state.period
        : parseInt(String(item.state.period || "1"), 10);
    if (statePeriod !== searchPeriod) continue;

    const stateClock = item.state.clock || "";
    const stateSeconds = clockToSeconds(stateClock);
    const diff = Math.abs(stateSeconds - targetSeconds);

    if (!closestMatch || diff < closestMatch.diff) {
      closestMatch = { state: item.state, timestamp: item.timestamp, diff };
    }
  }

  if (!closestMatch) return null;

  const latestTimestamp = queue[queue.length - 1]!.timestamp;
  const delaySeconds = (latestTimestamp - closestMatch.timestamp) / 1000;

  return { state: closestMatch.state, timestamp: closestMatch.timestamp, delaySeconds };
}

export function findStateByTimestamp({
  targetTimestamp,
  queue,
}: {
  targetTimestamp: number;
  queue: StateQueueItem[];
}): ParsedGameState | null {
  if (queue.length === 0) return null;

  let bestState: {
    state: ParsedGameState;
    timestamp: number;
    index: number;
  } | null = null;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    if (!item) continue;
    if (item.timestamp <= targetTimestamp) {
      if (!bestState || item.timestamp > bestState.timestamp) {
        bestState = { state: item.state, timestamp: item.timestamp, index: i };
      }
    }
  }

  if (!bestState) {
    return queue[0]!.state;
  }

  const nextState = queue[bestState.index + 1];
  if (nextState && targetTimestamp > bestState.timestamp) {
    const gap = (nextState.timestamp - bestState.timestamp) / 1000;
    if (gap > 30) {
      console.warn(
        `[TIMESTAMP GAP] Stuck at Q${bestState.state.period} ${formatClock(
          bestState.state.clock || ""
        )} | Next state is ${gap.toFixed(1)}s away`
      );
    }
  }

  return bestState.state;
}
