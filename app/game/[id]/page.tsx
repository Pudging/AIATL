"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import type { ParsedGameState } from "@/components/types";
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
  const POINT_DELTA = 10000;
  const params = useParams<{ id: string }>();
  const id = params.id;
  
  // Audio ref for win sound
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<ParsedGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pointsByPlayer, setPointsByPlayer] = useState<
    Record<PlayerLabel, number>
  >(() => {
    // For test game, start at 100k
    const isTest = id?.toUpperCase() === "TEST001";
    return {
      "Left Player": isTest ? 100000 : 0,
      "Right Player": isTest ? 100000 : 0,
      "Center Player": isTest ? 100000 : 0,
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
      { ts: number; period?: number | string | null; clock?: string }[]
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
  const [streamDelay, setStreamDelay] = useState(10);
  const [predictionWindowActive, setPredictionWindowActive] = useState(false);
  const [showPointsEarned, setShowPointsEarned] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [pointsEarnedLabel, setPointsEarnedLabel] = useState<string | null>(
    null
  );
  const [playerPointsDisplay, setPlayerPointsDisplay] = useState<
    Record<PlayerLabel, { show: boolean; points: number }>
  >({
    "Left Player": { show: false, points: 0 },
    "Right Player": { show: false, points: 0 },
    "Center Player": { show: false, points: 0 },
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
  const stateQueueRef = useRef<{ state: ParsedGameState; timestamp: number }[]>(
    []
  );
  const [liveUpdateCount, setLiveUpdateCount] = useState(0);
  const [delayedUpdateCount, setDelayedUpdateCount] = useState(0);
  const [currentTime, setCurrentTime] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [testGameTimestamp, setTestGameTimestamp] = useState(0);
  const isTestGame = id?.toUpperCase() === "TEST001";

  // Debug logging
  useEffect(() => {
    console.log("[DEBUG] Game ID:", id, "isTestGame:", isTestGame);
  }, [id, isTestGame]);

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
    // Initialize audio
    if (typeof window !== 'undefined') {
      winAudioRef.current = new Audio('/win_file.mp3');
      winAudioRef.current.volume = 1.0; // Set volume to 100%
    }
  }, []);

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

          // Remove old states (keep extra buffer)
          stateQueueRef.current = stateQueueRef.current.filter(
            (item) => now - item.timestamp < (streamDelay + 10) * 1000
          );

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
    load();
    // Only auto-refresh for non-test games
    const timer = isTestGame ? null : setInterval(load, 1500);
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, streamDelay, testGameTimestamp, isTestGame]);

  // Process delayed state
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const delayMs = streamDelay * 1000;

      // Find the most recent state that is old enough to be shown (delayed)
      const eligibleStates = stateQueueRef.current.filter(
        (item) => now - item.timestamp >= delayMs
      );

      if (eligibleStates.length > 0) {
        // Get the most recent eligible state
        const targetState = eligibleStates[eligibleStates.length - 1];
        const prevState = delayedState;

        // Only update if it's actually different
        if (
          !prevState ||
          targetState.state.clock !== prevState.clock ||
          targetState.state.lastAction !== prevState.lastAction
        ) {
          setDelayedState(targetState.state);
          setState(targetState.state);
          setDelayedUpdateCount((prev) => prev + 1);

          const ageSeconds = ((now - targetState.timestamp) / 1000).toFixed(1);
          console.log(
            `[DELAYED] Update #${
              delayedUpdateCount + 1
            } shown (${ageSeconds}s old) at ${new Date(
              now
            ).toLocaleTimeString()}`
          );
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [streamDelay, delayedState, delayedUpdateCount]);

  function registerPrediction(
    label: PlayerLabel | undefined,
    pred: {
      ts: number;
      period?: number | string | null;
      clock?: string;
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

    // Shot detected in live data NOW
    // We want popup to appear (streamDelay - 3) seconds from now
    // So the popup finishes right when the delayed stream shows the shot
    const popupDelay = Math.max(0, (streamDelay - 3) * 1000);

    console.log(
      `Shot detected! Will show popup in ${
        popupDelay / 1000
      }s, countdown for 3s`
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
        if (labelsWithPrediction.length > 0) {
          const delta = isMade ? POINT_DELTA : -POINT_DELTA;
          setPointsByPlayer((prev) => {
            const next = { ...prev };
            labelsWithPrediction.forEach((label) => {
              next[label] = (next[label] ?? 0) + delta;
            });
            return next;
          });

          // Play win sound and show money rain if player gained points (made the shot)
          if (isMade && winAudioRef.current) {
            winAudioRef.current.currentTime = 0; // Reset to start
            winAudioRef.current.play().catch(err => {
              console.log('Audio play failed:', err);
            });
            
            // Trigger money rain effect
            setShowMoneyRain(true);
            setTimeout(() => setShowMoneyRain(false), 3000);
          }

          // Show individual overlays for each player
          setPlayerPointsDisplay((prev) => {
            const next = { ...prev };
            labelsWithPrediction.forEach((label) => {
              next[label] = { show: true, points: delta };
            });
            return next;
          });

          // Hide overlays after 2.5 seconds
          setTimeout(() => {
            setPlayerPointsDisplay({
              "Left Player": { show: false, points: 0 },
              "Right Player": { show: false, points: 0 },
              "Center Player": { show: false, points: 0 },
            });
          }, 2500);

          // Keep old single overlay for backwards compatibility (can remove later)
          setPointsEarned(delta);
          setPointsEarnedLabel(
            labelsWithPrediction.length === 1
              ? labelsWithPrediction[0]
              : "Multiple Players"
          );
          setShowPointsEarned(true);
          setTimeout(() => setShowPointsEarned(false), 3000);
        }
        // Show lane points for all active labels (predicted => delta, else 0)
        const laneMap: Record<PlayerLabel, number | null> = {
          "Left Player": null,
          "Right Player": null,
          "Center Player": null,
        };
        activeLabels.forEach((label) => {
          laneMap[label] = labelsWithPrediction.includes(label)
            ? isMade
              ? POINT_DELTA
              : -POINT_DELTA
            : 0;
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


  const sortedPlayers = useMemo(() => {
    return (state?.players ?? []).slice().sort((a, b) => b.pts - a.pts);
  }, [state]);

  const lastAction = state?.lastAction;
  const recentActions = state?.recentActions ?? [];
  const lastShot = state?.lastShot;

  const inningNumber = useMemo(() => {
    const raw = state?.period ?? liveState?.period ?? 1;
    const numRaw = typeof raw === 'string' ? parseInt(raw, 10) : raw;
    return numRaw <= 0 ? 1 : numRaw;
  }, [state?.period, liveState?.period]);

  const inningHalf = useMemo(() => {
    return inningNumber % 2 === 0 ? "Bottom" : "Top";
  }, [inningNumber]);

  const outsCount = useMemo(() => {
    const source = (state?.clock ?? "").length + liveUpdateCount + delayedUpdateCount;
    return source % 3;
  }, [state?.clock, liveUpdateCount, delayedUpdateCount]);

  const runnerSituations = useMemo(() => {
    const templates = [
      "Bases Empty",
      "Runner on 1st",
      "Runner on 2nd",
      "Runner on 3rd",
      "Runners on 1st & 2nd",
      "Runners on the corners",
      "Bases Loaded",
    ];
    const index =
      ((state?.score?.home ?? 0) + (state?.score?.away ?? 0) + inningNumber) %
      templates.length;
    return templates[index];
  }, [state?.score?.home, state?.score?.away, inningNumber]);

  const situationalText = `${outsCount} Out${outsCount === 1 ? "" : "s"} | ${runnerSituations}`;

  const oddsSnapshot = useMemo(() => {
    const homeScore = state?.score?.home ?? 0;
    const awayScore = state?.score?.away ?? 0;
    const spreadValue = Math.max(1.5, Math.abs(homeScore - awayScore) + 0.5);
    const favoriteIsHome = homeScore >= awayScore;

    const formatMoneyline = (fav: boolean) => (fav ? "-135" : "+145");
    const formatSpread = (fav: boolean) =>
      `${fav ? "-" : "+"}${spreadValue.toFixed(1)}`;

    const total = Math.max(7.5, homeScore + awayScore + 3.5).toFixed(1);

    return {
      home: {
        moneyline: formatMoneyline(favoriteIsHome),
        spread: formatSpread(favoriteIsHome),
      },
      away: {
        moneyline: formatMoneyline(!favoriteIsHome),
        spread: formatSpread(!favoriteIsHome),
      },
      total,
    };
  }, [state?.score?.home, state?.score?.away]);

  const sampleBaseballNames = ["A. Judge", "J. Soto", "S. Ohtani", "R. Acuña Jr.", "M. Betts"];

  const mapToBaseballName = (index: number) =>
    sampleBaseballNames[index % sampleBaseballNames.length];

  const [homeScoreFlash, setHomeScoreFlash] = useState(false);
  const [awayScoreFlash, setAwayScoreFlash] = useState(false);
  const homeScoreRef = useRef<number | null>(null);
  const awayScoreRef = useRef<number | null>(null);
  const homeFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const awayFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentHome = state?.score?.home;
    const currentAway = state?.score?.away;

    if (typeof currentHome === "number") {
      if (homeScoreRef.current !== null && homeScoreRef.current !== currentHome) {
        setHomeScoreFlash(true);
        if (homeFlashTimeoutRef.current) {
          clearTimeout(homeFlashTimeoutRef.current);
        }
        homeFlashTimeoutRef.current = setTimeout(() => setHomeScoreFlash(false), 1400);
      }
      homeScoreRef.current = currentHome;
    }

    if (typeof currentAway === "number") {
      if (awayScoreRef.current !== null && awayScoreRef.current !== currentAway) {
        setAwayScoreFlash(true);
        if (awayFlashTimeoutRef.current) {
          clearTimeout(awayFlashTimeoutRef.current);
        }
        awayFlashTimeoutRef.current = setTimeout(() => setAwayScoreFlash(false), 1400);
      }
      awayScoreRef.current = currentAway;
    }

    return () => {
      if (homeFlashTimeoutRef.current) {
        clearTimeout(homeFlashTimeoutRef.current);
      }
      if (awayFlashTimeoutRef.current) {
        clearTimeout(awayFlashTimeoutRef.current);
      }
    };
  }, [state?.score?.home, state?.score?.away]);

  const lastPlayOddsShift = useMemo(() => {
    if (!lastShot) return null;
    const made = lastShot.shotResult?.toLowerCase().includes("made");
    const delta = made ? -20 : 25;
    return {
      label: made ? "Favorable Odds Movement" : "Odds Drifted",
      value: `${delta > 0 ? "+" : ""}${delta}`,
      made,
    };
  }, [lastShot]);

  const featuredBatterStats = useMemo(() => {
    const stats = state?.ballHandler?.liveStats;
    if (!stats) return null;
    const attempts = stats.fieldGoalsAttempted ?? 0;
    const made = stats.fieldGoalsMade ?? 0;
    const avg = attempts > 0 ? (made / attempts).toFixed(3).replace("0.", ".") : ".000";
    const hr = Math.max(0, Math.floor((stats.points ?? 0) / 4));
    const rbi = Math.max(0, stats.points ?? 0);
    const obp = attempts > 0 ? ((made + (stats.assists ?? 0) / 4) / attempts).toFixed(3).replace("0.", ".") : ".000";
    const ops = ((parseFloat(obp === ".000" ? "0" : obp) || 0) + (stats.threePointersMade ?? 0) / Math.max(1, stats.threePointersAttempted ?? 1)).toFixed(3);
    return { avg, hr, rbi, obp, ops };
  }, [state?.ballHandler?.liveStats]);

  const hotBatterStats = useMemo(() => {
    const stats = state?.shooter?.liveStats;
    if (!stats) return null;
    const attempts = stats.fieldGoalsAttempted ?? 0;
    const made = stats.fieldGoalsMade ?? 0;
    const avg = attempts > 0 ? (made / attempts).toFixed(3).replace("0.", ".") : ".000";
    const slug = attempts > 0 ? ((stats.points ?? 0) / attempts).toFixed(3) : "0.000";
    return {
      avg,
      hr: Math.max(0, Math.floor((stats.points ?? 0) / 4)),
      rbi: stats.points ?? 0,
      obp: avg,
      ops: (parseFloat(avg === ".000" ? "0" : avg) + parseFloat(slug)).toFixed(3),
    };
  }, [state?.shooter?.liveStats]);

  const showConfettiBurst = overlay === "score";
  const [showMoneyRain, setShowMoneyRain] = useState(false);

  const awayScoreClasses = awayScoreFlash
    ? "score-flash text-3xl font-semibold transition-all duration-300 text-blue-400"
    : "text-3xl font-semibold transition-all duration-300 text-blue-500";

  const homeScoreClasses = homeScoreFlash
    ? "score-flash text-3xl font-semibold transition-all duration-300 text-red-400"
    : "text-3xl font-semibold transition-all duration-300 text-red-500";

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
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center border border-emerald-500/40 bg-[#091a2d] shadow-[0_0_24px_rgba(28,255,176,0.35)]">
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5 text-emerald-300"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.6}
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M5 8.5c3 2.8 11 2.8 14 0" />
                      <path d="M8 5c1.5 1.3 6.5 1.3 8 0" />
                    </svg>
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-200">
                    MLB Betting Predictor
                  </div>
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-200/75 mlb-live-pulse">
                  Live Feed
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border border-[#1d2f46] bg-[#101d32] px-5 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-slate-300/70">
                    Inning Status
                  </div>
                  <div className="text-xl font-black uppercase tracking-[0.2em] text-white">
                    <span className="text-flash" key={inningNumber}>Inning {inningNumber}</span> • <span className="text-flash" key={inningHalf}>{inningHalf}</span>
                  </div>
                  <div className="text-xs text-purple-300/90 text-flash" key={situationalText}>{situationalText}</div>
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
                  onChange={(e) => setTestGameTimestamp(Number(e.target.value))}
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
                  Scrub through play-by-play to watch pitch detection and live odds
                  swings.
                </div>
              </div>
            )}

            {/* Scoreboard & Odds */}
            <div className="space-y-5 rounded-xl border-2 border-slate-700/50 bg-[#1a1d29] p-6 shadow-[0_0_20px_rgba(16,185,129,0.15),0_10px_40px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400">
                    <span className="text-flash" key={state?.score?.away}>Live Scoreboard</span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">Real-Time Updates • {currentTime}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-emerald-400">
                    <span className="text-flash" key={inningNumber}>Inning {inningNumber}</span>
                  </div>
                  <div className="text-[10px] text-purple-400">{inningHalf}</div>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-[#0f1419] p-5 border-l-4 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] font-medium uppercase tracking-widest text-slate-500" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      {state?.awayTeam ?? "Away Team"}
                    </div>
                    <div className="rounded bg-green-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-green-400 border border-green-500/20">
                      Away
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className={`${awayScoreClasses} text-5xl tabular-nums text-flash`} style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600 }} key={state?.score?.away}>
                      {state?.score?.away ?? 0}
                    </span>
                    <div className="text-right pb-1">
                      <div className="text-[9px] uppercase tracking-wider text-slate-500">Runs</div>
                      <div className="text-xs font-semibold text-green-300">{state?.score?.away ?? 0}</div>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-lg bg-[#0f1419] p-5 border-l-4 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] font-medium uppercase tracking-widest text-slate-500" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      {state?.homeTeam ?? "Home Team"}
                    </div>
                    <div className="rounded bg-purple-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-purple-400 border border-purple-500/20">
                      Home
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className={`${homeScoreClasses} text-5xl tabular-nums text-flash`} style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600 }} key={state?.score?.home}>
                      {state?.score?.home ?? 0}
                    </span>
                    <div className="text-right pb-1">
                      <div className="text-[9px] uppercase tracking-wider text-slate-500">Runs</div>
                      <div className="text-xs font-semibold text-purple-300">{state?.score?.home ?? 0}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between border-t border-slate-700/50 pt-3 text-[10px]">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-slate-500">Outs: </span>
                    <span className="font-semibold text-slate-300 text-flash" key={outsCount}>{outsCount}</span>
                  </div>
                  <div className="h-3 w-px bg-slate-700"></div>
                  <div>
                    <span className="text-slate-500">Situation: </span>
                    <span className="font-semibold text-emerald-400 text-flash" key={runnerSituations}>{runnerSituations}</span>
                  </div>
                </div>
                <div className="text-slate-500">
                  Score Differential: <span className="font-semibold text-slate-300 text-flash" key={(state?.score?.home ?? 0) - (state?.score?.away ?? 0)}>
                    {Math.abs((state?.score?.home ?? 0) - (state?.score?.away ?? 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Last Play Impact */}
            {lastShot && lastShot.playerName && (
              <div className="popup-flash border border-emerald-400/30 bg-[#0f192b] p-4 shadow-[0_28px_60px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                      Last Play Impact
                    </div>
                    <div className="mt-1 text-xl font-semibold text-white text-flash" key={lastShot.playerName}>
                      {mapToBaseballName(0)} ({lastShot.teamTricode ?? "NYY"})
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
                          <path d="M4 18h16M4 6h16M7 6l5 6-5 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {lastShot.shotType ?? "Deep Fly to Right"}
                    </span>
                      <span
                        className={`text-sm font-bold text-flash ${
                          lastShot.shotResult?.toLowerCase().includes("made")
                            ? "text-emerald-300"
                            : "text-purple-200"
                        }`}
                        key={lastShot.shotResult}
                      >
                        {lastShot.shotResult?.toLowerCase().includes("made")
                          ? "Scoring Play"
                          : "Out Recorded"}
                      </span>
                    </div>
                  </div>
                  {lastPlayOddsShift && (
                    <div className="border border-white/15 bg-[#101d35] px-4 py-3 text-right">
                      <div className="text-[11px] uppercase tracking-[0.35em] text-slate-400">
                        Odds Shift
                      </div>
                      <div
                        className={`mt-2 text-lg font-semibold text-flash ${
                          lastPlayOddsShift.made ? "text-emerald-200" : "text-purple-200"
                        }`}
                        key={lastPlayOddsShift.value}
                      >
                        {lastPlayOddsShift.value}
                      </div>
                      <div className="mt-1 text-xs text-slate-300">
                        {lastPlayOddsShift.label}
                      </div>
                    </div>
                  )}
                </div>
                {lastShot.description && (
                  <div className="mt-2 border border-white/10 bg-[#101a2d] px-3 py-2 text-xs text-slate-300/90">
                    Live note: {lastShot.description}
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
                        src={`https://nba-headshot-api.vercel.app/api/player/${encodeURIComponent(state.ballHandler.name)}`}
                        alt={state.ballHandler.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const parent = e.currentTarget.parentElement;
                          if (parent && state?.ballHandler?.name) {
                            e.currentTarget.style.display = 'none';
                            const initials = state.ballHandler.name
                              .split(' ')
                              .map(n => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2);
                            const fallback = document.createElement('div');
                            fallback.className = 'absolute inset-0 flex items-center justify-center text-2xl font-black text-emerald-300';
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
                      <span className="text-flash" key={state?.ballHandler?.name ?? "unknown"}>{mapToBaseballName(1)}</span>
                      <span className="rounded-md bg-blue-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-400 border border-blue-500/30">
                        {state?.ballHandler?.teamTricode ?? "LAD"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {featuredBatterStats ? (
              <div className="mt-4 grid grid-cols-5 gap-3 text-center text-xs uppercase tracking-[0.25em] text-slate-200">
                  {[
                    { label: "AVG", value: featuredBatterStats.avg, color: "text-sky-300", borderColor: "border-sky-400/40" },
                    { label: "HR", value: featuredBatterStats.hr, color: "text-orange-300", borderColor: "border-orange-400/40" },
                    { label: "RBI", value: featuredBatterStats.rbi, color: "text-rose-300", borderColor: "border-rose-400/40" },
                    { label: "OBP", value: featuredBatterStats.obp, color: "text-emerald-300", borderColor: "border-emerald-400/40" },
                    { label: "OPS", value: featuredBatterStats.ops, color: "text-purple-300", borderColor: "border-purple-400/40" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={`rounded border px-2 py-3 text-[11px] font-medium tracking-[0.35em] stat-flash ${stat.borderColor} ${stat.color}`}
                    >
                      <div>{stat.label}</div>
                      <div className="mt-2 text-lg font-black tracking-normal text-white text-flash" key={stat.value}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                  </div>
              ) : (
                <div className="mt-4 border border-white/10 bg-[#101d35] px-3 py-2 text-xs text-slate-300/80">
                  Tracking batter metrics…
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
                          src={`https://nba-headshot-api.vercel.app/api/player/${encodeURIComponent(state.shooter.name)}`}
                          alt={state.shooter.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const parent = e.currentTarget.parentElement;
                            if (parent && state?.shooter?.name) {
                              e.currentTarget.style.display = 'none';
                              const initials = state.shooter.name
                                .split(' ')
                                .map(n => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2);
                              const fallback = document.createElement('div');
                              fallback.className = 'absolute inset-0 flex items-center justify-center text-2xl font-black text-purple-300';
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
                        <span className="text-flash" key={state.shooter?.name ?? "unknown"}>{mapToBaseballName(2)}</span>
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
                {hotBatterStats ? (
                  <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs uppercase tracking-[0.25em] text-slate-300">
                    {[
                      { label: "AVG", value: hotBatterStats.avg, color: "text-amber-300", borderColor: "border-amber-400/40" },
                      { label: "HR", value: hotBatterStats.hr, color: "text-pink-300", borderColor: "border-pink-400/40" },
                      { label: "RBI", value: hotBatterStats.rbi, color: "text-cyan-300", borderColor: "border-cyan-400/40" },
                      { label: "OBP", value: hotBatterStats.obp, color: "text-lime-300", borderColor: "border-lime-400/40" },
                      { label: "OPS", value: hotBatterStats.ops, color: "text-violet-300", borderColor: "border-violet-400/40" },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className={`rounded border px-2 py-3 text-[11px] font-medium tracking-[0.35em] stat-flash ${stat.borderColor} ${stat.color}`}
                      >
                        <div>{stat.label}</div>
                        <div className="mt-1 text-lg font-black tracking-normal text-white text-flash" key={stat.value}>
                          {stat.value}
                        </div>
                      </div>
                    ))}
                </div>
                ) : (
                  <div className="mt-4 border border-white/10 bg-[#131f35] px-3 py-2 text-xs text-slate-400">
                    Tracking swing metrics…
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
          <div className="relative border border-[#1d2f46] bg-[#071021]/95 p-6 shadow-[0_50px_120px_rgba(0,0,0,0.68)]">
            <WebcamGestureDetector
              debug
              extraContent={
                <div className="flex w-full flex-col gap-4">
                  <div className="flex justify-center">
                    <div className="flex w-full max-w-3xl flex-wrap items-stretch justify-center gap-2 sm:gap-3">
                  {activeLabels.map((label) => {
                    const points = pointsByPlayer[label] ?? 0;
                    const digitCount = points.toLocaleString().length;
                    const playerCount = activeLabels.length;

                    // Determine if this player is winning/losing for color coding
                    const allPoints = activeLabels.map(l => pointsByPlayer[l] ?? 0);
                    const maxPoints = Math.max(...allPoints);
                    const minPoints = Math.min(...allPoints);
                    const isWinning = points === maxPoints && maxPoints !== minPoints;
                    const isLosing = points === minPoints && maxPoints !== minPoints;

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
                        return playerPointsDisplay[label].points > 0 ? "#49e6b5" : "#a855f7";
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
                          {label}
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
                              ? ["brightness(1)", "brightness(1.8)", "brightness(1)"]
                              : "brightness(1)",
                          }}
                              transition={{ duration: 0.5 }}
                        >
                          {points.toLocaleString()}
                        </motion.div>
                      </motion.div>
                    );
                  })}
                    </div>
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
                          winAudioRef.current.play().catch(err => {
                            console.log('Audio test failed:', err);
                          });
                        }
                      }}
                      className="mt-4 w-full shimmer border border-purple-400/40 bg-purple-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-purple-100 transition hover:bg-purple-500/35 hover:scale-105"
                    >
                      Test Win Sound
                    </button>
                  </div>
                </div>
              }
              onActiveLabelsChange={(labels) => setActiveLabels(labels)}
              onShootGesture={(label) =>
                registerPrediction(label as PlayerLabel, {
                  ts: Date.now(),
                  period: state?.period,
                  clock: state?.clock,
                })
              }
            />
            {overlay && (
              <ScoreAnimation
                mode={overlay}
                activeLabels={activeLabels}
                lanePoints={lanePoints}
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
      {(lastAction || recentActions.length > 0) && (
        <div className="fixed bottom-6 left-6 z-40 hidden max-w-3xl flex-col gap-3 md:flex">
          {[...recentActions.slice(0, 2), ...(lastAction ? [lastAction] : [])].slice(0, 3).map((act, idx) => (
            <div
              key={idx}
              className="popup-flash relative overflow-hidden rounded-lg border-2 border-emerald-400/40 bg-gradient-to-br from-[#0f192b] to-[#1a1d29] px-8 py-4 text-base text-slate-100 shadow-[0_0_30px_rgba(16,185,129,0.3),0_20px_60px_rgba(0,0,0,0.7)]"
              style={{
                animation: 'popupFlash 0.6s ease-out, glowPulse 2s ease-in-out infinite, popupFadeOut 5s ease-in forwards'
              }}
            >
              {showConfettiBurst && (
                <div className="mlb-confetti">
                  {Array.from({ length: 12 }).map((_, cIdx) => (
                    <span
                      key={cIdx}
                      style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 1.2}s`,
                      }}
                    />
                  ))}
                </div>
              )}
              <div className="text-center">
                <div className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  {idx === 1 && lastAction ? "INSTANT RESULT" : "LIVE UPDATE"}
                </div>
              </div>
              <div className="mt-3 text-base font-semibold text-white">
                {mapToBaseballName(idx + 2)} ({act.teamTricode ?? "NYY"})
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
          },
          {
            label: "Right Player",
            points: playerPointsDisplay["Right Player"].points,
            show: playerPointsDisplay["Right Player"].show,
          },
          {
            label: "Center Player",
            points: playerPointsDisplay["Center Player"].points,
            show: playerPointsDisplay["Center Player"].show,
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
