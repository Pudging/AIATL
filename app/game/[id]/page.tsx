"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import type { ParsedGameState } from "@/components/types";
import type { ShotType } from "@/components/WebcamGestureDetector";
import ScoreAnimation from "@/components/ScoreAnimation";
import ShotIncomingOverlay from "@/components/ShotIncomingOverlay";
import ShotResultOverlay from "@/components/ShotResultOverlay";
import PointsEarnedOverlay from "@/components/PointsEarnedOverlay";
import MultiPlayerPointsOverlay from "@/components/MultiPlayerPointsOverlay";

const brandPalette = {
  deep: "#010c07",
  emerald: "#49e6b5",
  emeraldDark: "#0b5f4a",
  midnight: "#02170f",
  purple: "#a855f7",
};

const WebcamGestureDetector = dynamic(
  () => import("@/components/WebcamGestureDetector"),
  {
    ssr: false,
    loading: () => (
      <div className="text-center text-sm opacity-70">Loading camera…</div>
    ),
  }
);

export default function GameViewPage() {
  const PLAYER_LABELS = [
    "Left Player",
    "Right Player",
    "Center Player",
  ] as const;
  type PlayerLabel = (typeof PLAYER_LABELS)[number];
  const LABEL_COLORS: Record<PlayerLabel, string> = {
    "Left Player": brandPalette.emerald,
    "Right Player": brandPalette.purple,
    "Center Player": "#34d399",
  };
  const POINT_DELTA = 1000;
  const params = useParams<{ id: string }>();
  const id = params.id;

  // Audio ref for win sound
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  const debugWindowRef = useRef<Window | null>(null);
  const [state, setState] = useState<ParsedGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pointsByPlayer, setPointsByPlayer] = useState<
    Record<PlayerLabel, number>
  >(() => {
    // For test game, start at 10k
    const isTest = id?.toUpperCase() === "TEST001";
    return {
      "Left Player": isTest ? 10000 : 0,
      "Right Player": isTest ? 10000 : 0,
      "Center Player": isTest ? 10000 : 0,
    };
  });
  const [activeLabels, setActiveLabels] = useState<PlayerLabel[]>([
    "Left Player",
    "Right Player",
  ]);
  const [overlay, setOverlay] = useState<"score" | "miss" | null>(null);
  const predictionsRef = useRef<
    Record<
      PlayerLabel,
      {
        ts: number;
        period?: number | string | null;
        clock?: string;
        shotType?: ShotType;
      }[]
    >
  >({
    "Left Player": [],
    "Right Player": [],
    "Center Player": [],
  });

  const [showShotIncoming, setShowShotIncoming] = useState(false);
  const [shotCountdown, setShotCountdown] = useState(3);
  const [showShotResult, setShowShotResult] = useState(false);
  const [currentShotData, setCurrentShotData] = useState<any>(null);
  const lastProcessedShotRef = useRef<string | null>(null);
  const [streamGameClock, setStreamGameClock] = useState("");
  const [streamClockInput, setStreamClockInput] = useState("");
  const [streamPeriodInput, setStreamPeriodInput] = useState<number>(1);
  const [syncedPeriod, setSyncedPeriod] = useState<number>(1);
  const [streamDelaySeconds, setStreamDelaySeconds] = useState<number>(0);
  const [streamDelay, setStreamDelay] = useState<number>(3);
  const [showMoneyRain, setShowMoneyRain] = useState(false);
  const [manualDelayAdjustment, setManualDelayAdjustment] = useState<number>(0);
  const [syncAnchor, setSyncAnchor] = useState<{
    nbaTimestamp: number;
    realWorldTime: number;
  } | null>(null);
  const [predictionWindowActive, setPredictionWindowActive] = useState(false);
  const [showPointsEarned, setShowPointsEarned] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [pointsEarnedLabel, setPointsEarnedLabel] = useState<string | null>(
    null
  );
  const [playerPointsDisplay, setPlayerPointsDisplay] = useState<
    Record<
      PlayerLabel,
      {
        show: boolean;
        points: number;
        basePoints: number;
        shotMultiplier: number;
        streakMultiplier: number;
      }
    >
  >({
    "Left Player": {
      show: false,
      points: 0,
      basePoints: 0,
      shotMultiplier: 1,
      streakMultiplier: 1,
    },
    "Right Player": {
      show: false,
      points: 0,
      basePoints: 0,
      shotMultiplier: 1,
      streakMultiplier: 1,
    },
    "Center Player": {
      show: false,
      points: 0,
      basePoints: 0,
      shotMultiplier: 1,
      streakMultiplier: 1,
    },
  });
  const [playerStreaks, setPlayerStreaks] = useState<
    Record<PlayerLabel, number>
  >({
    "Left Player": 0,
    "Right Player": 0,
    "Center Player": 0,
  });
  const [lanePoints, setLanePoints] = useState<
    Record<PlayerLabel, number | null>
  >({
    "Left Player": null,
    "Right Player": null,
    "Center Player": null,
  });
  const [liveState, setLiveState] = useState<ParsedGameState | null>(null);
  const [delayedState, setDelayedState] = useState<ParsedGameState | null>(
    null
  );
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [playersBySlot, setPlayersBySlot] = useState<
    Record<
      number,
      { id: string; name?: string | null; image?: string | null } | null
    >
  >({ 0: null, 1: null, 2: null });
  const [webcamReady, setWebcamReady] = useState(false);
  const assignedLabels = useMemo<PlayerLabel[]>(() => {
    const labels: PlayerLabel[] = [];
    if (playersBySlot[0]) labels.push("Left Player");
    if (playersBySlot[1]) labels.push("Center Player");
    if (playersBySlot[2]) labels.push("Right Player");
    return labels.length > 0 ? labels : activeLabels;
  }, [playersBySlot, activeLabels]);
  const stateQueueRef = useRef<{ state: ParsedGameState; timestamp: number }[]>(
    []
  );
  const [liveUpdateCount, setLiveUpdateCount] = useState(0);
  const [delayedUpdateCount, setDelayedUpdateCount] = useState(0);
  const [currentTime, setCurrentTime] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [testGameTimestamp, setTestGameTimestamp] = useState(0);
  const isTestGame = id?.toUpperCase() === "TEST001";

  // Helper: Convert game clock (MM:SS or M:SS or PT format) to seconds
  const clockToSeconds = (clock: string): number => {
    if (!clock) return 0;

    // Handle PT format (e.g., "PT05M23.00S")
    if (clock.startsWith("PT")) {
      const minutesMatch = clock.match(/(\d+)M/);
      const secondsMatch = clock.match(/(\d+(?:\.\d+)?)S/);
      const minutes = parseInt(minutesMatch?.[1] ?? "0", 10);
      const seconds = Math.floor(parseFloat(secondsMatch?.[1] ?? "0"));
      return minutes * 60 + Math.floor(seconds);
    }

    // Handle MM:SS format
    const parts = clock.split(":");
    if (parts.length === 2) {
      const mm = parseInt(parts[0] ?? "0", 10);
      const ss = parseInt(parts[1] ?? "0", 10);
      return mm * 60 + ss;
    }
    return 0;
  };

  // Helper: Format clock for display (converts PT format to MM:SS)
  const formatClock = (clock: string): string => {
    if (!clock) return "--:--";

    // If already in MM:SS format, return as is
    if (!clock.startsWith("PT")) return clock;

    // Parse PT format
    const minutesMatch = clock.match(/(\d+)M/);
    const secondsMatch = clock.match(/(\d+(?:\.\d+)?)S/);
    const minutes = minutesMatch ? parseInt(minutesMatch[1] ?? "0", 10) : 0;
    const seconds = secondsMatch
      ? Math.floor(parseFloat(secondsMatch[1] ?? "0"))
      : 0;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Helper: Find state by game clock and period (for initial sync)
  // Returns the state and calculates delay in seconds
  const findStateByGameClock = (
    targetClock: string,
    targetPeriod?: number
  ): { state: ParsedGameState; delaySeconds: number } | null => {
    if (!targetClock || stateQueueRef.current.length === 0) return null;

    // Use provided period or fall back to current period
    const latestState =
      stateQueueRef.current[stateQueueRef.current.length - 1]!.state;
    const searchPeriod = targetPeriod ?? latestState.period;

    const targetSeconds = clockToSeconds(targetClock);
    let closestMatch: {
      state: ParsedGameState;
      timestamp: number;
      diff: number;
    } | null = null;

    // Only look at states from the specified period
    // Find the LAST (most recent) state that matches the clock time
    for (const item of stateQueueRef.current) {
      // Normalize period comparison (handle both number and string)
      const itemPeriod =
        typeof item.state.period === "number"
          ? item.state.period
          : parseInt(String(item.state.period || "1"), 10);

      if (itemPeriod !== searchPeriod) continue;

      const stateClock = item.state.clock || "";
      const stateSeconds = clockToSeconds(stateClock);
      const diff = Math.abs(stateSeconds - targetSeconds);

      if (!closestMatch || diff < closestMatch.diff) {
        closestMatch = {
          state: item.state,
          timestamp: item.timestamp,
          diff,
        };
      }
    }

    if (!closestMatch) return null;

    // Calculate delay: how many seconds behind live are we?
    const latestTimestamp =
      stateQueueRef.current[stateQueueRef.current.length - 1]!.timestamp;
    const delaySeconds = (latestTimestamp - closestMatch.timestamp) / 1000;

    return { state: closestMatch.state, delaySeconds };
  };

  // Helper: Find state by timestamp (for tracking with delay)
  const findStateByTimestamp = (
    targetTimestamp: number
  ): ParsedGameState | null => {
    if (stateQueueRef.current.length === 0) return null;

    // Find the state that is closest to but NOT AFTER the target timestamp
    // This ensures we don't jump ahead to future states
    let bestState: {
      state: ParsedGameState;
      timestamp: number;
      index: number;
    } | null = null;

    for (let i = 0; i < stateQueueRef.current.length; i++) {
      const item = stateQueueRef.current[i];
      if (!item) continue;

      // Only consider states at or before the target
      if (item.timestamp <= targetTimestamp) {
        if (!bestState || item.timestamp > bestState.timestamp) {
          bestState = {
            state: item.state,
            timestamp: item.timestamp,
            index: i,
          };
        }
      }
    }

    // Debug: Check if we're stuck
    if (bestState) {
      const nextState = stateQueueRef.current[bestState.index + 1];
      if (nextState && targetTimestamp > bestState.timestamp) {
        const gap = (nextState.timestamp - bestState.timestamp) / 1000;
        if (gap > 30) {
          console.warn(
            `[TIMESTAMP GAP] Stuck at Q${bestState.state.period} ${formatClock(
              bestState.state.clock || ""
            )} | Next state is ${gap.toFixed(1)}s away | Target: ${new Date(
              targetTimestamp
            ).toLocaleTimeString()}, Next: ${new Date(
              nextState.timestamp
            ).toLocaleTimeString()}`
          );
        }
      }
    }

    // If no state found before target, return the first state
    return bestState ? bestState.state : stateQueueRef.current[0]!.state;
  };

  // Debug logging
  useEffect(() => {
    console.log("[DEBUG] Game ID:", id, "isTestGame:", isTestGame);
  }, [id, isTestGame]);

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
    // Initialize audio
    if (typeof window !== "undefined") {
      winAudioRef.current = new Audio("/win_file.mp3");
      winAudioRef.current.volume = 1.0; // Set volume to 100%
    }
  }, []);

  // Fetch or create game session for join code and players
  useEffect(() => {
    let timer: any;
    let cancelled = false;
    async function fetchSession() {
      try {
        const res = await fetch(`/api/game-session/${id}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          console.log("[JOIN CODE] Fetched session data:", data);
          setGameSessionId(data.id ?? null);
          setJoinCode(data.joinCode ?? null);
          console.log("[JOIN CODE] Set join code to:", data.joinCode);
          const next: Record<
            number,
            { id: string; name?: string; image?: string } | null
          > = { 0: null, 1: null, 2: null };
          (data.players ?? []).forEach((p: any) => {
            next[p.slot] = {
              id: p.user.id,
              name: p.user.name,
              image: p.user.image,
            };
          });
          setPlayersBySlot(next);
        } else {
          console.error("[JOIN CODE] API error:", data);
        }
      } catch (err) {
        console.error("[JOIN CODE] Fetch error:", err);
      }
    }
    fetchSession();
    timer = setInterval(fetchSession, 3000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [id]);

  // Update current time
  useEffect(() => {
    if (!isMounted) return;
    const updateTime = () => setCurrentTime(new Date().toLocaleTimeString());
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [isMounted]);

  useEffect(() => {
    let active = true;
    const isTest002 = id?.toUpperCase() === "TEST002";

    async function loadAll() {
      // For TEST002, load all historical states at once
      try {
        console.log("[TEST002] Loading all historical states...");
        const res = await fetch(`/api/games/${id}?loadAll=true`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!active) return;

        // Clear existing queue to avoid duplicates
        stateQueueRef.current = [];

        if (data?.states && Array.isArray(data.states)) {
          const now = Date.now();
          const firstTimeActual = data.states[0]?.timeActual;
          const lastTimeActual =
            data.states[data.states.length - 1]?.timeActual;

          console.log(
            `[TEST002] Raw data - first timeActual: ${firstTimeActual}`
          );
          console.log(
            `[TEST002] Raw data - last timeActual: ${lastTimeActual}`
          );
          console.log(
            `[TEST002] Current time (now): ${new Date(
              now
            ).toLocaleTimeString()}`
          );

          if (firstTimeActual && lastTimeActual) {
            const firstTime = new Date(firstTimeActual).getTime();
            const lastTime = new Date(lastTimeActual).getTime();
            const gameDuration = lastTime - firstTime;

            console.log(
              `[TEST002] firstTime parsed: ${new Date(
                firstTime
              ).toLocaleTimeString()}`
            );
            console.log(
              `[TEST002] lastTime parsed: ${new Date(
                lastTime
              ).toLocaleTimeString()}`
            );

            // Map NBA timestamps to a timeline starting from NOW
            // Each state's timestamp = now + (time since game start)
            data.states.forEach((item: any, index: number) => {
              const actionTime = new Date(item.timeActual).getTime();
              const offsetFromStart = actionTime - firstTime;
              const timestamp = now + offsetFromStart;

              // Debug first and last
              if (index === 0 || index === data.states.length - 1) {
                console.log(
                  `[TEST002] State ${index}: actionTime=${new Date(
                    actionTime
                  ).toLocaleTimeString()}, offset=${(
                    offsetFromStart / 1000
                  ).toFixed(1)}s, mapped=${new Date(
                    timestamp
                  ).toLocaleTimeString()}`
                );
              }

              stateQueueRef.current.push({ state: item.state, timestamp });
            });

            // Set initial sync anchor to start playing from the beginning
            setSyncAnchor({
              nbaTimestamp: now, // First state starts "now"
              realWorldTime: now,
            });

            console.log(
              `[TEST002] Loaded ${data.states.length} states using REAL NBA timestamps`
            );
            console.log(
              `[TEST002] Game duration: ${(gameDuration / 1000 / 60).toFixed(
                1
              )} minutes`
            );
            console.log(
              `[TEST002] First state at: ${new Date(now).toLocaleTimeString()}`
            );
            console.log(
              `[TEST002] Last state at: ${new Date(
                now + gameDuration
              ).toLocaleTimeString()}`
            );
            if (stateQueueRef.current.length > 0) {
              console.log(
                `[TEST002] Queue first timestamp: ${new Date(
                  stateQueueRef.current[0]!.timestamp
                ).toLocaleTimeString()}`
              );
              const lastItem =
                stateQueueRef.current[stateQueueRef.current.length - 1]!;
              console.log(
                `[TEST002] Queue last timestamp: ${new Date(
                  lastItem.timestamp
                ).toLocaleTimeString()}`
              );
            }
            console.log(`[TEST002] Auto-playing from start...`);
          } else {
            console.warn(
              "[TEST002] No timeActual found, using fallback spacing"
            );
            const baseTime = now;
            const timePerState = 900000 / data.states.length;
            data.states.forEach((item: any, index: number) => {
              const timestamp = baseTime + index * timePerState;
              stateQueueRef.current.push({ state: item.state, timestamp });
            });

            setSyncAnchor({
              nbaTimestamp: now,
              realWorldTime: now,
            });
          }

          // Set the first state as the starting point
          const firstState = data.states[0];
          setLiveState(firstState.state || firstState);
          setLiveUpdateCount(1);
        }
        setError(null);
      } catch (err) {
        console.error("[TEST002] Error loading states:", err);
        if (active) setError("Failed to load game data");
      }
    }

    async function load() {
      try {
        const url = isTestGame
          ? `/api/games/${id}?timestamp=${testGameTimestamp}`
          : `/api/games/${id}`;

        if (isTestGame) {
          console.log(
            `[TEST GAME] Fetching with timestamp: ${testGameTimestamp}, URL: ${url}`
          );
        }

        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        if (data?.state) {
          const now = Date.now();
          setLiveState(data.state);
          setLiveUpdateCount((prev) => prev + 1);
          detectNewShot(data.state);

          // Add to queue with timestamp
          stateQueueRef.current.push({ state: data.state, timestamp: now });

          // Keep last 500 states (covers ~12.5 minutes of game time at 1.5s polling)
          // This handles even extreme stream delays of 10+ minutes
          if (stateQueueRef.current.length > 500) {
            stateQueueRef.current = stateQueueRef.current.slice(-500);
          }

          console.log(
            `[LIVE] Update #${liveUpdateCount + 1} received at ${new Date(
              now
            ).toLocaleTimeString()}.${now % 1000}`
          );
        }
        setError(null);
      } catch {
        if (active) setError("Failed to fetch live update");
      }
    }

    // For TEST002, load all states once
    if (isTest002) {
      loadAll();
    } else {
      // For other games, poll normally
      load();
      const timer = isTestGame ? null : setInterval(load, 1500);
      return () => {
        active = false;
        if (timer) clearInterval(timer);
      };
    }

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, testGameTimestamp, isTestGame]);

  // Process delayed state based on sync anchor
  useEffect(() => {
    const interval = setInterval(() => {
      if (!syncAnchor) {
        // If no sync, use most recent state
        if (stateQueueRef.current.length > 0) {
          const q = stateQueueRef.current;
          const latestItem = q[q.length - 1];
          if (!latestItem) return;
          const latestState = latestItem.state;
          if (
            !delayedState ||
            JSON.stringify(latestState) !== JSON.stringify(delayedState)
          ) {
            setDelayedState(latestState);
            setState(latestState);
            setDelayedUpdateCount((prev) => prev + 1);
          }
        }
        return;
      }

      // Calculate how much real-world time has passed since sync
      const now = Date.now();
      const elapsedSinceSync = now - syncAnchor.realWorldTime;

      // Calculate target NBA timestamp: anchor + elapsed time + manual adjustment
      // Manual adjustment SPEEDS UP progression (positive = catch up to stream faster)
      // This accounts for your stream being ahead of where you synced
      const targetNbaTimestamp =
        syncAnchor.nbaTimestamp +
        elapsedSinceSync +
        manualDelayAdjustment * 1000;

      // For live games: don't go beyond the latest state we have
      const latestAvailableTimestamp =
        stateQueueRef.current.length > 0
          ? stateQueueRef.current[stateQueueRef.current.length - 1]
              ?.timestamp ?? now
          : now;
      const clampedTarget = Math.min(
        targetNbaTimestamp,
        latestAvailableTimestamp
      );

      // Find state closest to target NBA timestamp
      const matchedState = findStateByTimestamp(clampedTarget);

      if (!matchedState) {
        console.warn(
          `[PROGRESS] No state found for target ${new Date(
            clampedTarget
          ).toLocaleTimeString()} | Queue size: ${stateQueueRef.current.length}`
        );
        return;
      }

      if (
        matchedState &&
        (!delayedState ||
          JSON.stringify(matchedState) !== JSON.stringify(delayedState))
      ) {
        setDelayedState(matchedState);
        setState(matchedState);
        setDelayedUpdateCount((prev) => prev + 1);

        // Detect new shots for prediction system
        detectNewShot(matchedState);

        const isClamped = clampedTarget !== targetNbaTimestamp;
        console.log(
          `[PROGRESS] Q${matchedState.period} ${formatClock(
            matchedState.clock || ""
          )} | Elapsed: ${(elapsedSinceSync / 1000).toFixed(
            1
          )}s | Anchor: ${new Date(
            syncAnchor.nbaTimestamp
          ).toLocaleTimeString()} | Target: ${new Date(
            clampedTarget
          ).toLocaleTimeString()}${isClamped ? " (clamped)" : ""}`
        );
      }
    }, 100);

    return () => clearInterval(interval);
  }, [syncAnchor, delayedState, delayedUpdateCount, manualDelayAdjustment]);

  function registerPrediction(
    label: PlayerLabel | undefined,
    pred: {
      ts: number;
      period?: number | string | null;
      clock?: string;
      shotType?: ShotType;
    }
  ) {
    if (!predictionWindowActive || !label) return;
    const arr = predictionsRef.current[label] ?? [];
    arr.push(pred);
    if (arr.length > 10) arr.shift();
    predictionsRef.current[label] = arr;
  }

  function resetPredictions() {
    predictionsRef.current = {
      "Left Player": [],
      "Right Player": [],
      "Center Player": [],
    };
  }

  function detectNewShot(gameState: ParsedGameState) {
    const lastShot = gameState?.lastShot;
    if (!lastShot || !lastShot.playerName) return;

    const shotId = `${lastShot.playerName}-${lastShot.shotResult}-${gameState.clock}`;
    if (lastProcessedShotRef.current === shotId) return;

    lastProcessedShotRef.current = shotId;

    // For synced games (TEST002 or live with sync), show popup immediately with 3s countdown
    // The shot is already appearing at the right time due to the sync system
    const popupDelay = 0;

    console.log(
      `Shot detected! Clock: ${gameState.clock}, Showing popup immediately (synced playback)`
    );

    setTimeout(() => {
      console.log("Showing shot incoming popup NOW");
      // 3 second countdown for user to predict
      setShotCountdown(3);
      setShowShotIncoming(true);
      setPredictionWindowActive(true);
      resetPredictions();

      // After 3 seconds, show result (should align with when shot appears on delayed stream)
      setTimeout(() => {
        console.log("Showing shot result NOW");
        setShowShotIncoming(false);
        setPredictionWindowActive(false);

        // Calculate distance
        const is3pt = lastShot.shotType?.toLowerCase().includes("3");
        const distance = is3pt
          ? `${22 + Math.floor(Math.random() * 8)} ft`
          : `${8 + Math.floor(Math.random() * 14)} ft`;

        // Prepare shot data with location
        const shotData = {
          playerName: lastShot.playerName,
          teamTricode: lastShot.teamTricode,
          shotResult: lastShot.shotResult || "Unknown",
          shotType: lastShot.shotType,
          points: lastShot.points,
          shotLocation: {
            x: is3pt ? 30 + Math.random() * 40 : 40 + Math.random() * 20,
            y: is3pt ? 20 + Math.random() * 40 : 50 + Math.random() * 30,
          },
          distance,
        };
        setCurrentShotData(shotData);
        setShowShotResult(true);

        // Check predictions for each player during the prediction window
        const isMade = lastShot.shotResult?.toLowerCase().includes("made");
        setOverlay(isMade ? "score" : "miss");
        const labelsWithPrediction = PLAYER_LABELS.filter(
          (label) => (predictionsRef.current[label]?.length ?? 0) > 0
        );

        const baseDelta = isMade ? POINT_DELTA : -POINT_DELTA;

        // Map NBA shot type to our gesture types
        const actualShotType = lastShot.shotType?.toLowerCase();
        let actualGestureType: ShotType = "normal";
        if (actualShotType?.includes("dunk")) {
          actualGestureType = "dunk";
        } else if (actualShotType?.includes("layup")) {
          actualGestureType = "layup";
        }

        if (labelsWithPrediction.length > 0) {
          // Calculate deltas for each player once with streaks
          const playerDeltas: Record<PlayerLabel, number> = {} as Record<
            PlayerLabel,
            number
          >;
          const playerDisplayInfo: Record<
            PlayerLabel,
            {
              basePoints: number;
              shotMultiplier: number;
              streakMultiplier: number;
              finalPoints: number;
            }
          > = {} as any;

          labelsWithPrediction.forEach((label) => {
            const playerPredictions = predictionsRef.current[label] ?? [];
            const lastPrediction =
              playerPredictions[playerPredictions.length - 1];
            const predictedShotType = lastPrediction?.shotType;

            // Apply 2x multiplier if shot type matches
            const shotMultiplier =
              predictedShotType === actualGestureType ? 2 : 1;

            // Update streak: increment if made, reset if missed
            const currentStreak = playerStreaks[label] ?? 0;
            const newStreak = isMade ? currentStreak + 1 : 0;

            // Streak multiplier: 1.2x for each correct prediction AFTER the first (applies after shot multiplier)
            // First correct = 1x, second = 1.2x, third = 1.4x, etc.
            const streakMultiplier = 1 + Math.max(0, newStreak - 1) * 0.2;

            // Calculate final delta: base * shotMultiplier * streakMultiplier
            const delta = Math.round(
              baseDelta * shotMultiplier * streakMultiplier
            );

            playerDeltas[label] = delta;
            playerDisplayInfo[label] = {
              basePoints: baseDelta,
              shotMultiplier,
              streakMultiplier,
              finalPoints: delta,
            };

            console.log(
              `[POINTS] ${label}: predicted=${predictedShotType}, actual=${actualGestureType}, shot=${shotMultiplier}x, streak=${newStreak} (${streakMultiplier.toFixed(
                1
              )}x), delta=${delta}`
            );
          });

          // Update streaks
          setPlayerStreaks((prev) => {
            const next = { ...prev };
            labelsWithPrediction.forEach((label) => {
              const currentStreak = prev[label] ?? 0;
              next[label] = isMade ? currentStreak + 1 : 0;
            });
            return next;
          });

          // Update points
          setPointsByPlayer((prev) => {
            const next = { ...prev };
            labelsWithPrediction.forEach((label) => {
              next[label] = (next[label] ?? 0) + playerDeltas[label];
            });
            return next;
          });

          // Play win sound and show money rain if player gained points (made the shot)
          if (isMade && winAudioRef.current) {
            winAudioRef.current.currentTime = 0; // Reset to start
            winAudioRef.current.play().catch((err) => {
              console.log("Audio play failed:", err);
            });

            // Trigger money rain effect
            setShowMoneyRain(true);
            setTimeout(() => setShowMoneyRain(false), 3000);
          }

          // Show individual overlays for each player with their specific delta
          setPlayerPointsDisplay((prev) => {
            const next = { ...prev };
            labelsWithPrediction.forEach((label) => {
              const info = playerDisplayInfo[label];
              next[label] = {
                show: true,
                points: info.finalPoints,
                basePoints: info.basePoints,
                shotMultiplier: info.shotMultiplier,
                streakMultiplier: info.streakMultiplier,
              };
            });
            return next;
          });

          // Hide overlays after 2.5 seconds
          setTimeout(() => {
            setPlayerPointsDisplay({
              "Left Player": {
                show: false,
                points: 0,
                basePoints: 0,
                shotMultiplier: 1,
                streakMultiplier: 1,
              },
              "Right Player": {
                show: false,
                points: 0,
                basePoints: 0,
                shotMultiplier: 1,
                streakMultiplier: 1,
              },
              "Center Player": {
                show: false,
                points: 0,
                basePoints: 0,
                shotMultiplier: 1,
                streakMultiplier: 1,
              },
            });
          }, 2500);

          // Keep old single overlay for backwards compatibility (can remove later)
          setPointsEarned(baseDelta);
          setPointsEarnedLabel(
            labelsWithPrediction.length === 1
              ? labelsWithPrediction[0] ?? "Player"
              : "Multiple Players"
          );
          setShowPointsEarned(true);
          setTimeout(() => setShowPointsEarned(false), 3000);

          // Persist shots to DB
          try {
            const labelToSlot = (lb: PlayerLabel) =>
              lb === "Left Player" ? 0 : lb === "Center Player" ? 1 : 2;
            const shotsPayload = labelsWithPrediction
              .map((lb) => {
                const slot = labelToSlot(lb);
                const usr = playersBySlot[slot];
                if (!usr?.id) return null;
                const playerPredictions = predictionsRef.current[lb] ?? [];
                const lastPrediction =
                  playerPredictions[playerPredictions.length - 1];
                const predictedShotType = lastPrediction?.shotType ?? null;
                return {
                  playerUserId: usr.id,
                  gameId: id,
                  gameSessionId,
                  made: !!isMade,
                  points: lastShot.points ?? 0,
                  shotTypeActual: actualGestureType ?? null,
                  shotTypePredicted: predictedShotType ?? null,
                  matchedGesture:
                    predictedShotType && actualGestureType
                      ? predictedShotType === actualGestureType
                      : null,
                  period: String(state?.period ?? ""),
                  clock: state?.clock ?? null,
                };
              })
              .filter(Boolean);
            if ((shotsPayload as any[]).length > 0) {
              fetch("/api/shots", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ shots: shotsPayload }),
              }).catch(() => {});
            }
          } catch {}
        }
        // Show lane points for all active labels (predicted => delta with multiplier, else 0)
        const laneMap: Record<PlayerLabel, number | null> = {
          "Left Player": null,
          "Right Player": null,
          "Center Player": null,
        };

        // Calculate deltas for lane display
        const laneDeltas: Record<PlayerLabel, number> = {} as Record<
          PlayerLabel,
          number
        >;
        labelsWithPrediction.forEach((label) => {
          const playerPredictions = predictionsRef.current[label] ?? [];
          const lastPrediction =
            playerPredictions[playerPredictions.length - 1];
          const predictedShotType = lastPrediction?.shotType;
          const multiplier = predictedShotType === actualGestureType ? 2 : 1;
          laneDeltas[label] = baseDelta * multiplier;
        });

        activeLabels.forEach((label) => {
          if (labelsWithPrediction.includes(label)) {
            laneMap[label] = laneDeltas[label];
          } else {
            laneMap[label] = 0;
          }
        });
        setLanePoints(laneMap);
        setTimeout(() => {
          setLanePoints({
            "Left Player": null,
            "Right Player": null,
            "Center Player": null,
          });
        }, 3000);

        resetPredictions();

        // Hide result after 4 seconds
        setTimeout(() => {
          setShowShotResult(false);
          setCurrentShotData(null);
          setOverlay(null);
        }, 4000);
      }, 3000);
    }, popupDelay);
  }

  function openDebugWindow() {
    // Close existing window if open
    if (debugWindowRef.current && !debugWindowRef.current.closed) {
      debugWindowRef.current.close();
    }

    const debugWindow = window.open("", "NBA_Debug", "width=800,height=600");
    if (!debugWindow) return;

    debugWindowRef.current = debugWindow;

    debugWindow.document.write(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Live Debug - No Delay</title>
				<style>
					body { 
						margin: 0; 
						padding: 20px; 
						font-family: system-ui; 
						background: #111; 
						color: #fff; 
					}
					.container { max-width: 800px; margin: 0 auto; }
					.card { background: #222; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
					.label { opacity: 0.7; font-size: 12px; margin-bottom: 4px; }
					.value { font-size: 18px; font-weight: bold; }
					.timestamp { color: #10b981; font-family: monospace; }
					.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
				</style>
			</head>
			<body>
				<div class="container">
					<div style="position: sticky; top: 0; background: #111; padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); z-index: 100;">
						<h1 style="color: #10b981; display: flex; align-items: center; gap: 8px; margin: 0 0 8px 0;">
							<span style="width: 12px; height: 12px; background: #10b981; border-radius: 50%; animation: pulse 1s infinite;"></span>
							LIVE DEBUG (NO DELAY)
						</h1>
						<div id="updateCounter" style="font-family: monospace; font-size: 14px; opacity: 0.7;">
							Update #0
						</div>
					</div>
					<style>
						@keyframes pulse {
							0%, 100% { opacity: 1; }
							50% { opacity: 0.5; }
						}
					</style>
					<div id="content"></div>
				</div>
			</body>
			</html>
		`);

    // Window will be updated by the useEffect below
    debugWindow.onbeforeunload = () => {
      debugWindowRef.current = null;
    };
  }

  // Update debug window when liveState changes
  useEffect(() => {
    if (!liveState) return;

    const updateDebugContent = () => {
      try {
        if (!debugWindowRef.current || debugWindowRef.current.closed) {
          return;
        }

        // Check if we can access the document (same-origin)
        const doc = debugWindowRef.current.document;
        if (!doc) return;

        const content = doc.getElementById("content");
        if (!content) return;

        const now = new Date();
        const recentActions = liveState.recentActions || [];

        // Update the counter in the header
        const counterEl = doc.getElementById("updateCounter");
        if (counterEl) {
          counterEl.textContent = `Update #${liveUpdateCount}`;
        }

        content.innerHTML = `
					<div class="card">
						<div class="label">Current Time (Live)</div>
						<div class="value timestamp">${now.toLocaleTimeString()}.${now
          .getMilliseconds()
          .toString()
          .padStart(3, "0")}</div>
					</div>
					<div class="card">
						<div class="label">Period ${liveState.period ?? "-"} • ${formatClock(
          liveState.clock ?? ""
        )}</div>
						<div class="grid">
							<div>
								<div class="label">${liveState.awayTeam ?? "Away"}</div>
								<div class="value">${liveState.score?.away ?? 0}</div>
							</div>
							<div>
								<div class="label">${liveState.homeTeam ?? "Home"}</div>
								<div class="value">${liveState.score?.home ?? 0}</div>
							</div>
						</div>
					</div>
					${
            liveState.lastShot
              ? `
						<div class="card" style="border-left: 4px solid ${
              liveState.lastShot.shotResult?.toLowerCase().includes("made")
                ? "#10b981"
                : "#ef4444"
            }">
							<div class="label">Last Shot • ${now.toLocaleTimeString()}</div>
							<div class="value">${liveState.lastShot.playerName} (${
                  liveState.lastShot.teamTricode
                })</div>
							<div style="margin-top: 8px; color: ${
                liveState.lastShot.shotResult?.toLowerCase().includes("made")
                  ? "#10b981"
                  : "#ef4444"
              }; font-weight: bold;">
								${liveState.lastShot.shotResult} • ${liveState.lastShot.shotType || ""} • ${
                  liveState.lastShot.points || 0
                } pts
							</div>
							${
                liveState.lastShot.description
                  ? `<div style="margin-top: 4px; font-size: 12px; opacity: 0.7;">${liveState.lastShot.description}</div>`
                  : ""
              }
						</div>
					`
              : ""
          }
					${
            liveState.ballHandler
              ? `
						<div class="card">
							<div class="label">Ball Handler</div>
							<div class="value">${liveState.ballHandler.name} (${
                  liveState.ballHandler.teamTricode
                })</div>
							${
                liveState.ballHandler.liveStats
                  ? `
								<div style="margin-top: 8px; font-size: 14px;">
									PTS: ${liveState.ballHandler.liveStats.points ?? 0} • 
									FG: ${liveState.ballHandler.liveStats.fieldGoalsMade ?? 0}/${
                      liveState.ballHandler.liveStats.fieldGoalsAttempted ?? 0
                    } 
									(${
                    liveState.ballHandler.liveStats.fieldGoalsAttempted > 0
                      ? Math.round(
                          (liveState.ballHandler.liveStats.fieldGoalsMade /
                            liveState.ballHandler.liveStats
                              .fieldGoalsAttempted) *
                            100
                        )
                      : 0
                  }%)
								</div>
							`
                  : ""
              }
						</div>
					`
              : ""
          }
					${
            liveState.lastAction
              ? `
						<div class="card">
							<div class="label">Last Action • ${now.toLocaleTimeString()}</div>
							<div style="font-size: 14px; margin-top: 4px;">
								<span style="font-weight: bold;">${
                  liveState.lastAction.playerName || "Unknown"
                }</span>
								${
                  liveState.lastAction.teamTricode
                    ? `<span style="opacity: 0.7;"> (${liveState.lastAction.teamTricode})</span>`
                    : ""
                }
								${
                  liveState.lastAction.actionType
                    ? `<span style="margin-left: 8px; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 11px;">${liveState.lastAction.actionType}</span>`
                    : ""
                }
								${
                  liveState.lastAction.shotResult
                    ? `<span style="margin-left: 4px; font-weight: bold;">${liveState.lastAction.shotResult}</span>`
                    : ""
                }
							</div>
							${
                liveState.lastAction.description
                  ? `<div style="margin-top: 4px; font-size: 12px; opacity: 0.6;">${liveState.lastAction.description}</div>`
                  : ""
              }
						</div>
					`
              : ""
          }
					${
            recentActions.length > 0
              ? `
						<div class="card">
							<div class="label">Recent Actions (Live Feed)</div>
							<div style="max-height: 300px; overflow-y: auto; margin-top: 8px;">
								${recentActions
                  .slice(0, 8)
                  .map(
                    (act, i) => `
									<div style="padding: 8px; margin-bottom: 4px; background: rgba(255,255,255,0.05); border-radius: 4px; font-size: 12px; border-left: 2px solid ${
                    act.shotResult
                      ? act.shotResult.toLowerCase().includes("made")
                        ? "#10b981"
                        : "#ef4444"
                      : "#666"
                  }">
										<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
											<span style="font-weight: bold;">${act.playerName || "?"}</span>
											<span style="opacity: 0.5; font-family: monospace; font-size: 10px;">${now.toLocaleTimeString()}</span>
										</div>
										<div style="opacity: 0.8;">
											${
                        act.teamTricode
                          ? `<span style="opacity: 0.6;">${act.teamTricode}</span> • `
                          : ""
                      }
											${
                        act.actionType
                          ? `<span style="background: rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 3px;">${act.actionType}</span>`
                          : ""
                      }
											${
                        act.shotResult
                          ? `<span style="margin-left: 4px; font-weight: bold; color: ${
                              act.shotResult.toLowerCase().includes("made")
                                ? "#10b981"
                                : "#ef4444"
                            }">${act.shotResult}</span>`
                          : ""
                      }
										</div>
									</div>
								`
                  )
                  .join("")}
							</div>
						</div>
					`
              : ""
          }
				`;
      } catch (error: any) {
        // SecurityError or other cross-origin issues
        if (
          error.name === "SecurityError" ||
          error.message?.includes("cross-origin")
        ) {
          console.warn("Debug window cross-origin error, clearing reference");
          debugWindowRef.current = null;
        } else {
          console.error("Error updating debug window:", error);
        }
      }
    };

    updateDebugContent();
  }, [liveState, liveUpdateCount]);

  const homeScoreClasses =
    "text-3xl font-semibold transition-all duration-300 text-red-500";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050913] text-white">
      <div className="mlb-diamond-bg absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 opacity-65 mix-blend-screen">
        <div className="absolute -left-32 top-8 h-96 w-96 rotate-6 rounded-none bg-gradient-to-br from-emerald-500/25 via-emerald-400/15 to-transparent blur-[150px]" />
        <div className="absolute right-[-8%] bottom-0 h-96 w-96 -rotate-6 rounded-none bg-gradient-to-br from-purple-500/30 via-emerald-400/15 to-transparent blur-[160px]" />
      </div>
      <div className="mlb-highlight-sweep" />
      {showMoneyRain && (
        <div className="money-rain">
          {Array.from({ length: 30 }).map((_, i) => (
            <span
              key={i}
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              ★
            </span>
          ))}
        </div>
      )}
      <div className="relative w-full px-6 pt-16 pb-16 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <div className="space-y-6 border border-[#1f364d] bg-[#0b1426] p-6 shadow-[0_50px_120px_rgba(0,0,0,0.65)] backdrop-blur-md transition-transform duration-300">
            {/* Header: Inning, Situation, Odds */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm opacity-75">
                  Period {state?.period ?? "-"}
                </div>
                <div className="text-center">
                  <div className="text-xs opacity-60 mb-1">Clock</div>
                  <div className="text-2xl font-mono font-bold">
                    {formatClock(state?.clock ?? "")}
                  </div>
                </div>
                <div className="text-sm" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <div className="opacity-60 font-mono">
                    Dashboard: {isMounted ? currentTime : "--:--:--"}
                  </div>
                  <div className="text-purple-200 font-semibold">
                    Update #{delayedUpdateCount} (-{streamDelay}s delay)
                  </div>
                </div>
                <button
                  onClick={openDebugWindow}
                  className="rounded-full bg-gradient-to-r from-emerald-400/80 to-purple-500/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-950 transition hover:from-emerald-400 hover:to-purple-400"
                >
                  Open Live Debug
                </button>
                <div className="space-y-1 text-right">
                  <div className="text-emerald-300 font-mono">
                    Live: Update #{liveUpdateCount}
                  </div>
                  <div className="text-xs text-purple-300/90 text-flash">
                    {state?.lastShot?.shotResult || "Live"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-purple-200/80">
                    Dashboard Time
                  </div>
                  <div className="font-mono text-base text-slate-100">
                    {isMounted ? currentTime : "--:--:--"}
                  </div>
                  <div className="mt-2 text-[10px] text-emerald-300 mlb-odds-flicker">
                    Update #{delayedUpdateCount} (−{streamDelay}s delay)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Live queue: {stateQueueRef.current.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Join Code Display */}
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/80 mb-2">
                Join Code
              </div>
              {joinCode ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-mono font-bold text-emerald-300">
                      {joinCode}
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(joinCode);
                          // You could add a toast notification here
                        } catch (err) {
                          console.error("Failed to copy:", err);
                        }
                      }}
                      className="rounded bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-200 hover:bg-emerald-500/30 transition"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-emerald-200/60">
                    Share this code with players to join the game
                  </div>
                </>
              ) : (
                <div className="text-sm text-emerald-200/60">
                  Loading join code...
                </div>
              )}
            </div>

            {/* Live Play Tracker */}
            {isTestGame && (
              <div className="relative overflow-hidden border border-purple-500/30 bg-[#111d33] p-4 shadow-[0_28px_60px_rgba(0,0,0,0.55)]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-purple-300">
                    Live Play Tracker
                  </span>
                  <span className="text-xs font-bold text-emerald-300">
                    Pitch {testGameTimestamp + 1}/7
                  </span>
                </div>
                <div className="relative mt-6">
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="1"
                    value={testGameTimestamp}
                    onChange={(e) =>
                      setTestGameTimestamp(Number(e.target.value))
                    }
                    className="mlb-range w-full appearance-none"
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-[2px]">
                    {Array.from({ length: 7 }).map((_, index) => (
                      <svg
                        key={index}
                        aria-hidden="true"
                        className={`h-4 w-4 ${
                          index <= testGameTimestamp
                            ? "text-emerald-300"
                            : "text-purple-500/40"
                        }`}
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 2a9 9 0 1 0 9 9A9 9 0 0 0 12 2Zm0 2.5a6.5 6.5 0 0 1 6.46 6h-4.21a2.29 2.29 0 0 0-2.25-1.88 2.31 2.31 0 0 0-2.26 1.88H5.54A6.5 6.5 0 0 1 12 4.5Zm0 13a6.47 6.47 0 0 1-6.42-5.5h4.21a2.3 2.3 0 0 0 2.21 1.87 2.3 2.3 0 0 0 2.21-1.87h4.21A6.47 6.47 0 0 1 12 17.5Z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-300/90">
                  Scrub through play-by-play to watch pitch detection and live
                  odds swings.
                </div>
              </div>
            )}

            {/* Stream Delay Slider */}
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs opacity-70">
                  Stream Delay (seconds)
                </span>
                <span className="text-sm font-bold">{streamDelay}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={streamDelay}
                onChange={(e) => setStreamDelay(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="text-xs opacity-60 mt-1">
                Popup appears {Math.max(0, streamDelay - 3)}s before shot on
                your stream
              </div>
            </div>

            {/* Stream Clock Sync */}
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="mb-3">
                <div className="text-xs opacity-70 mb-2">
                  Sync to Stream Clock
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="MM:SS"
                    value={streamClockInput}
                    onChange={(e) => setStreamClockInput(e.target.value)}
                    className="flex-1 rounded bg-white/10 px-2 py-1 text-sm text-white placeholder:text-white/40 border border-white/20 focus:border-emerald-400 focus:outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    max="4"
                    placeholder="Period"
                    value={streamPeriodInput}
                    onChange={(e) =>
                      setStreamPeriodInput(Number(e.target.value))
                    }
                    className="w-20 rounded bg-white/10 px-2 py-1 text-sm text-white placeholder:text-white/40 border border-white/20 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  if (!streamClockInput) return;
                  const matched = findStateByGameClock(
                    streamClockInput,
                    streamPeriodInput
                  );
                  if (matched) {
                    // Find the timestamp for this state in the queue
                    const stateItem = stateQueueRef.current.find(
                      (item) =>
                        item.state.clock === matched.state.clock &&
                        item.state.period === matched.state.period
                    );
                    const nbaTimestamp = stateItem?.timestamp ?? Date.now();
                    setSyncAnchor({
                      nbaTimestamp,
                      realWorldTime: Date.now(),
                    });
                    setSyncedPeriod(streamPeriodInput);
                    setStreamGameClock(streamClockInput);
                    console.log(
                      `[SYNC] Synced to Period ${streamPeriodInput} • ${streamClockInput}`
                    );
                  } else {
                    console.warn(
                      `[SYNC] Could not find state for Period ${streamPeriodInput} • ${streamClockInput}`
                    );
                  }
                }}
                className="w-full rounded bg-gradient-to-r from-emerald-500/80 to-purple-500/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:from-emerald-400 hover:to-purple-400"
              >
                Sync
              </button>
              {syncAnchor && (
                <div className="mt-2 text-xs opacity-60">
                  Synced: Period {syncedPeriod} • {streamGameClock}
                </div>
              )}
            </div>

            {/* Live Score */}
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 p-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-emerald-200/80">
                  {state?.awayTeam ?? "Away"}
                </div>
                <div className="text-3xl font-bold">
                  {state?.score?.away ?? 0}
                </div>
              </div>
              <div className="text-xs uppercase tracking-[0.4em] text-purple-200">
                LIVE
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-emerald-200/80">
                  {state?.homeTeam ?? "Home"}
                </div>
                <div className="text-3xl font-bold">
                  {state?.score?.home ?? 0}
                </div>
              </div>
            </div>

            {/* Last Shot Taken */}
            {state?.lastShot && state.lastShot.playerName && (
              <div className="rounded-lg border border-white/10 bg-gradient-to-r from-emerald-500/15 to-purple-500/20 p-3">
                <div className="text-xs opacity-70 mb-1">Last Shot</div>
                <div className="text-lg font-semibold">
                  {state.lastShot.playerName}
                  {state.lastShot.teamTricode && (
                    <span className="ml-2 text-sm opacity-75">
                      ({state.lastShot.teamTricode})
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Last Play Impact */}
            {state?.lastShot && state.lastShot.playerName && (
              <div className="popup-flash border border-emerald-400/30 bg-[#0f192b] p-4 shadow-[0_28px_60px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                      Last Play Impact
                    </div>
                    <div
                      className="mt-1 text-xl font-semibold text-white text-flash"
                      key={state.lastShot.playerName}
                    >
                      {state.lastShot.playerName} (
                      {state.lastShot.teamTricode ?? "NYY"})
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-slate-300">
                      <span className="inline-flex items-center gap-2 rounded border border-white/10 px-2.5 py-1">
                        <svg
                          aria-hidden="true"
                          className="h-4 w-4 text-emerald-200"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.4}
                        >
                          <path
                            d="M4 18h16M4 6h16M7 6l5 6-5 6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {state.lastShot.shotType ?? "Deep Fly to Right"}
                      </span>
                      <span
                        className={`text-sm font-bold text-flash ${
                          state.lastShot.shotResult
                            ?.toLowerCase()
                            .includes("made")
                            ? "text-emerald-300"
                            : "text-purple-200"
                        }`}
                        key={state.lastShot.shotResult}
                      >
                        {state.lastShot.shotResult
                          ?.toLowerCase()
                          .includes("made")
                          ? "Scoring Play"
                          : "Out Recorded"}
                      </span>
                    </div>
                  </div>
                </div>
                {state.lastShot.description && (
                  <div className="mt-2 border border-white/10 bg-[#101a2d] px-3 py-2 text-xs text-slate-300/90">
                    Live note: {state.lastShot.description}
                  </div>
                )}
              </div>
            )}

            {/* Featured Batter */}
            <div className="rounded-xl border border-slate-700/50 bg-[#1a1d29] p-4 shadow-lg border-l-2 border-l-green-500">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {state?.ballHandler?.name && (
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border-2 border-blue-500/50 bg-[#0f1419]">
                      <img
                        src={`https://nba-headshot-api.vercel.app/api/player/${encodeURIComponent(
                          state.ballHandler.name
                        )}`}
                        alt={state.ballHandler.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const parent = e.currentTarget.parentElement;
                          if (parent && state?.ballHandler?.name) {
                            e.currentTarget.style.display = "none";
                            const initials = state.ballHandler.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2);
                            const fallback = document.createElement("div");
                            fallback.className =
                              "absolute inset-0 flex items-center justify-center text-2xl font-black text-emerald-300";
                            fallback.textContent = initials;
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Featured Player
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-lg font-semibold text-white">
                      <span
                        className="text-flash"
                        key={state?.ballHandler?.name ?? "unknown"}
                      >
                        {state?.ballHandler?.name ?? "Unknown"}
                      </span>
                      <span className="rounded-md bg-blue-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-400 border border-blue-500/30">
                        {state?.ballHandler?.teamTricode ?? "LAD"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {state?.ballHandler?.liveStats ? (
                <div className="mt-4 grid grid-cols-5 gap-3 text-center text-xs uppercase tracking-[0.25em] text-slate-200">
                  {[
                    {
                      label: "PTS",
                      value: state.ballHandler.liveStats.points ?? 0,
                      color: "text-sky-300",
                      borderColor: "border-sky-400/40",
                    },
                    {
                      label: "FG",
                      value: `${
                        state.ballHandler.liveStats.fieldGoalsMade ?? 0
                      }/${
                        state.ballHandler.liveStats.fieldGoalsAttempted ?? 0
                      }`,
                      color: "text-orange-300",
                      borderColor: "border-orange-400/40",
                    },
                    {
                      label: "3PT",
                      value: `${
                        state.ballHandler.liveStats.threePointersMade ?? 0
                      }/${
                        state.ballHandler.liveStats.threePointersAttempted ?? 0
                      }`,
                      color: "text-rose-300",
                      borderColor: "border-rose-400/40",
                    },
                    {
                      label: "REB",
                      value: state.ballHandler.liveStats.rebounds ?? 0,
                      color: "text-emerald-300",
                      borderColor: "border-emerald-400/40",
                    },
                    {
                      label: "AST",
                      value: state.ballHandler.liveStats.assists ?? 0,
                      color: "text-purple-300",
                      borderColor: "border-purple-400/40",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={`rounded border px-2 py-3 text-[11px] font-medium tracking-[0.35em] stat-flash ${stat.borderColor} ${stat.color}`}
                    >
                      <div>{stat.label}</div>
                      <div
                        className="mt-2 text-lg font-black tracking-normal text-white text-flash"
                        key={stat.value}
                      >
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 border border-white/10 bg-[#101d35] px-3 py-2 text-xs text-slate-300/80">
                  Tracking player metrics…
                </div>
              )}
            </div>

            {/* Hot Streak Watch */}
            {state?.shooter && (
              <div className="rounded-xl border border-slate-700/50 bg-[#1a1d29] p-4 shadow-lg border-l-4 border-l-red-500">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {state.shooter.name && (
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border-2 border-red-500/50 bg-[#0f1419]">
                        <img
                          src={`https://nba-headshot-api.vercel.app/api/player/${encodeURIComponent(
                            state.shooter.name
                          )}`}
                          alt={state.shooter.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const parent = e.currentTarget.parentElement;
                            if (parent && state?.shooter?.name) {
                              e.currentTarget.style.display = "none";
                              const initials = state.shooter.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2);
                              const fallback = document.createElement("div");
                              fallback.className =
                                "absolute inset-0 flex items-center justify-center text-2xl font-black text-purple-300";
                              fallback.textContent = initials;
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Hot Streak Watch
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-lg font-semibold text-white">
                        <span
                          className="text-flash"
                          key={state.shooter?.name ?? "unknown"}
                        >
                          {state.shooter?.name ?? "Unknown"}
                        </span>
                        <span className="rounded-md bg-red-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-400 border border-red-500/30">
                          {state.shooter.teamTricode ?? "ATL"}
                        </span>
                      </div>
                      {state.shooter.result && (
                        <div className="mt-1 inline-flex items-center gap-2 border border-white/10 bg-[#121f36] px-3 py-1 text-xs text-slate-200">
                          <svg
                            aria-hidden="true"
                            className="h-4 w-4 text-purple-300"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M5 21v-2h14v2Zm7-2q-2.075 0-3.537-1.462Q7 16.075 7 14q0-.9.438-1.913.437-1.012 1.462-2.087 1.025-1.075 1.562-1.725Q11 7.625 11 7t-.275-1.463Q10.45 4.075 9.5 3.1q1.825.175 3.125 1.7 1.3 1.525 1.3 3.575 0 1.175-.563 2.213-.562 1.037-1.562 2.037l-.8.775h3.3L12 17l1.5 1.5Z" />
                          </svg>
                          {state.shooter.result}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="border border-white/10 bg-[#131f35] px-3 py-2 text-xs text-slate-300">
                    Parlay boost ready
                  </div>
                </div>
                {state?.shooter?.liveStats ? (
                  <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs uppercase tracking-[0.25em] text-slate-300">
                    {[
                      {
                        label: "PTS",
                        value: state.shooter.liveStats.points ?? 0,
                        color: "text-amber-300",
                        borderColor: "border-amber-400/40",
                      },
                      {
                        label: "FG",
                        value: `${
                          state.shooter.liveStats.fieldGoalsMade ?? 0
                        }/${state.shooter.liveStats.fieldGoalsAttempted ?? 0}`,
                        color: "text-pink-300",
                        borderColor: "border-pink-400/40",
                      },
                      {
                        label: "3PT",
                        value: `${
                          state.shooter.liveStats.threePointersMade ?? 0
                        }/${
                          state.shooter.liveStats.threePointersAttempted ?? 0
                        }`,
                        color: "text-cyan-300",
                        borderColor: "border-cyan-400/40",
                      },
                      {
                        label: "REB",
                        value: state.shooter.liveStats.rebounds ?? 0,
                        color: "text-lime-300",
                        borderColor: "border-lime-400/40",
                      },
                      {
                        label: "AST",
                        value: state.shooter.liveStats.assists ?? 0,
                        color: "text-violet-300",
                        borderColor: "border-violet-400/40",
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className={`rounded border px-2 py-3 text-[11px] font-medium tracking-[0.35em] stat-flash ${stat.borderColor} ${stat.color}`}
                      >
                        <div>{stat.label}</div>
                        <div
                          className="mt-1 text-lg font-black tracking-normal text-white text-flash"
                          key={stat.value}
                        >
                          {stat.value}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 border border-white/10 bg-[#131f35] px-3 py-2 text-xs text-slate-400">
                    Tracking player metrics…
                  </div>
                )}
              </div>
            )}

            {/* Player Stats Table */}
            <div>
              <div className="text-xs opacity-70 mb-2">Top Scorers</div>
              <div className="max-h-48 overflow-auto pr-2">
                <table className="w-full text-sm">
                  <thead className="text-xs opacity-70 sticky top-0 bg-black/50">
                    <tr>
                      <th className="text-left py-1">Player</th>
                      <th className="text-right">PTS</th>
                      <th className="text-right">FG</th>
                      <th className="text-right">FG%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(state?.players ?? [])
                      .sort((a, b) => (b.pts ?? 0) - (a.pts ?? 0))
                      .slice(0, 10)
                      .map((p) => (
                        <tr
                          key={p.personId}
                          className="border-t border-white/10"
                        >
                          <td className="py-1">
                            {p.name}
                            {p.teamTricode && (
                              <span className="text-xs opacity-60 ml-1">
                                ({p.teamTricode})
                              </span>
                            )}
                          </td>
                          <td className="text-right font-mono font-semibold">
                            {p.pts}
                          </td>
                          <td className="text-right font-mono text-xs">
                            {p.fgm}/{p.fga}
                          </td>
                          <td className="text-right font-mono text-xs">
                            {p.fgPct}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Webcam + Gesture Detector */}
          <div className="relative rounded-[36px] border border-white/10 bg-black/45 p-4 lg:p-6 shadow-lg shadow-black/50">
            <WebcamGestureDetector
              debug
              activeLabelsOverride={assignedLabels}
              hideReadyBanner
              onReadyChange={(r) => setWebcamReady(r)}
              displayNames={{
                "Left Player": playersBySlot[0]?.name ?? undefined,
                "Center Player": playersBySlot[1]?.name ?? undefined,
                "Right Player": playersBySlot[2]?.name ?? undefined,
              }}
              extraContent={
                <>
                  <div className="flex flex-wrap items-stretch justify-center gap-2 md:gap-3 w-full max-w-7xl mx-auto px-2">
                    {activeLabels.map((label) => {
                      const points = pointsByPlayer[label] ?? 0;
                      const digitCount = points.toLocaleString().length;
                      const playerCount = assignedLabels.length;

                      // Determine if this player is winning/losing for color coding
                      const allPoints = activeLabels.map(
                        (l) => pointsByPlayer[l] ?? 0
                      );
                      const maxPoints = Math.max(...allPoints);
                      const minPoints = Math.min(...allPoints);
                      const isWinning =
                        points === maxPoints && maxPoints !== minPoints;
                      const isLosing =
                        points === minPoints && maxPoints !== minPoints;

                      const getTextSize = () => {
                        if (playerCount === 3) {
                          if (digitCount <= 4)
                            return "text-2xl sm:text-3xl md:text-4xl";
                          if (digitCount <= 6)
                            return "text-xl sm:text-2xl md:text-3xl";
                          if (digitCount <= 8)
                            return "text-lg sm:text-xl md:text-2xl";
                          return "text-base sm:text-lg md:text-xl";
                        } else {
                          if (digitCount <= 4)
                            return "text-4xl sm:text-5xl md:text-6xl";
                          if (digitCount <= 6)
                            return "text-3xl sm:text-4xl md:text-5xl";
                          if (digitCount <= 8)
                            return "text-2xl sm:text-3xl md:text-4xl";
                          return "text-xl sm:text-2xl md:text-3xl";
                        }
                      };

                      const getWidthClasses = () => {
                        if (playerCount === 3) {
                          return "flex-1 min-w-[100px] max-w-[160px]";
                        } else if (playerCount === 2) {
                          return "flex-1 min-w-[140px] max-w-[220px]";
                        } else {
                          return "flex-1 min-w-[160px] max-w-[280px]";
                        }
                      };

                      // Get base color for score
                      const getScoreColor = () => {
                        if (playerPointsDisplay[label].show) {
                          return playerPointsDisplay[label].points > 0
                            ? "#49e6b5"
                            : "#a855f7";
                        }
                        if (isWinning) return "#10b981"; // green-500
                        if (isLosing) return "#ef4444"; // red-500
                        return "#ffffff";
                      };

                      return (
                        <motion.div
                          key={label}
                          className={`${getWidthClasses()} flex flex-col items-center justify-center border border-[#24405c] bg-[#0d1b31] px-2.5 py-2 shadow-[0_20px_45px_rgba(0,0,0,0.55)]`}
                          style={{
                            borderColor: LABEL_COLORS[label],
                            boxShadow: `0 0 18px ${LABEL_COLORS[label]}33`,
                          }}
                          animate={{
                            scale: playerPointsDisplay[label].show
                              ? [1, 1.05, 1]
                              : 1,
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          <div
                            className="mb-1 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.35em]"
                            style={{ color: LABEL_COLORS[label] }}
                          >
                            {label === "Left Player"
                              ? playersBySlot[0]?.name ?? label
                              : label === "Center Player"
                              ? playersBySlot[1]?.name ?? label
                              : playersBySlot[2]?.name ?? label}
                          </div>
                          <motion.div
                            className={`${getTextSize()} leading-none font-extrabold tabular-nums text-flash`}
                            key={points}
                            initial={{ scale: 1, filter: "brightness(1)" }}
                            animate={{
                              scale: playerPointsDisplay[label].show
                                ? [1, 1.3, 1]
                                : 1,
                              color: getScoreColor(),
                              filter: playerPointsDisplay[label].show
                                ? [
                                    "brightness(1)",
                                    "brightness(1.8)",
                                    "brightness(1)",
                                  ]
                                : "brightness(1)",
                            }}
                            transition={{ duration: 0.5 }}
                          >
                            {points.toLocaleString()}
                          </motion.div>
                          <div className="mt-1">
                            {((label === "Left Player" && playersBySlot[0]) ||
                              (label === "Center Player" && playersBySlot[1]) ||
                              (label === "Right Player" &&
                                playersBySlot[2])) && (
                              <button
                                onClick={async () => {
                                  try {
                                    await fetch("/api/join/remove", {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        gameSessionId,
                                        slot:
                                          label === "Left Player"
                                            ? 0
                                            : label === "Center Player"
                                            ? 1
                                            : 2,
                                      }),
                                    });
                                    const res = await fetch(
                                      `/api/game-session/${id}`,
                                      {
                                        cache: "no-store",
                                      }
                                    );
                                    const data = await res.json();
                                    const next: Record<
                                      number,
                                      {
                                        id: string;
                                        name?: string;
                                        image?: string;
                                      } | null
                                    > = { 0: null, 1: null, 2: null };
                                    (data.players ?? []).forEach((p: any) => {
                                      next[p.slot] = {
                                        id: p.user.id,
                                        name: p.user.name,
                                        image: p.user.image,
                                      };
                                    });
                                    setGameSessionId(data.id ?? null);
                                    setJoinCode(data.joinCode ?? null);
                                    setPlayersBySlot(next);
                                  } catch {}
                                }}
                                className="rounded bg-red-600/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white hover:bg-red-600"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          {playerStreaks[label] > 0 && (
                            <motion.div
                              initial={{ scale: 0, y: -5 }}
                              animate={{ scale: 1, y: 0 }}
                              className="relative text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-white whitespace-nowrap overflow-visible"
                            >
                              {/* Fire particles */}
                              {[...Array(6)].map((_, i) => (
                                <motion.div
                                  key={`fire-${i}`}
                                  className="absolute w-1 h-1 rounded-full"
                                  style={{
                                    background:
                                      i % 2 === 0 ? "#ff6b00" : "#ff0000",
                                    left: `${10 + i * 15}%`,
                                    bottom: "100%",
                                  }}
                                  animate={{
                                    y: [-2, -8, -2],
                                    opacity: [0.8, 0.4, 0.8],
                                    scale: [1, 0.5, 1],
                                  }}
                                  transition={{
                                    duration: 0.8,
                                    repeat: Infinity,
                                    delay: i * 0.1,
                                    ease: "easeInOut",
                                  }}
                                />
                              ))}
                              {playerStreaks[label]} STREAK
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                  <div className="border border-[#1e2f46] bg-[#0b1527] p-4 text-sm text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
                    <div className="flex items-center justify-between font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
                      <span>Stream Delay (seconds)</span>
                      <span>{streamDelay}s</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={streamDelay}
                      onChange={(e) => setStreamDelay(Number(e.target.value))}
                      className="mt-3 h-2 w-full cursor-pointer appearance-none bg-[#1d2f46] accent-emerald-400"
                    />
                    <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-300/70">
                      Popup appears {Math.max(0, streamDelay - 3)}s before shot
                      on your stream
                    </div>
                    <button
                      onClick={() => {
                        if (winAudioRef.current) {
                          winAudioRef.current.currentTime = 0;
                          winAudioRef.current.play().catch((err) => {
                            console.log("Audio test failed:", err);
                          });
                        }
                      }}
                      className="mt-4 w-full shimmer border border-purple-400/40 bg-purple-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-purple-100 transition hover:bg-purple-500/35 hover:scale-105"
                    >
                      Test Win Sound
                    </button>
                  </div>
                </>
              }
              onActiveLabelsChange={(labels: PlayerLabel[]) =>
                setActiveLabels(labels)
              }
              onShootGesture={(label?: PlayerLabel, shotType?: ShotType) => {
                if (label) {
                  registerPrediction(label, {
                    ts: Date.now(),
                    period: state?.period,
                    clock: state?.clock,
                    shotType: shotType ?? null,
                  });
                }
              }}
            />
            {overlay && (
              <ScoreAnimation
                mode={overlay}
                activeLabels={assignedLabels}
                lanePoints={lanePoints}
                displayNames={{
                  "Left Player": playersBySlot[0]?.name ?? undefined,
                  "Center Player": playersBySlot[1]?.name ?? undefined,
                  "Right Player": playersBySlot[2]?.name ?? undefined,
                }}
              />
            )}
            {error && (
              <div className="absolute bottom-3 left-3 right-3 border border-purple-400/30 bg-black/60 p-2 text-xs text-purple-200">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
      {(state?.lastAction ||
        liveState?.lastAction ||
        (state?.recentActions?.length ?? 0) > 0 ||
        (liveState?.recentActions?.length ?? 0) > 0) && (
        <div className="fixed bottom-6 left-6 z-40 hidden max-w-3xl flex-col gap-3 md:flex">
          {[
            ...(state?.recentActions ?? liveState?.recentActions ?? []).slice(
              0,
              2
            ),
            ...(state?.lastAction || liveState?.lastAction
              ? [state?.lastAction || liveState?.lastAction]
              : []),
          ]
            .slice(0, 3)
            .map((act, idx) => (
              <div
                key={idx}
                className="popup-flash relative overflow-hidden rounded-lg border-2 border-emerald-400/40 bg-gradient-to-br from-[#0f192b] to-[#1a1d29] px-8 py-4 text-base text-slate-100 shadow-[0_0_30px_rgba(16,185,129,0.3),0_20px_60px_rgba(0,0,0,0.7)]"
                style={{
                  animation:
                    "popupFlash 0.6s ease-out, glowPulse 2s ease-in-out infinite, popupFadeOut 5s ease-in forwards",
                }}
              >
                <div className="text-center">
                  <div className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                    {idx === 1 && (state?.lastAction || liveState?.lastAction)
                      ? "INSTANT RESULT"
                      : "LIVE UPDATE"}
                  </div>
                </div>
                <div className="mt-3 text-base font-semibold text-white">
                  {act?.playerName ?? act?.name ?? "Unknown"} (
                  {act?.teamTricode ?? "NYY"})
                </div>
                <div className="mt-2 text-xs text-slate-300">
                  {act.actionType
                    ? `${act.actionType} — ${act.shotResult ?? "Odds move"}`
                    : act.description ?? act.shotResult ?? "Live line moved"}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-emerald-300">
                  <span>Live odds shift</span>
                  <span className="border border-emerald-400/40 px-2 py-[2px] font-semibold text-emerald-100">
                    {idx % 2 === 0 ? "+105 → -120" : "+160 → +140"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-slate-400">
                  <span>Parlay ready</span>
                  <span className="text-emerald-200">Boost +15%</span>
                </div>
              </div>
            ))}
        </div>
      )}

      <ShotIncomingOverlay show={showShotIncoming} countdown={shotCountdown} />
      <ShotResultOverlay show={showShotResult} shotData={currentShotData} />
      <MultiPlayerPointsOverlay
        players={[
          {
            label: "Left Player",
            points: playerPointsDisplay["Left Player"].points,
            show: playerPointsDisplay["Left Player"].show,
            basePoints: playerPointsDisplay["Left Player"].basePoints,
            shotMultiplier: playerPointsDisplay["Left Player"].shotMultiplier,
            streakMultiplier:
              playerPointsDisplay["Left Player"].streakMultiplier,
          },
          {
            label: "Right Player",
            points: playerPointsDisplay["Right Player"].points,
            show: playerPointsDisplay["Right Player"].show,
            basePoints: playerPointsDisplay["Right Player"].basePoints,
            shotMultiplier: playerPointsDisplay["Right Player"].shotMultiplier,
            streakMultiplier:
              playerPointsDisplay["Right Player"].streakMultiplier,
          },
          {
            label: "Center Player",
            points: playerPointsDisplay["Center Player"].points,
            show: playerPointsDisplay["Center Player"].show,
            basePoints: playerPointsDisplay["Center Player"].basePoints,
            shotMultiplier: playerPointsDisplay["Center Player"].shotMultiplier,
            streakMultiplier:
              playerPointsDisplay["Center Player"].streakMultiplier,
          },
        ]}
      />
      <PointsEarnedOverlay
        show={false}
        points={pointsEarned}
        label={pointsEarnedLabel ?? undefined}
      />
    </div>
  );
}
