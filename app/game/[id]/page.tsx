"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { ParsedGameState } from "@/components/types";
import WebcamGestureDetector from "@/components/WebcamGestureDetector";
import ScoreAnimation from "@/components/ScoreAnimation";
import ShotIncomingOverlay from "@/components/ShotIncomingOverlay";
import ShotResultOverlay from "@/components/ShotResultOverlay";
import PointsEarnedOverlay from "@/components/PointsEarnedOverlay";

export default function GameViewPage() {
  const PLAYER_LABELS = [
    "Left Player",
    "Right Player",
    "Center Player",
  ] as const;
  type PlayerLabel = (typeof PLAYER_LABELS)[number];
  const LABEL_COLORS: Record<PlayerLabel, string> = {
    "Left Player": "#3b82f6",
    "Right Player": "#f97316",
    "Center Player": "#10b981",
  };
  const POINT_DELTA = 10000;
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [state, setState] = useState<ParsedGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pointsByPlayer, setPointsByPlayer] = useState<
    Record<PlayerLabel, number>
  >({
    "Left Player": 0,
    "Right Player": 0,
    "Center Player": 0,
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
  const debugWindowRef = useRef<Window | null>(null);
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
						<div class="label">Period ${liveState.period ?? "-"} • ${
          liveState.clock ?? "--:--"
        }</div>
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
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="glass rounded-xl p-4 space-y-4">
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
              <div className="text-orange-400 font-semibold">
                Update #{delayedUpdateCount} (-{streamDelay}s delay)
              </div>
            </div>
            <button
              onClick={openDebugWindow}
              className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors font-semibold"
            >
              Open Live Debug
            </button>
            <div className="space-y-1 text-right">
              <div className="text-green-400 font-mono">
                Live: Update #{liveUpdateCount}
              </div>
              <div className="text-xs opacity-60">
                Queue: {stateQueueRef.current.length} states
              </div>
            </div>
          </div>
        </div>

        {/* Debug: Always show for testing */}
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-2 mb-2 text-xs">
          DEBUG: id="{id}" | isTestGame={isTestGame ? "TRUE" : "FALSE"}
        </div>

        {/* Test Game Timeline Control */}
        {isTestGame && (
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-blue-400 font-semibold">
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
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="text-xs text-blue-300 mt-2">
              Scrub through test game actions to see shot detection and
              predictions
            </div>
          </div>
        )}

        {/* Stream Delay Slider */}
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs opacity-70">Stream Delay (seconds)</span>
            <span className="text-sm font-bold">{streamDelay}s</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={streamDelay}
            onChange={(e) => setStreamDelay(Number(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
          <div className="text-xs opacity-60 mt-1">
            Popup appears {Math.max(0, streamDelay - 3)}s before shot on your
            stream
          </div>
        </div>

        {/* Live Score */}
        <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
          <div>
            <div className="text-xs opacity-60">
              {state?.awayTeam ?? "Away"}
            </div>
            <div className="text-3xl font-bold">{state?.score?.away ?? 0}</div>
          </div>
          <div className="text-xs opacity-70">LIVE</div>
          <div className="text-right">
            <div className="text-xs opacity-60">
              {state?.homeTeam ?? "Home"}
            </div>
            <div className="text-3xl font-bold">{state?.score?.home ?? 0}</div>
          </div>
        </div>

        {/* Last Shot Taken */}
        {lastShot && lastShot.playerName && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-3 border border-yellow-500/30">
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
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {lastShot.shotResult || "Unknown"}
              </span>
              {lastShot.shotType && (
                <span className="text-xs opacity-70">{lastShot.shotType}</span>
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
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-3">
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
                <span className="font-bold text-lg">
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
                    {state.ballHandler.liveStats.threePointersAttempted ?? 0}
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
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg p-3">
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
                            state.shooter.liveStats.threePointersAttempted) *
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
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs opacity-70 mb-1">Last Action</div>
            <div className="text-sm">
              <span className="font-semibold">
                {lastAction.playerName ?? "Unknown"}
              </span>
              {lastAction.teamTricode && (
                <span className="opacity-75"> ({lastAction.teamTricode})</span>
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
                <div key={i} className="text-xs bg-white/5 rounded px-2 py-1">
                  <span className="font-semibold">{act.playerName ?? "?"}</span>
                  {act.teamTricode && (
                    <span className="opacity-60"> ({act.teamTricode})</span>
                  )}
                  {act.actionType && (
                    <span className="ml-1 opacity-75">— {act.actionType}</span>
                  )}
                  {act.shotResult && (
                    <span className="ml-1 font-semibold">{act.shotResult}</span>
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
                    <td className="text-right font-mono text-xs">{p.fgPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Webcam + Gesture Detector */}
      <div className="relative glass rounded-xl p-3">
        <WebcamGestureDetector
          debug
          extraContent={
            <div className="flex flex-wrap items-stretch justify-center gap-4">
              {activeLabels.map((label) => (
                <div
                  key={label}
                  className="flex flex-col items-center justify-center rounded-xl bg-slate-900/70 border border-white/10 px-4 py-3 min-w-[140px]"
                >
                  <div
                    className="text-[10px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: LABEL_COLORS[label] }}
                  >
                    {label}
                  </div>
                  <div className="text-6xl md:text-7xl lg:text-8xl font-extrabold text-white leading-none">
                    {pointsByPlayer[label] ?? 0}
                  </div>
                </div>
              ))}
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
          <div className="absolute bottom-3 left-3 right-3 text-xs text-red-400 bg-black/50 p-2 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Shot Incoming Overlay */}
      <ShotIncomingOverlay show={showShotIncoming} countdown={shotCountdown} />

      {/* Shot Result Overlay */}
      <ShotResultOverlay show={showShotResult} shotData={currentShotData} />

      {/* Points Earned Overlay */}
      <PointsEarnedOverlay
        show={showPointsEarned}
        points={pointsEarned}
        label={pointsEarnedLabel ?? undefined}
      />
    </div>
  );
}
