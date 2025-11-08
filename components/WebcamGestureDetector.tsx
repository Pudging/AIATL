"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as posedetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";
import {
  analyzeMotionWithGemini,
  movenetPoseToFrame,
  type PoseFrame,
} from "@/lib/gemini";

const PLAYER_LABELS = ["Left Player", "Right Player", "Center Player"] as const;
type PlayerLabel = (typeof PLAYER_LABELS)[number];
const PLAYER_LAYOUTS: Record<1 | 2 | 3, PlayerLabel[]> = {
  1: ["Center Player"],
  2: ["Left Player", "Right Player"],
  3: ["Left Player", "Center Player", "Right Player"],
};

export type ShotType = "dunk" | "layup" | "normal" | null;

type DebugInfo = {
  elbowsUp: boolean;
  wristsUp: boolean;
  velocity: number;
  decision: boolean;
  shotType: ShotType;
};

type GeminiAnalysis = {
  classification: string;
  confidence: number;
  description: string;
  suggestedShotType?: "normal" | "dunk" | "layup";
  timestamp: number;
};

const PLAYER_COLORS: Record<PlayerLabel, string> = {
  "Left Player": "rgba(59, 130, 246, 0.9)",
  "Right Player": "rgba(249, 115, 22, 0.9)",
  "Center Player": "rgba(16, 185, 129, 0.9)",
};
const PLAYER_ACCENT_COLORS: Record<PlayerLabel, string> = {
  "Left Player": "#3b82f6",
  "Right Player": "#f97316",
  "Center Player": "#10b981",
};

function createPlayerMap<T>(initializer: (label: PlayerLabel) => T) {
  return PLAYER_LABELS.reduce((acc, label) => {
    acc[label] = initializer(label);
    return acc;
  }, {} as Record<PlayerLabel, T>);
}

type Props = {
  onShootGesture?: (player?: PlayerLabel, shotType?: ShotType) => void;
  debug?: boolean;
  extraContent?: ReactNode;
  onActiveLabelsChange?: (labels: PlayerLabel[]) => void;
  lanePoints?: Record<PlayerLabel, number | null>;
  displayNames?: Partial<Record<PlayerLabel, string>>;
  activeLabelsOverride?: PlayerLabel[];
  hideReadyBanner?: boolean;
  onReadyChange?: (ready: boolean) => void;
};

