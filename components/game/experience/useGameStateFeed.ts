import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { ParsedGameState } from "@/components/types";
import {
  findStateByGameClock,
  findStateByTimestamp,
  formatClock,
  type StateQueueItem,
} from "@/lib/gameClock";
import { pushStateToQueue, resetQueue } from "@/lib/gameStateQueue";
import { logger } from "@/lib/logger";

type SyncAnchor = {
  nbaTimestamp: number;
  realWorldTime: number;
};

type UseGameStateFeedOptions = {
  gameId: string;
  isTestGame: boolean;
  isTest002: boolean;
  testGameTimestamp: number;
  streamDelay: number;
  onStateForShot: (
    gameState: ParsedGameState,
    timestamp: number,
    isFromDelayedState: boolean
  ) => void;
};

type UseGameStateFeedResult = {
  state: ParsedGameState | null;
  liveState: ParsedGameState | null;
  delayedState: ParsedGameState | null;
  liveUpdateCount: number;
  delayedUpdateCount: number;
  error: string | null;
  syncAnchor: SyncAnchor | null;
  syncedPeriod: number;
  streamGameClock: string;
  setStreamGameClock: (clock: string) => void;
  setSyncedPeriod: (period: number) => void;
  setSyncAnchor: (anchor: SyncAnchor | null) => void;
  syncToClock: (clock: string, period: number) => void;
};

export function useGameStateFeed({
  gameId,
  isTestGame,
  isTest002,
  testGameTimestamp,
  streamDelay,
  onStateForShot,
}: UseGameStateFeedOptions): UseGameStateFeedResult {
  const [syncAnchor, setSyncAnchor] = useState<SyncAnchor | null>(null);
  const [syncedPeriod, setSyncedPeriod] = useState(1);
  const [streamGameClock, setStreamGameClock] = useState("");
  const queueRef = useRef<StateQueueItem[]>([]);
  const shotCallbackRef = useRef(onStateForShot);

  useEffect(() => {
    shotCallbackRef.current = onStateForShot;
  }, [onStateForShot]);

  const syncToClock = useCallback(
    (targetClock: string, targetPeriod: number) => {
      if (!targetClock) return;
      const match = findStateByGameClock({
        targetClock,
        targetPeriod,
        queue: queueRef.current,
      });
      if (!match) return;
      setSyncAnchor({
        nbaTimestamp: match.timestamp,
        realWorldTime: Date.now(),
      });
      setSyncedPeriod(targetPeriod);
      setStreamGameClock(targetClock);
    },
    []
  );

  const {
    liveState,
    liveUpdateCount,
    error,
  } = useLiveGameStatePolling({
    gameId,
    isTestGame,
    isTest002,
    testGameTimestamp,
    queueRef,
    shotCallbackRef,
    setSyncAnchor,
  });

  const {
    state,
    delayedState,
    delayedUpdateCount,
  } = useDelayedPlayback({
    queueRef,
    syncAnchor,
    streamDelay,
    isTestGame,
    isTest002,
    shotCallbackRef,
  });

  return {
    state,
    liveState,
    delayedState,
    liveUpdateCount,
    delayedUpdateCount,
    error,
    syncAnchor,
    syncedPeriod,
    streamGameClock,
    setStreamGameClock,
    setSyncedPeriod,
    setSyncAnchor,
    syncToClock,
  };
}

type PollingOptions = {
  gameId: string;
  isTestGame: boolean;
  isTest002: boolean;
  testGameTimestamp: number;
  queueRef: MutableRefObject<StateQueueItem[]>;
  shotCallbackRef: MutableRefObject<
    UseGameStateFeedOptions["onStateForShot"]
  >;
  setSyncAnchor: (anchor: SyncAnchor | null) => void;
};

