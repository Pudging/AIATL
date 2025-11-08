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
  const debugWindowRef = useRef<Window | null>(null);
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
    let bestState: { state: ParsedGameState; timestamp: number } | null = null;

    for (const item of stateQueueRef.current) {
      // Only consider states at or before the target
      if (item.timestamp <= targetTimestamp) {
        if (!bestState || item.timestamp > bestState.timestamp) {
          bestState = { state: item.state, timestamp: item.timestamp };
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
          setGameSessionId(data.id ?? null);
          setJoinCode(data.joinCode ?? null);
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
        }
      } catch {}
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
            data.states.forEach((item, index) => {
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
            console.log(
              `[TEST002] Queue first timestamp: ${new Date(
                stateQueueRef.current[0].timestamp
              ).toLocaleTimeString()}`
            );
            console.log(
              `[TEST002] Queue last timestamp: ${new Date(
                stateQueueRef.current[
                  stateQueueRef.current.length - 1
                ].timestamp
              ).toLocaleTimeString()}`
            );
            console.log(`[TEST002] Auto-playing from start...`);
          } else {
            console.warn(
              "[TEST002] No timeActual found, using fallback spacing"
            );
            const baseTime = now;
            const timePerState = 900000 / data.states.length;
            data.states.forEach((item, index) => {
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
						<div class="label">Quarter ${liveState.period ?? "-"} • ${formatClock(
          liveState.clock || ""
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

  const sortedPlayers = useMemo(() => {
    return (state?.players ?? []).slice().sort((a, b) => b.pts - a.pts);
  }, [state]);

  const lastAction = state?.lastAction;
  const recentActions = state?.recentActions ?? [];
  const lastShot = state?.lastShot;

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white"
      style={{
        background: `
          radial-gradient(circle at 20% -10%, rgba(73, 230, 181, 0.45), transparent 60%),
          radial-gradient(circle at 78% 5%, rgba(168, 85, 247, 0.3), transparent 65%),
          radial-gradient(circle at 50% 120%, rgba(73, 230, 181, 0.18), transparent 62%),
          linear-gradient(130deg, rgba(7, 41, 33, 0.9), rgba(27, 8, 34, 0.92)),
          ${brandPalette.midnight},
          ${brandPalette.deep}
        `,
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-55">
        <div className="absolute -left-32 top-8 h-96 w-96 rotate-6 rounded-full bg-gradient-to-br from-emerald-300/60 via-emerald-500/30 to-transparent blur-[140px]" />
        <div className="absolute right-[-8%] bottom-0 h-96 w-96 -rotate-6 rounded-full bg-gradient-to-br from-purple-500/35 via-emerald-400/20 to-transparent blur-[150px]" />
      </div>
      <div className="relative mx-auto w-full max-w-6xl px-4 pt-28 pb-16 sm:px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-[36px] border border-white/10 bg-black/45 p-6 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
            {/* Header: Period, Clock, User Points */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm opacity-75">
                  Period {state?.period ?? "-"}
                </div>
                <div className="text-2xl font-mono font-bold">
                  {state?.clock ?? "--:--"}
                </div>
                <div className="text-sm" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <div className="opacity-60 font-mono">
                    Dashboard: {isMounted ? currentTime : "--:--:--"}
                  </div>
                  <div className="text-purple-200 font-semibold">
                    Update #{delayedUpdateCount}{" "}
                    {streamGameClock
                      ? `(Stream: ${streamGameClock})`
                      : "(Live)"}
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
                  <div className="text-xs opacity-60">
                    Queue: {stateQueueRef.current.length} states
                  </div>
                </div>
              </div>
            </div>

            {/* Debug: Always show for testing */}
            <div className="rounded-xl border border-purple-500/40 bg-purple-500/15 p-2 text-xs">
              DEBUG: id="{id}" | isTestGame={isTestGame ? "TRUE" : "FALSE"}
            </div>

            {/* Test Game Timeline Control */}
            {isTestGame && (
              <div className="rounded-lg border border-purple-500/40 bg-purple-500/15 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-purple-200 font-semibold">
                    TEST GAME TIMELINE
                  </span>
                  <span className="text-sm font-bold">
                    Action {testGameTimestamp + 1}/7
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="1"
                  value={testGameTimestamp}
                  onChange={(e) => setTestGameTimestamp(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
                <div className="text-xs text-purple-200 mt-2">
                  Scrub through test game actions to see shot detection and
                  predictions
                </div>
              </div>
            )}

            {/* Stream Clock Sync */}
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs opacity-70">Stream Game Clock</span>
                <span className="text-sm font-bold">
                  {streamGameClock || "Not Set"}
                </span>
              </div>
              <div className="flex gap-2">
                <select
                  value={streamPeriodInput}
                  onChange={(e) =>
                    setStreamPeriodInput(parseInt(e.target.value))
                  }
                  className="px-3 py-2 bg-black/50 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-emerald-400"
                >
                  <option value="1">Q1</option>
                  <option value="2">Q2</option>
                  <option value="3">Q3</option>
                  <option value="4">Q4</option>
                </select>
                <input
                  type="text"
                  placeholder="e.g. 2:55"
                  value={streamClockInput}
                  onChange={(e) => setStreamClockInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-black/50 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-emerald-400"
                />
                <button
                  onClick={() => {
                    if (streamClockInput) {
                      // Find the state matching the entered clock and period
                      const match = findStateByGameClock(
                        streamClockInput,
                        streamPeriodInput
                      );
                      if (match) {
                        setStreamGameClock(streamClockInput);
                        setSyncedPeriod(streamPeriodInput);

                        // Set sync anchor: the matched state's timestamp and current real-world time
                        const matchedItem = stateQueueRef.current.find(
                          (item) => item.state === match.state
                        );
                        if (matchedItem) {
                          const now = Date.now();
                          setSyncAnchor({
                            nbaTimestamp: matchedItem.timestamp,
                            realWorldTime: now,
                          });

                          // Calculate actual delay for display purposes
                          const latestTimestamp =
                            stateQueueRef.current[
                              stateQueueRef.current.length - 1
                            ].timestamp;
                          const actualDelay =
                            (latestTimestamp - matchedItem.timestamp) / 1000;
                          setStreamDelaySeconds(actualDelay);

                          console.log(`[SYNC] ===== SYNC DEBUG =====`);
                          console.log(
                            `[SYNC] Target: Q${streamPeriodInput} ${streamClockInput}`
                          );
                          console.log(
                            `[SYNC] Matched state: Q${
                              match.state.period
                            } ${formatClock(match.state.clock || "")}`
                          );
                          console.log(
                            `[SYNC] Matched timestamp: ${new Date(
                              matchedItem.timestamp
                            ).toLocaleTimeString()}`
                          );
                          console.log(
                            `[SYNC] Latest timestamp: ${new Date(
                              latestTimestamp
                            ).toLocaleTimeString()}`
                          );
                          console.log(
                            `[SYNC] Delay from end: ${actualDelay.toFixed(1)}s`
                          );
                          console.log(
                            `[SYNC] Sync anchor set - will progress from Q${streamPeriodInput} ${streamClockInput}`
                          );
                          console.log(
                            `[SYNC] As time passes, game will advance relative to your PC time`
                          );
                          console.log(`[SYNC] ========================`);
                        }
                      } else {
                        console.warn(
                          `[SYNC] No match found for Q${streamPeriodInput} ${streamClockInput}`
                        );
                      }
                    }
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded text-sm transition"
                >
                  Sync
                </button>
              </div>
              <div className="text-xs opacity-60 mt-2">
                Enter the game clock showing on your stream (e.g., "4:30" or
                "2:15")
              </div>
              {streamGameClock &&
                liveState?.clock &&
                streamDelaySeconds > 0 && (
                  <div className="text-xs mt-2 space-y-2">
                    <div className="text-emerald-300">
                      ✓ Synced to Q{syncedPeriod} {streamGameClock}
                    </div>
                    <div className="text-white/60">
                      Live: Q{liveState.period} {liveState.clock} | Delay:{" "}
                      {streamDelaySeconds.toFixed(1)}s
                    </div>

                    {/* Stream ahead adjustment */}
                    <div className="space-y-1 pt-2 border-t border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="text-white/60">Stream ahead by:</span>
                        <span className="text-emerald-300 font-mono">
                          {manualDelayAdjustment.toFixed(1)}s
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="0.5"
                        value={manualDelayAdjustment}
                        onChange={(e) => {
                          const adjustment = parseFloat(e.target.value);
                          setManualDelayAdjustment(adjustment);
                        }}
                        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400"
                      />
                      <div className="flex justify-between text-[10px] text-white/40">
                        <span>0s (exact sync)</span>
                        <span>+30s ahead</span>
                      </div>
                      <div className="text-[10px] text-white/40 mt-1">
                        If your stream is ahead of the time you entered,
                        increase this to catch up
                      </div>
                    </div>

                    <div className="text-white/40 text-[10px]">
                      Dashboard auto-tracks behind live using real NBA
                      timestamps
                    </div>
                  </div>
                )}
            </div>

            {/* Game Clock & Quarter */}
            <div className="rounded-lg border border-emerald-400/30 bg-gradient-to-r from-emerald-500/10 to-purple-500/10 p-3 text-center">
              <div className="text-xs uppercase tracking-wide text-white/60 mb-1">
                {state?.period ? `Quarter ${state.period}` : "Game Time"}
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-300">
                {formatClock(state?.clock || "")}
              </div>
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
            {lastShot && lastShot.playerName && (
              <div className="rounded-lg border border-white/10 bg-gradient-to-r from-emerald-500/15 to-purple-500/20 p-3">
                <div className="text-xs opacity-70 mb-1">Last Shot</div>
                <div className="text-lg font-semibold">
                  {lastShot.playerName}
                  {lastShot.teamTricode && (
                    <span className="ml-2 text-sm opacity-75">
                      ({lastShot.teamTricode})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-sm font-bold ${
                      lastShot.shotResult &&
                      lastShot.shotResult.toLowerCase().includes("made")
                        ? "text-emerald-300"
                        : "text-purple-200"
                    }`}
                  >
                    {lastShot.shotResult || "Unknown"}
                  </span>
                  {lastShot.shotType && (
                    <span className="text-xs opacity-70">
                      {lastShot.shotType}
                    </span>
                  )}
                  <span className="text-xs font-mono bg-white/10 px-1.5 py-0.5 rounded">
                    +{lastShot.points || "?"}
                  </span>
                </div>
                {lastShot.description && (
                  <div className="text-xs opacity-60 mt-1">
                    {lastShot.description}
                  </div>
                )}
              </div>
            )}

            {/* Current Possession */}
            <div className="bg-gradient-to-r from-emerald-500/15 to-purple-500/20 rounded-lg border border-white/10 p-3">
              <div className="text-xs opacity-70 mb-1">Ball Handler</div>
              <div className="text-lg font-semibold">
                {state?.ballHandler?.name ?? "—"}
                {state?.ballHandler?.teamTricode && (
                  <span className="ml-2 text-sm opacity-75">
                    ({state.ballHandler.teamTricode})
                  </span>
                )}
              </div>
              {state?.ballHandler?.liveStats && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="opacity-70">Shooting %</span>
                    <span className="font-bold text-lg text-emerald-200">
                      {state.ballHandler.liveStats.fieldGoalsAttempted > 0
                        ? Math.round(
                            (state.ballHandler.liveStats.fieldGoalsMade /
                              state.ballHandler.liveStats.fieldGoalsAttempted) *
                              100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <div className="opacity-60">PTS</div>
                      <div className="font-bold">
                        {state.ballHandler.liveStats.points ?? 0}
                      </div>
                    </div>
                    <div>
                      <div className="opacity-60">FG</div>
                      <div className="font-bold">
                        {state.ballHandler.liveStats.fieldGoalsMade ?? 0}/
                        {state.ballHandler.liveStats.fieldGoalsAttempted ?? 0}
                      </div>
                    </div>
                    <div>
                      <div className="opacity-60">3PT</div>
                      <div className="font-bold">
                        {state.ballHandler.liveStats.threePointersMade ?? 0}/
                        {state.ballHandler.liveStats.threePointersAttempted ??
                          0}
                      </div>
                    </div>
                    <div>
                      <div className="opacity-60">AST</div>
                      <div className="font-bold">
                        {state.ballHandler.liveStats.assists ?? 0}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Current Shooter */}
            {state?.shooter && (
              <div className="bg-gradient-to-r from-purple-500/20 via-purple-500/10 to-emerald-500/10 rounded-lg border border-white/10 p-3">
                <div className="text-xs opacity-70 mb-1">Active Shooter</div>
                <div className="text-lg font-semibold">
                  {state.shooter.name}
                  {state.shooter.teamTricode && (
                    <span className="ml-2 text-sm opacity-75">
                      ({state.shooter.teamTricode})
                    </span>
                  )}
                </div>
                {state.shooter.result && (
                  <div className="text-sm mt-1 opacity-80">
                    {state.shooter.result}
                  </div>
                )}
                {state.shooter.liveStats && (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="opacity-60">PTS</div>
                      <div className="font-bold text-sm">
                        {state.shooter.liveStats.points ?? 0}
                      </div>
                    </div>
                    <div>
                      <div className="opacity-60">FG%</div>
                      <div className="font-bold text-sm">
                        {state.shooter.liveStats.fieldGoalsAttempted > 0
                          ? Math.round(
                              (state.shooter.liveStats.fieldGoalsMade /
                                state.shooter.liveStats.fieldGoalsAttempted) *
                                100
                            )
                          : 0}
                        %
                      </div>
                    </div>
                    <div>
                      <div className="opacity-60">3PT%</div>
                      <div className="font-bold text-sm">
                        {state.shooter.liveStats.threePointersAttempted > 0
                          ? Math.round(
                              (state.shooter.liveStats.threePointersMade /
                                state.shooter.liveStats
                                  .threePointersAttempted) *
                                100
                            )
                          : 0}
                        %
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Last Action */}
            {lastAction && (
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <div className="text-xs opacity-70 mb-1">Last Action</div>
                <div className="text-sm">
                  <span className="font-semibold">
                    {lastAction.playerName ?? "Unknown"}
                  </span>
                  {lastAction.teamTricode && (
                    <span className="opacity-75">
                      {" "}
                      ({lastAction.teamTricode})
                    </span>
                  )}
                  {lastAction.actionType && (
                    <span className="ml-2 text-xs bg-white/10 px-2 py-0.5 rounded">
                      {lastAction.actionType}
                    </span>
                  )}
                  {lastAction.shotResult && (
                    <span className="ml-2 text-xs font-semibold">
                      {lastAction.shotResult}
                    </span>
                  )}
                  {lastAction.description && (
                    <div className="text-xs opacity-60 mt-1">
                      {lastAction.description}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recent Actions Feed */}
            {recentActions.length > 0 && (
              <div>
                <div className="text-xs opacity-70 mb-2">Recent Actions</div>
                <div className="space-y-1 max-h-32 overflow-auto pr-2">
                  {recentActions.slice(0, 5).map((act, i) => (
                    <div
                      key={i}
                      className="text-xs rounded bg-black/30 border border-white/10 px-2 py-1"
                    >
                      <span className="font-semibold">
                        {act.playerName ?? "?"}
                      </span>
                      {act.teamTricode && (
                        <span className="opacity-60"> ({act.teamTricode})</span>
                      )}
                      {act.actionType && (
                        <span className="ml-1 opacity-75">
                          — {act.actionType}
                        </span>
                      )}
                      {act.shotResult && (
                        <span className="ml-1 font-semibold">
                          {act.shotResult}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
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
                    {sortedPlayers.slice(0, 10).map((p) => (
                      <tr key={p.personId} className="border-t border-white/10">
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
            {/* Prominent Join Code above webcam */}
            {joinCode ? (
              <div className="mb-3">
                <div className="w-full rounded-2xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/20 via-emerald-400/10 to-purple-500/20 px-4 py-3 text-center">
                  <div className="text-[10px] uppercase tracking-[0.4em] text-emerald-200 mb-1">
                    Join on phone: /join
                  </div>
                  <div className="font-black text-2xl sm:text-3xl md:text-4xl tracking-[0.2em] text-white">
                    {joinCode}
                  </div>
                </div>
              </div>
            ) : null}
            {/* Webcam status below join code, above webcam */}
            <div className="mb-2 text-center">
              <div className="inline-block rounded-full bg-white/10 px-4 py-1 text-xs text-white">
                {webcamReady
                  ? "Webcam Ready · 2 arms=shot | 1 arm=layup | hand on head=dunk"
                  : "Initializing webcam..."}
              </div>
            </div>
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
                <div className="flex flex-wrap items-stretch justify-center gap-2 md:gap-3 w-full max-w-7xl mx-auto px-2">
                  {assignedLabels.map((label) => {
                    const points = pointsByPlayer[label] ?? 0;
                    const digitCount = points.toLocaleString().length;
                    const playerCount = assignedLabels.length;

                    // Dynamic text size based on digit count AND player count
                    const getTextSize = () => {
                      if (playerCount === 3) {
                        // Smaller sizes for 3 players
                        if (digitCount <= 4)
                          return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl";
                        if (digitCount <= 6)
                          return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl";
                        if (digitCount <= 8)
                          return "text-xl sm:text-2xl md:text-3xl lg:text-4xl";
                        return "text-lg sm:text-xl md:text-2xl lg:text-3xl";
                      } else {
                        // Larger sizes for 1-2 players
                        if (digitCount <= 4)
                          return "text-5xl sm:text-6xl md:text-7xl lg:text-8xl";
                        if (digitCount <= 6)
                          return "text-4xl sm:text-5xl md:text-6xl lg:text-7xl";
                        if (digitCount <= 8)
                          return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl";
                        return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl";
                      }
                    };

                    // Dynamic width based on player count
                    const getWidthClasses = () => {
                      if (playerCount === 3) {
                        return "flex-1 min-w-[110px] max-w-[180px]";
                      } else if (playerCount === 2) {
                        return "flex-1 min-w-[140px] max-w-[280px]";
                      } else {
                        return "flex-1 min-w-[160px] max-w-[320px]";
                      }
                    };

                    return (
                      <motion.div
                        key={label}
                        className={`${getWidthClasses()} flex flex-col items-center justify-center rounded-xl border-2 border-white/10 bg-black/60 px-3 py-2`}
                        style={{
                          borderColor: LABEL_COLORS[label],
                          boxShadow: `0 0 20px ${LABEL_COLORS[label]}40`,
                        }}
                        animate={{
                          scale: playerPointsDisplay[label].show
                            ? [1, 1.05, 1]
                            : 1,
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        <div
                          className="text-[10px] uppercase tracking-wider font-semibold mb-1 whitespace-nowrap"
                          style={{ color: LABEL_COLORS[label] }}
                        >
                          {label === "Left Player"
                            ? playersBySlot[0]?.name ?? label
                            : label === "Center Player"
                            ? playersBySlot[1]?.name ?? label
                            : playersBySlot[2]?.name ?? label}
                        </div>
                        <motion.div
                          className={`${getTextSize()} font-extrabold text-white leading-none tabular-nums`}
                          key={points}
                          initial={{ scale: 1 }}
                          animate={{
                            scale: playerPointsDisplay[label].show
                              ? [1, 1.3, 1]
                              : 1,
                            color: playerPointsDisplay[label].show
                              ? playerPointsDisplay[label].points > 0
                                ? "#49e6b5"
                                : "#a855f7"
                              : "#ffffff",
                          }}
                          transition={{ duration: 0.5 }}
                        >
                          {points.toLocaleString()}
                        </motion.div>
                        <div className="mt-1">
                          {((label === "Left Player" && playersBySlot[0]) ||
                            (label === "Center Player" && playersBySlot[1]) ||
                            (label === "Right Player" && playersBySlot[2])) && (
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
              }
              onActiveLabelsChange={(labels) => setActiveLabels(labels)}
              onShootGesture={(label, shotType) =>
                registerPrediction(label as PlayerLabel, {
                  ts: Date.now(),
                  period: state?.period,
                  clock: state?.clock,
                  shotType,
                })
              }
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
              <div className="absolute bottom-3 left-3 right-3 rounded bg-black/60 p-2 text-xs text-purple-200">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

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