export default function WebcamGestureDetector({
  onShootGesture,
  debug = true,
  extraContent,
  onActiveLabelsChange,
  lanePoints,
  displayNames,
  activeLabelsOverride,
  hideReadyBanner,
  onReadyChange,
}: Props) {
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<posedetection.PoseDetector | null>(null);
  const lastDetectionsRef = useRef<posedetection.Pose[]>([]);
  const lastPlayerPosesRef = useRef<
    Record<PlayerLabel, posedetection.Pose | null>
  >(createPlayerMap(() => null));
  const lastInferTsRef = useRef<number>(0);
  const debugInfoRef = useRef<Record<PlayerLabel, DebugInfo>>(
    createPlayerMap(() => ({
      elbowsUp: false,
      wristsUp: false,
      velocity: 0,
      decision: false,
      shotType: null,
    }))
  );
  const gestureCooldownsRef = useRef<Record<PlayerLabel, number>>(
    createPlayerMap(() => 0)
  );

  // Gesture state tracking for improved detection
  const gestureStateRef = useRef<
    Record<
      PlayerLabel,
      {
        armsUpFrames: number; // How many frames arms have been up
        lastWristPositions: {
          left: { x: number; y: number } | null;
          right: { x: number; y: number } | null;
        };
        wristFlickDetected: boolean;
        flickFrame: number; // Frame when flick was detected
      }
    >
  >(
    createPlayerMap(() => ({
      armsUpFrames: 0,
      lastWristPositions: { left: null, right: null },
      wristFlickDetected: false,
      flickFrame: 0,
    }))
  );

  // Gesture history for majority voting (last 1-2 seconds)
  const gestureHistoryRef = useRef<
    Record<
      PlayerLabel,
      Array<{
        shotType: ShotType;
        timestamp: number;
      }>
    >
  >(createPlayerMap(() => []));

  // Gemini analysis state
  const [geminiAnalysis, setGeminiAnalysis] = useState<GeminiAnalysis | null>(
    null
  );
  const useGemini = false; // Feature flag - always disabled for now
  const poseFrameBufferRef = useRef<PoseFrame[]>([]); // Buffer for collecting frames
  const eventsRef = useRef<
    { ts: number; label: string; player: PlayerLabel | null }[]
  >([]);
  const noPoseFramesRef = useRef<number>(0);
  const currentModelRef = useRef<
    "SINGLE_LIGHTNING" | "SINGLE_THUNDER" | "MULTI_LIGHTNING"
  >("MULTI_LIGHTNING");
  const minPartScoreRef = useRef<number>(0.2);
  const [ready, setReady] = useState(false);
  const [playerCount, setPlayerCount] = useState<1 | 2 | 3>(2);
  const [shotActive, setShotActive] = useState<Record<PlayerLabel, boolean>>(
    () => createPlayerMap(() => false)
  );
  const shotTimeoutsRef = useRef<Record<PlayerLabel, number>>(
    createPlayerMap(() => 0)
  );
  const [currentShotTypes, setCurrentShotTypes] = useState<
    Record<PlayerLabel, ShotType>
  >(createPlayerMap(() => null));
  const activeLabels = useMemo<PlayerLabel[]>(
    () =>
      activeLabelsOverride && activeLabelsOverride.length > 0
        ? (activeLabelsOverride as PlayerLabel[])
        : PLAYER_LAYOUTS[playerCount],
    [activeLabelsOverride, playerCount]
  );

  const assignVideoRef = (index: number) => (node: HTMLVideoElement | null) => {
    videoRefs.current[index] = node;
    const stream = streamRef.current;
    if (node && stream && node.srcObject !== stream) {
      node.srcObject = stream;
      node.onloadedmetadata = () => {
        node.play().catch(() => {});
        if (index === 0) setReady(true);
      };
    }
  };

  const assignCanvasRef =
    (index: number) => (node: HTMLCanvasElement | null) => {
      canvasRefs.current[index] = node;
    };

  // Adjacency list for skeleton lines (MoveNet keypoint names)
  const SKELETON_PAIRS: [string, string][] = [
    ["left_ankle", "left_knee"],
    ["left_knee", "left_hip"],
    ["right_ankle", "right_knee"],
    ["right_knee", "right_hip"],
    ["left_hip", "right_hip"],
    ["left_shoulder", "left_hip"],
    ["right_shoulder", "right_hip"],
    ["left_shoulder", "right_shoulder"],
    ["left_elbow", "left_shoulder"],
    ["right_elbow", "right_shoulder"],
    ["left_wrist", "left_elbow"],
    ["right_wrist", "right_elbow"],
    ["left_eye", "right_eye"],
    ["nose", "left_eye"],
    ["nose", "right_eye"],
  ];

  async function setDetector(
    model: "SINGLE_LIGHTNING" | "SINGLE_THUNDER" | "MULTI_LIGHTNING"
  ) {
    if (currentModelRef.current === model && detectorRef.current) return;
    currentModelRef.current = model;
    // Dispose previous if supported
    try {
      (detectorRef.current as any)?.dispose?.();
    } catch {}
    const cfg: posedetection.MoveNetModelConfig = {
      modelType:
        model === "SINGLE_THUNDER"
          ? (posedetection.movenet as any).modelType.SINGLEPOSE_THUNDER
          : model === "MULTI_LIGHTNING"
          ? (posedetection.movenet as any).modelType.MULTIPOSE_LIGHTNING
          : (posedetection.movenet as any).modelType.SINGLEPOSE_LIGHTNING,
    };
    detectorRef.current = await posedetection.createDetector(
      posedetection.SupportedModels.MoveNet,
      cfg
    );
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      await tf.setBackend("webgl");
      await tf.ready();
      onReadyChange?.(false);
      await setDetector("MULTI_LIGHTNING");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      if (cancelled) return;
      streamRef.current = stream;
      videoRefs.current.forEach((video, index) => {
        if (!video) return;
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play().catch(() => {});
          if (index === 0) setReady(true);
        };
      });
      onReadyChange?.(true);
    }
    init();
    return () => {
      cancelled = true;
      try {
        const tracks = streamRef.current?.getTracks?.() ?? [];
        tracks.forEach((t) => t.stop());
      } catch {}
      streamRef.current = null;
      detectorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    return () => {
      PLAYER_LABELS.forEach((label) => {
        const timeoutId = shotTimeoutsRef.current[label];
        if (timeoutId) {
          window.clearTimeout(timeoutId);
          shotTimeoutsRef.current[label] = 0;
        }
      });
    };
  }, []);

  const showShotIndicator = useCallback(
    (label: PlayerLabel) => {
      if (typeof window === "undefined" || !activeLabels.includes(label)) {
        return;
      }
      setShotActive((prev) => {
        if (prev[label]) return prev;
        return { ...prev, [label]: true };
      });
      const prevTimeout = shotTimeoutsRef.current[label];
      if (prevTimeout) window.clearTimeout(prevTimeout);
      const timeoutId = window.setTimeout(() => {
        setShotActive((prev) => {
          if (!prev[label]) return prev;
          return { ...prev, [label]: false };
        });
        shotTimeoutsRef.current[label] = 0;
      }, 250);
      shotTimeoutsRef.current[label] = timeoutId;
    },
    [activeLabels]
  );

  type PlayerAssignment = {
    label: PlayerLabel;
    pose: posedetection.Pose | null;
    color: string;
  };

  const getPoseCenterX = (pose?: posedetection.Pose | null) => {
    if (!pose) return Number.POSITIVE_INFINITY;
    const valid = pose.keypoints.filter((kp) => typeof kp.x === "number");
    if (!valid.length) return Number.POSITIVE_INFINITY;
    return valid.reduce((sum, kp) => sum + (kp.x ?? 0), 0) / valid.length;
  };

  const buildAssignments = useCallback(
    (poses: posedetection.Pose[]): PlayerAssignment[] => {
      const sorted = poses
        .slice()
        .sort((a, b) => getPoseCenterX(a) - getPoseCenterX(b));
      const videoWidth = videoRefs.current[0]?.videoWidth || 640;
      const fallbackTargets = activeLabels.reduce((acc, label, index) => {
        const ratio =
          activeLabels.length === 1
            ? 0.5
            : (index + 1) / (activeLabels.length + 1);
        acc[label] = videoWidth * ratio;
        return acc;
      }, {} as Record<PlayerLabel, number>);
      const prevCenters = createPlayerMap((label) =>
        getPoseCenterX(lastPlayerPosesRef.current[label])
      );
      const assignmentsByLabel = createPlayerMap<posedetection.Pose | null>(
        () => null
      );
      const remaining = new Set<PlayerLabel>(activeLabels);

      for (const pose of sorted) {
        const center = getPoseCenterX(pose);
        let bestLabel: PlayerLabel | null = null;
        let bestDistance = Number.POSITIVE_INFINITY;
        remaining.forEach((label) => {
          const prevCenter = prevCenters[label];
          const target = Number.isFinite(prevCenter)
            ? prevCenter
            : fallbackTargets[label] ?? videoWidth / 2;
          const distance = Math.abs(center - target);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestLabel = label;
          }
        });
        if (!bestLabel) break;
        assignmentsByLabel[bestLabel as PlayerLabel] = pose;
        remaining.delete(bestLabel as PlayerLabel);
      }

      return activeLabels.map((label) => ({
        label,
        pose: assignmentsByLabel[label],
        color: PLAYER_COLORS[label],
      }));
    },
    [activeLabels]
  );

  const draw = useCallback(
    (
      assignments: PlayerAssignment[],
      contexts: CanvasRenderingContext2D[],
      prevPlayerPoses: Record<PlayerLabel, posedetection.Pose | null>
    ) => {
      if (!contexts.length) return;

      const keypointMap = (pose?: posedetection.Pose | null) => {
        const map: Record<string, posedetection.Keypoint> = {};
        (pose?.keypoints ?? []).forEach((kp: posedetection.Keypoint) => {
          if ((kp?.score ?? 0) >= minPartScoreRef.current && kp.name) {
            map[kp.name] = kp;
          }
        });
        return map;
      };
      const velocityNames = [
        "left_wrist",
        "right_wrist",
        "left_elbow",
        "right_elbow",
      ];

      contexts.forEach((ctx) => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.save();
        ctx.lineWidth = 2;

        assignments.forEach(({ label, pose, color }) => {
          if (pose) {
            const byName = keypointMap(pose);
            ctx.strokeStyle = color;
            for (const [a, b] of SKELETON_PAIRS) {
              const ka = byName[a];
              const kb = byName[b];
              if (!ka || !kb) continue;
              ctx.beginPath();
              ctx.moveTo(ka.x, ka.y);
              ctx.lineTo(kb.x, kb.y);
              ctx.stroke();
            }

            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            for (const kp of pose.keypoints) {
              if ((kp.score ?? 0) < minPartScoreRef.current) continue;
              ctx.beginPath();
              ctx.arc(kp.x, kp.y, 3, 0, Math.PI * 2);
              ctx.fill();
            }

            const prevPose = prevPlayerPoses[label];
            const prevByName = keypointMap(prevPose);
            ctx.strokeStyle = "rgba(244, 63, 94, 0.85)";
            for (const n of velocityNames) {
              const current = byName[n];
              const prev = prevByName[n];
              if (!current || !prev) continue;
              ctx.beginPath();
              ctx.moveTo(prev.x, prev.y);
              ctx.lineTo(current.x, current.y);
              ctx.stroke();
            }
          } else {
            const pad = 14;
            const isLeft = label === "Left Player";
            const msg = `${label}: No pose`;
            ctx.save();
            ctx.font = "14px ui-sans-serif, system-ui, -apple-system";
            ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
            const textWidth = ctx.measureText(msg).width + pad * 2;
            const x = isLeft ? pad : ctx.canvas.width - textWidth - pad;
            ctx.fillRect(x, pad, textWidth, 30);
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.textAlign = isLeft ? "left" : "right";
            const textX = isLeft ? x + pad : x + textWidth - pad;
            ctx.fillText(msg, textX, pad + 20);
            ctx.restore();
          }
        });

        ctx.restore();
      });
    },
    []
  );

  function resetDebugInfo(label: PlayerLabel) {
    debugInfoRef.current[label] = {
      elbowsUp: false,
      wristsUp: false,
      velocity: 0,
      decision: false,
      shotType: null,
    };
    resetGestureState(label);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShotActive((prev) => {
      const next = { ...prev };
      PLAYER_LABELS.forEach((label) => {
        if (!activeLabels.includes(label)) {
          next[label] = false;
        }
      });
      return next;
    });
    PLAYER_LABELS.forEach((label) => {
      if (!activeLabels.includes(label)) {
        const timeoutId = shotTimeoutsRef.current[label];
        if (timeoutId) {
          window.clearTimeout(timeoutId);
          shotTimeoutsRef.current[label] = 0;
        }
        lastPlayerPosesRef.current[label] = null;
        resetDebugInfo(label);
      }
    });
  }, [activeLabels]);

  useEffect(() => {
    onActiveLabelsChange?.(activeLabels);
  }, [activeLabels, onActiveLabelsChange]);

  function isShootingGesture(
    pose: posedetection.Pose | null,
    prevPose: posedetection.Pose | null | undefined,
    playerLabel: PlayerLabel
  ): boolean {
    if (!pose) {
      resetDebugInfo(playerLabel);
      resetGestureState(playerLabel);
      return false;
    }
    const byName = (p?: posedetection.Pose) => {
      const map: Record<string, posedetection.Keypoint> = {};
      (p?.keypoints ?? []).forEach((k: posedetection.Keypoint) => {
        if (k?.name as string | undefined) {
          map[k.name as string] = k;
        }
      });
      return map;
    };
    const k = byName(pose);
    // LOWERED: More lenient confidence threshold (0.25 instead of 0.3) for poor pose detection
    const kp = (name: string) =>
      k[name] && (k[name].score ?? 0) > 0.25 ? k[name] : undefined;
    const ls = kp("left_shoulder"),
      rs = kp("right_shoulder");
    const le = kp("left_elbow"),
      re = kp("right_elbow");
    const lw = kp("left_wrist"),
      rw = kp("right_wrist");
    const nose = kp("nose");

    // MORE LENIENT: Only require shoulders, allow missing elbows/wrists if we have at least one
    if (!ls || !rs) {
      resetDebugInfo(playerLabel);
      return false;
    }

    // If we have NO elbows or wrists, can't detect shot
    if ((!le && !re) || (!lw && !rw)) {
      resetDebugInfo(playerLabel);
      return false;
    }

    // MORE LENIENT: Check if arms are up (allow detection with just one good arm)
    const headLevel = nose ? nose.y : Math.min(ls.y, rs.y) - 25; // Use nose or estimate head position

    // Check each arm independently (more forgiving of poor detection)
    const leftElbowUp = le ? le.y < headLevel || le.y < ls.y - 10 : false;
    const rightElbowUp = re ? re.y < headLevel || re.y < rs.y - 10 : false;
    const leftWristUp = lw ? lw.y < headLevel || lw.y < ls.y - 10 : false;
    const rightWristUp = rw ? rw.y < headLevel || rw.y < rs.y - 10 : false;

    // At least one arm should be up (more lenient)
    const elbowsUp = leftElbowUp || rightElbowUp;
    const wristsUp = leftWristUp || rightWristUp;

    // Both arms up if we have both (ideal case)
    const bothElbowsUp = leftElbowUp && rightElbowUp;
    const bothWristsUp = leftWristUp && rightWristUp;

    // Check for dunk gesture (hand on head) - but only if NOT in normal shot position
    // Prevent normal shots from being detected as dunks
    const isDunkGesture =
      detectDunkGesture(lw, rw, nose) && !(bothElbowsUp && bothWristsUp); // Don't detect dunk if both arms are clearly up (normal shot)

    // Check for layup gesture (one arm up)
    const isLayupGesture = detectLayupGesture(lw, rw, le, re, ls, rs);

    // MORE LENIENT: Wrists level check - only if we have both wrists
    const wristsLevel = lw && rw ? Math.abs(lw.y - rw.y) < 100 : true; // More lenient tolerance, default true if missing

    // MORE LENIENT: Arms extended check - only if we have the keypoints
    const leftArmExtended = le && lw ? le.y < lw.y : true; // Default true if missing
    const rightArmExtended = re && rw ? re.y < rw.y : true; // Default true if missing
    const armsExtended = leftArmExtended || rightArmExtended; // At least one extended

    // MORE LENIENT: Track gesture state over time (reduced requirement)
    const gestureState = gestureStateRef.current[playerLabel];
    const armsUpNow = elbowsUp && wristsUp; // Simplified - just need arms up

    if (armsUpNow) {
      gestureState.armsUpFrames++;
    } else {
      gestureState.armsUpFrames = 0;
      gestureState.wristFlickDetected = false;
    }

    // MORE LENIENT: Detect wrist flick (lower thresholds for poor pose detection)
    let wristFlickDetected = false;
    if (armsUpNow && prevPose && (lw || rw)) {
      // Only need one wrist
      const prevK = byName(prevPose);
      const prevLw = prevK["left_wrist"];
      const prevRw = prevK["right_wrist"];

      // Check left wrist if available
      if (lw && prevLw) {
        const leftForward = lw.x - prevLw.x;
        const leftUpward = prevLw.y - lw.y;
        // MUCH LOWER thresholds
        const leftFlick = leftForward > 0.01 || leftUpward > 0.005;
        if (leftFlick) wristFlickDetected = true;
      }

      // Check right wrist if available
      if (rw && prevRw) {
        const rightForward = prevRw.x - rw.x;
        const rightUpward = prevRw.y - rw.y;
        // MUCH LOWER thresholds
        const rightFlick = rightForward > 0.01 || rightUpward > 0.005;
        if (rightFlick) wristFlickDetected = true;
      }

      if (wristFlickDetected && !gestureState.wristFlickDetected) {
        gestureState.wristFlickDetected = true;
        gestureState.flickFrame = gestureState.armsUpFrames;
      }
    }

    // Determine shot type (more lenient)
    let shotType: ShotType = null;
    if (isDunkGesture) {
      shotType = "dunk";
    } else if (isLayupGesture) {
      shotType = "layup";
    } else if (armsUpNow) {
      // Simplified - just need arms up
      shotType = "normal";
    }

    // REMOVED: Temporal requirement - allow instant detection for quick shots
    // If no shot type detected, return early
    if (!shotType) {
      debugInfoRef.current[playerLabel] = {
        elbowsUp,
        wristsUp,
        velocity: 0,
        decision: false,
        shotType: null,
      };
      return false;
    }
    if (!prevPose) {
      debugInfoRef.current[playerLabel] = {
        elbowsUp,
        wristsUp,
        velocity: 0,
        decision: false,
        shotType,
      };
      return false;
    }
    const prev = byName(prevPose);
    const prevRw = prev["right_wrist"];
    const prevLw = prev["left_wrist"];

    // Convert to velocity per second using last inference delta
    const dtMs = Math.max(
      16,
      performance.now() - (lastInferTsRef.current || performance.now())
    );
    const vRight =
      rw && prevRw
        ? Math.hypot(rw.x - prevRw.x, rw.y - prevRw.y) * (1000 / dtMs)
        : 0;
    const vLeft =
      lw && prevLw
        ? Math.hypot(lw.x - prevLw.x, lw.y - prevLw.y) * (1000 / dtMs)
        : 0;
    let velocity = Math.max(vRight, vLeft);

    // Directional component: forward along shoulder->wrist
    const rightForward =
      rs && rw
        ? (() => {
            const dir = { x: rw.x - rs.x, y: rw.y - rs.y };
            const len = Math.hypot(dir.x, dir.y) || 1;
            const prevVec =
              prevRw && rs
                ? { x: rw.x - prevRw.x, y: rw.y - prevRw.y }
                : { x: 0, y: 0 };
            return (dir.x / len) * prevVec.x + (dir.y / len) * prevVec.y;
          })()
        : 0;
    const leftForward =
      ls && lw
        ? (() => {
            const dir = { x: lw.x - ls.x, y: lw.y - ls.y };
            const len = Math.hypot(dir.x, dir.y) || 1;
            const prevVec =
              prevLw && ls
                ? { x: lw.x - prevLw.x, y: lw.y - prevLw.y }
                : { x: 0, y: 0 };
            return (dir.x / len) * prevVec.x + (dir.y / len) * prevVec.y;
          })()
        : 0;
    const forwardComponent =
      Math.max(rightForward, leftForward) * (1000 / dtMs);

    // MUCH MORE LENIENT: Very low velocity threshold or make it optional
    const canvas = canvasRefs.current[0];
    const diag = canvas ? Math.hypot(canvas.width, canvas.height) : 1000;
    const pxPerSecThreshold = diag * 0.02; // MUCH lower threshold (2% of diagonal per second)
    const flickWindow = 10; // Longer window for flick detection

    // MUCH MORE LENIENT: For dunk and layup, don't require velocity
    let decision = false;
    if (isDunkGesture || isLayupGesture) {
      decision = true;
    } else {
      // MUCH MORE LENIENT: Normal shot requires:
      // 1. Arms up (at least one arm)
      // 2. EITHER wrist flick detected OR any velocity OR just arms up (very lenient)
      const flickRecent =
        gestureState.wristFlickDetected &&
        gestureState.armsUpFrames - gestureState.flickFrame <= flickWindow;

      // MUCH MORE LENIENT: Very low velocity threshold or just any movement
      const hasVelocity =
        velocity > pxPerSecThreshold * 0.5 ||
        forwardComponent > pxPerSecThreshold * 0.3 ||
        velocity > 0; // Any movement at all

      // Decision: arms up AND (flick OR velocity OR just arms up for quick shots)
      decision =
        armsUpNow &&
        (wristFlickDetected ||
          flickRecent ||
          hasVelocity ||
          gestureState.armsUpFrames >= 1);
    }

    debugInfoRef.current[playerLabel] = {
      elbowsUp,
      wristsUp,
      velocity,
      decision,
      shotType,
    };

    // Update last wrist positions for next frame (handle missing wrists)
    if (lw) {
      gestureState.lastWristPositions.left = { x: lw.x, y: lw.y };
    }
    if (rw) {
      gestureState.lastWristPositions.right = { x: rw.x, y: rw.y };
    }

    return decision;
  }

  function resetGestureState(label: PlayerLabel) {
    gestureStateRef.current[label] = {
      armsUpFrames: 0,
      lastWristPositions: { left: null, right: null },
      wristFlickDetected: false,
      flickFrame: 0,
    };
    // Clear gesture history when resetting
    gestureHistoryRef.current[label] = [];
  }

  // Get majority gesture type from recent history (last 1.5 seconds)
  function getMajorityGesture(
    label: PlayerLabel,
    windowMs: number = 1500
  ): ShotType | null {
    const history = gestureHistoryRef.current[label];
    const now = Date.now();

    // Filter to recent entries (last 1.5 seconds)
    const recent = history.filter((entry) => now - entry.timestamp < windowMs);

    if (recent.length === 0) return null;

    // Count occurrences of each shot type
    const counts: Record<string, number> = {};
    recent.forEach((entry) => {
      const key = entry.shotType || "null";
      counts[key] = (counts[key] || 0) + 1;
    });

    // Find the most common shot type
    let maxCount = 0;
    let majorityType: ShotType | null = null;

    Object.entries(counts).forEach(([type, count]) => {
      if (count > maxCount && type !== "null") {
        maxCount = count;
        majorityType = type as ShotType;
      }
    });

    // Require at least 30% of recent frames to agree (prevents false positives)
    const threshold = Math.max(1, Math.floor(recent.length * 0.3));
    return maxCount >= threshold ? majorityType : null;
  }

  // STRICTER: Helper function to detect dunk gesture (hand DIRECTLY on head)
  function detectDunkGesture(
    lw: posedetection.Keypoint | undefined,
    rw: posedetection.Keypoint | undefined,
    nose: posedetection.Keypoint | undefined
  ): boolean {
    if (!nose) return false;

    // ONE HAND ON HEAD: Hand should be on or near the top of head
    // Hand should be above nose but not too far above (to distinguish from normal shot)
    const leftOnHead = lw
      ? lw.y < nose.y + 20 && // At or above nose level (allow some tolerance below)
        lw.y > nose.y - 80 && // But not too far above (prevent normal shots)
        Math.abs(lw.x - nose.x) < 50 && // Reasonable horizontal tolerance
        Math.hypot(lw.x - nose.x, lw.y - nose.y) < 70 // Reasonable overall distance
      : false;
    const rightOnHead = rw
      ? rw.y < nose.y + 20 && // At or above nose level (allow some tolerance below)
        rw.y > nose.y - 80 && // But not too far above (prevent normal shots)
        Math.abs(rw.x - nose.x) < 50 && // Reasonable horizontal tolerance
        Math.hypot(rw.x - nose.x, rw.y - nose.y) < 70 // Reasonable overall distance
      : false;

    // ONE HAND ON HEAD: Only one hand needed, but must be reasonably close
    return leftOnHead || rightOnHead;
  }

  // Helper function to detect layup gesture (one arm extended up at angle)
  function detectLayupGesture(
    lw: posedetection.Keypoint | undefined,
    rw: posedetection.Keypoint | undefined,
    le: posedetection.Keypoint | undefined,
    re: posedetection.Keypoint | undefined,
    ls: posedetection.Keypoint,
    rs: posedetection.Keypoint
  ): boolean {
    // Check left arm: extended upward with good angle
    const leftArmExtended = !!(
      (
        le &&
        lw &&
        lw.y < ls.y - 50 && // Wrist well above shoulder
        le.y < ls.y && // Elbow above shoulder
        lw.y < le.y
      ) // Wrist above elbow (arm extended)
    );

    // Check right arm: extended upward with good angle
    const rightArmExtended = !!(
      (
        re &&
        rw &&
        rw.y < rs.y - 50 && // Wrist well above shoulder
        re.y < rs.y && // Elbow above shoulder
        rw.y < re.y
      ) // Wrist above elbow (arm extended)
    );

    // Other arm should be down or neutral (not raised)
    const leftArmDown = !!(le && le.y >= ls.y - 20);
    const rightArmDown = !!(re && re.y >= rs.y - 20);

    // One arm extended up, other arm not raised
    return (
      (leftArmExtended && rightArmDown) || (rightArmExtended && leftArmDown)
    );
  }

  useEffect(() => {
    let raf = 0;
    async function loop() {
      const video = videoRefs.current[0];
      const detector = detectorRef.current;
      const canvasNodes = canvasRefs.current.filter(
        (node): node is HTMLCanvasElement => Boolean(node)
      );
      if (!video || !detector || !canvasNodes.length) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const contexts: CanvasRenderingContext2D[] = [];

      // HiDPI crispness
      const dpr =
        typeof window !== "undefined" && window.devicePixelRatio
          ? window.devicePixelRatio
          : 1;
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      for (const canvas of canvasNodes) {
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        contexts.push(ctx);
      }
      if (!contexts.length) {
        raf = requestAnimationFrame(loop);
        return;
      }

      // Throttle inference for performance
      const now = performance.now();
      const posesFromPrev = lastDetectionsRef.current;
      let poses: posedetection.Pose[] = posesFromPrev;
      const INFER_INTERVAL_MS = 1000 / 15; // ~15 FPS
      if (now - (lastInferTsRef.current || 0) >= INFER_INTERVAL_MS) {
        try {
          const opts =
            currentModelRef.current === "MULTI_LIGHTNING"
              ? ({ maxPoses: 3, flipHorizontal: true } as const)
              : ({ flipHorizontal: true } as const);
          poses = await detector.estimatePoses(video, opts);
          lastInferTsRef.current = now;
          lastDetectionsRef.current = poses;

          // Collect frames for Gemini analysis (keep last 3 seconds at ~30fps = 90 frames)
          if (useGemini && poses.length > 0) {
            const frameNumber = poseFrameBufferRef.current.length;
            const timestamp = now / 1000; // Use absolute timestamp
            const frame = movenetPoseToFrame(poses[0], frameNumber, timestamp);
            poseFrameBufferRef.current.push(frame);

            // Keep only last 90 frames (3 seconds)
            if (poseFrameBufferRef.current.length > 90) {
              poseFrameBufferRef.current.shift();
            }
          }
        } catch {}
      }

      const assignments = buildAssignments(poses);
      const prevPlayerPoses = { ...lastPlayerPosesRef.current };
      draw(assignments, contexts, prevPlayerPoses);
      lastDetectionsRef.current = poses;

      const assignmentPoseMap = assignments.reduce((acc, assignment) => {
        acc[assignment.label] = assignment.pose;
        return acc;
      }, {} as Record<PlayerLabel, posedetection.Pose | null>);
      const nowTs = Date.now();
      activeLabels.forEach((label) => {
        const pose = assignmentPoseMap[label];
        const prevPose = prevPlayerPoses[label];
        const decision = isShootingGesture(pose, prevPose, label);
        if (!pose) {
          lastPlayerPosesRef.current[label] = null;
          resetDebugInfo(label);
          setCurrentShotTypes((prev) => ({ ...prev, [label]: null }));
          // Clear gesture history when pose is lost
          gestureHistoryRef.current[label] = [];
          return;
        }

        // Update current shot type for display
        const debugInfo = debugInfoRef.current[label];
        setCurrentShotTypes((prev) => ({
          ...prev,
          [label]: debugInfo.shotType,
        }));

        // Add to gesture history for majority voting (every frame when decision is true)
        if (decision && debugInfo.shotType) {
          const history = gestureHistoryRef.current[label];
          history.push({
            shotType: debugInfo.shotType,
            timestamp: nowTs,
          });

          // Clean old entries (older than 2 seconds)
          const cutoff = nowTs - 2000;
          gestureHistoryRef.current[label] = history.filter(
            (entry) => entry.timestamp > cutoff
          );
        }

        if (decision) {
          showShotIndicator(label);
        }

        const cooldownUntil = gestureCooldownsRef.current[label] ?? 0;
        if (nowTs >= cooldownUntil && decision) {
          // Use majority voting instead of last frame's shot type
          const majorityShotType = getMajorityGesture(label, 1500);

          if (majorityShotType) {
            gestureCooldownsRef.current[label] = nowTs + 1500;
            onShootGesture?.(label, majorityShotType);

            // Clear history after triggering to prevent re-triggering
            gestureHistoryRef.current[label] = [];

            // Trigger Gemini analysis if enabled
            if (useGemini && poseFrameBufferRef.current.length > 0) {
              const framesToAnalyze = [...poseFrameBufferRef.current];
              analyzeMotionWithGemini(framesToAnalyze, true)
                .then((analysis) => {
                  if (analysis) {
                    setGeminiAnalysis({
                      ...analysis,
                      timestamp: Date.now(),
                    });
                    console.log("[Gemini] Analysis:", analysis);
                  }
                })
                .catch((error) => {
                  console.error("[Gemini] Analysis failed:", error);
                });
            }

            if (debug) {
              const shotTypeLabel = majorityShotType
                ? ` (${majorityShotType.toUpperCase()})`
                : "";
              eventsRef.current.push({
                ts: nowTs,
                label: `Shot detected${shotTypeLabel} · ${label}`,
                player: label,
              });
              if (eventsRef.current.length > 20) eventsRef.current.shift();
            }
          }
        }
        lastPlayerPosesRef.current[label] = pose;
      });

      // Auto-tune detection if no poses for a while
      if (!poses || poses.length === 0) {
        noPoseFramesRef.current += 1;
      } else {
        if (currentModelRef.current !== "MULTI_LIGHTNING") {
          setDetector("MULTI_LIGHTNING").catch(() => {});
        }
        if (minPartScoreRef.current !== 0.2) {
          minPartScoreRef.current = 0.2;
        }
        noPoseFramesRef.current = 0;
      }
      if (noPoseFramesRef.current === 45) {
        // ease detection: lower part score threshold slightly
        minPartScoreRef.current = Math.max(
          0.15,
          minPartScoreRef.current - 0.05
        );
      }
      if (noPoseFramesRef.current === 90) {
        // switch to more accurate model
        setDetector("SINGLE_THUNDER").catch(() => {});
      }
      if (noPoseFramesRef.current === 180) {
        // try multi-pose as last resort
        setDetector("MULTI_LIGHTNING").catch(() => {});
      }

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [activeLabels, buildAssignments, draw, onShootGesture, showShotIndicator]);

  const activeShotLabels = activeLabels.filter((label) => shotActive[label]);
  const showShotBanner = activeShotLabels.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="relative aspect-video overflow-hidden bg-[#07070e] border border-white/10 shadow-[0_25px_45px_rgba(0,0,0,0.55)]">
        <video
          ref={assignVideoRef(0)}
          className="h-full w-full object-cover"
          muted
          playsInline
          autoPlay
        />
        <canvas
          ref={assignCanvasRef(0)}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
        <div className="pointer-events-none absolute inset-0">
          {activeLabels.map((label, index) => {
            const position =
              activeLabels.length === 1
                ? "left-1/2 -translate-x-1/2"
                : index === 0
                ? "left-3"
                : index === activeLabels.length - 1
                ? "right-3"
                : "left-1/2 -translate-x-1/2";
            const shotType = currentShotTypes[label];

            return (
              <div key={label} className={`absolute top-3 ${position}`}>
                <div className="rounded-md border border-white/10 bg-black/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-white shadow-[0_0_12px_rgba(28,255,176,0.25)] mb-2">
                  {displayNames?.[label] ?? label}
                </div>
                {shotType && (
                  <div
                    className={`rounded-lg px-3 py-2 text-sm font-bold uppercase tracking-wider animate-pulse ${
                      shotType === "dunk"
                        ? "bg-purple-500/90 text-white"
                        : shotType === "layup"
                        ? "bg-blue-500/90 text-white"
                        : "bg-green-500/90 text-white"
                    }`}
                  >
                    {shotType === "dunk"
                      ? "🏀 DUNK"
                      : shotType === "layup"
                      ? "🤾 LAYUP"
                      : "🎯 SHOT"}
                  </div>
                )}
              </div>
            );
          })}
          {!hideReadyBanner && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-emerald-400/30 bg-black/70 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-100 shadow-[0_0_14px_rgba(28,255,176,0.35)]">
              {ready
                ? "Webcam Ready · 2 arms=shot | 1 arm=layup | hand on head=dunk"
                : "Initializing camera feed..."}
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-60">
            <svg
              aria-hidden="true"
              className="h-32 w-32 text-emerald-200/30"
              viewBox="0 0 120 120"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
            >
              <path d="M10 100 L60 10 L110 100 Z" strokeLinecap="round" />
              <circle cx="60" cy="45" r="14" />
              <line x1="35" y1="90" x2="85" y2="90" />
            </svg>
          </div>
        </div>
      </div>
      {extraContent ? <div>{extraContent}</div> : null}
      {activeLabelsOverride === undefined && (
        <div className="flex flex-col gap-2 border border-white/15 bg-black/40 p-4 text-sm text-slate-200 shadow-[0_18px_38px_rgba(0,0,0,0.55)]">
          <label className="font-semibold uppercase tracking-[0.3em] text-emerald-100">
            Active Players: {playerCount === 3 ? "3+" : playerCount}
          </label>
          <input
            type="range"
            min={1}
            max={3}
            value={playerCount}
            onChange={(event) =>
              setPlayerCount(
                Math.min(3, Math.max(1, Number(event.target.value))) as
                  | 1
                  | 2
                  | 3
              )
            }
            className="mlb-range w-full cursor-pointer"
          />
          <div className="flex justify-between text-[11px] uppercase tracking-[0.3em] text-slate-400">
            <span>1</span>
            <span>2</span>
            <span>3+</span>
          </div>
        </div>
      )}
      {lanePoints ? (
        <div className="flex items-stretch justify-between gap-3">
          {activeLabels.map((label) => {
            const delta = lanePoints[label] ?? null;
            const isPositive = (delta ?? 0) > 0;
            const isNegative = (delta ?? 0) < 0;
            const display =
              delta === null || delta === undefined
                ? null
                : `${isPositive ? "+" : isNegative ? "−" : ""}${Math.abs(
                    delta ?? 0
                  )}`;
            return (
              <div key={label} className="flex-1 flex justify-center">
                {display !== null ? (
                  <div
                    className="rounded-xl border px-4 py-2 text-center bg-slate-900/80"
                    style={{ borderColor: `${PLAYER_ACCENT_COLORS[label]}55` }}
                  >
                    <div
                      className="text-[10px] uppercase tracking-wider font-semibold mb-1"
                      style={{ color: PLAYER_ACCENT_COLORS[label] }}
                    >
                      {displayNames?.[label] ?? label}
                    </div>
                    <div
                      className={`font-extrabold leading-none ${
                        isPositive
                          ? "text-green-400"
                          : isNegative
                          ? "text-red-400"
                          : "text-white/80"
                      }`}
                      style={{ fontSize: "2.75rem" }}
                    >
                      {display}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {showShotBanner ? (
        <div className="flex justify-center">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/20 bg-slate-900/90 px-8 py-5 text-center shadow-[0_8px_28px_rgba(0,0,0,0.55)]">
            <span className="text-white text-3xl font-black tracking-[0.35em]">
              SHOT DETECTED
            </span>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.5em] text-white/80">
              {activeShotLabels.map((label) => (
                <span
                  key={label}
                  style={{ color: PLAYER_ACCENT_COLORS[label] }}
                >
                  {displayNames?.[label] ?? label}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Gemini Analysis Display - Hidden for now (disabled) */}
    </div>
  );
}