function useLiveGameStatePolling({
  gameId,
  isTestGame,
  isTest002,
  testGameTimestamp,
  queueRef,
  shotCallbackRef,
  setSyncAnchor,
}: PollingOptions) {
  const [liveState, setLiveState] = useState<ParsedGameState | null>(null);
  const [liveUpdateCount, setLiveUpdateCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function loadHistoricalStates() {
      try {
        const res = await fetch(`/api/games/${gameId}?loadAll=true`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!active) return;

        resetQueue(queueRef, []);

        if (data?.states && Array.isArray(data.states)) {
          const now = Date.now();
          const firstTimeActual = data.states[0]?.timeActual;
          const lastTimeActual = data.states[data.states.length - 1]?.timeActual;

          if (firstTimeActual && lastTimeActual) {
            const firstTime = new Date(firstTimeActual).getTime();
            const lastTime = new Date(lastTimeActual).getTime();
            const gameDuration = lastTime - firstTime;

            data.states.forEach((item: any, index: number) => {
              const actionTime = new Date(item.timeActual).getTime();
              const offsetFromStart = actionTime - firstTime;
              const timestamp = now + offsetFromStart;
              pushStateToQueue(queueRef, item.state, timestamp);

              if (index === 0 || index === data.states.length - 1) {
                logger.info(
                  `[TEST002] State ${index}: mapped=${new Date(
                    timestamp
                  ).toLocaleTimeString()}`
                );
              }
            });

            setSyncAnchor({
              nbaTimestamp: now,
              realWorldTime: now,
            });

            logger.info(
              `[TEST002] Loaded ${data.states.length} states (${(
                gameDuration /
                1000 /
                60
              ).toFixed(1)} minutes)`
            );
          } else {
            const baseTime = now;
            const timePerState = 900000 / data.states.length;
            const items: StateQueueItem[] = data.states.map(
              (item: any, index: number) => ({
                state: item.state,
                timestamp: baseTime + index * timePerState,
              })
            );
            resetQueue(queueRef, items);

            setSyncAnchor({
              nbaTimestamp: now,
              realWorldTime: now,
            });
          }

          const firstState = data.states[0];
          setLiveState(firstState.state || firstState);
          setLiveUpdateCount(1);
        }
        setError(null);
      } catch (err) {
        logger.error("[TEST002] Error loading states:", err);
        if (active) setError("Failed to load game data");
      }
    }

    async function loadLatestState() {
      try {
        const url = isTestGame
          ? `/api/games/${gameId}?timestamp=${testGameTimestamp}`
          : `/api/games/${gameId}`;
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        if (data?.state) {
          const now = Date.now();
          setLiveState(data.state);
          setLiveUpdateCount((prev) => prev + 1);
          pushStateToQueue(queueRef, data.state, now);
          shotCallbackRef.current?.(data.state, now, false);
        }
        setError(null);
      } catch (err) {
        if (active) setError("Failed to fetch live update");
      }
    }

    if (isTest002) {
      loadHistoricalStates();
    } else {
      loadLatestState();
      if (!isTestGame) {
        pollTimer = setInterval(loadLatestState, 1500);
      }
    }

    return () => {
      active = false;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [
    gameId,
    isTest002,
    isTestGame,
    queueRef,
    setSyncAnchor,
    shotCallbackRef,
    testGameTimestamp,
  ]);

  return {
    liveState,
    liveUpdateCount,
    error,
  };
}

type DelayedPlaybackOptions = {
  queueRef: MutableRefObject<StateQueueItem[]>;
  syncAnchor: SyncAnchor | null;
  streamDelay: number;
  isTestGame: boolean;
  isTest002: boolean;
  shotCallbackRef: MutableRefObject<
    UseGameStateFeedOptions["onStateForShot"]
  >;
};

function useDelayedPlayback({
  queueRef,
  syncAnchor,
  streamDelay,
  isTestGame,
  isTest002,
  shotCallbackRef,
}: DelayedPlaybackOptions) {
  const [state, setState] = useState<ParsedGameState | null>(null);
  const [delayedState, setDelayedState] = useState<ParsedGameState | null>(
    null
  );
  const [delayedUpdateCount, setDelayedUpdateCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const queue = queueRef.current;
      if (queue.length === 0) return;

      if (!syncAnchor) {
        const latestItem = queue[queue.length - 1];
        if (!latestItem || latestItem.state === delayedState) return;

        setDelayedState(latestItem.state);
        setState(latestItem.state);
        setDelayedUpdateCount((prev) => prev + 1);

        if (isTestGame || isTest002) {
          shotCallbackRef.current?.(
            latestItem.state,
            latestItem.timestamp,
            true
          );
        }
        return;
      }

      const now = Date.now();
      const elapsedSinceSync = now - syncAnchor.realWorldTime;
      const targetNbaTimestamp =
        syncAnchor.nbaTimestamp + elapsedSinceSync + streamDelay * 1000;
      const latestAvailableTimestamp =
        queue[queue.length - 1]?.timestamp ?? now;
      const clampedTarget = Math.min(
        targetNbaTimestamp,
        latestAvailableTimestamp
      );

      const matchedState = findStateByTimestamp({
        targetTimestamp: clampedTarget,
        queue,
      });
      if (!matchedState || matchedState === delayedState) return;

      setDelayedState(matchedState);
      setState(matchedState);
      setDelayedUpdateCount((prev) => prev + 1);
      shotCallbackRef.current?.(matchedState, clampedTarget, true);

      const isClamped = clampedTarget !== targetNbaTimestamp;
      logger.info(
        `[PROGRESS] Q${matchedState.period} ${formatClock(
          matchedState.clock || ""
        )} | Elapsed: ${(elapsedSinceSync / 1000).toFixed(1)}s | Anchor: ${new Date(
          syncAnchor.nbaTimestamp
        ).toLocaleTimeString()} | Target: ${new Date(
          clampedTarget
        ).toLocaleTimeString()}${isClamped ? " (clamped)" : ""}`
      );
    }, 100);

    return () => clearInterval(interval);
  }, [
    delayedState,
    isTest002,
    isTestGame,
    queueRef,
    shotCallbackRef,
    streamDelay,
    syncAnchor,
  ]);

  return { state, delayedState, delayedUpdateCount };
}
