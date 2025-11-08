'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as posedetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs';

type Props = {
  onShootGesture?: () => void;
  debug?: boolean;
};

export default function WebcamGestureDetector({ onShootGesture, debug = true }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<posedetection.PoseDetector | null>(null);
  const lastKeypointsRef = useRef<posedetection.Pose[]>([]);
  const lastInferTsRef = useRef<number>(0);
  const debugInfoRef = useRef<{ elbowsUp: boolean; wristsUp: boolean; velocity: number; decision: boolean }>({ elbowsUp: false, wristsUp: false, velocity: 0, decision: false });
  const eventsRef = useRef<{ ts: number; label: string }[]>([]);
  const noPoseFramesRef = useRef<number>(0);
  const currentModelRef = useRef<'SINGLE_LIGHTNING' | 'SINGLE_THUNDER' | 'MULTI_LIGHTNING'>('SINGLE_LIGHTNING');
  const minPartScoreRef = useRef<number>(0.2);
  const [ready, setReady] = useState(false);
  const [gestureOnCooldown, setGestureOnCooldown] = useState(false);

  // Adjacency list for skeleton lines (MoveNet keypoint names)
  const SKELETON_PAIRS: [string, string][] = [
    ['left_ankle', 'left_knee'],
    ['left_knee', 'left_hip'],
    ['right_ankle', 'right_knee'],
    ['right_knee', 'right_hip'],
    ['left_hip', 'right_hip'],
    ['left_shoulder', 'left_hip'],
    ['right_shoulder', 'right_hip'],
    ['left_shoulder', 'right_shoulder'],
    ['left_elbow', 'left_shoulder'],
    ['right_elbow', 'right_shoulder'],
    ['left_wrist', 'left_elbow'],
    ['right_wrist', 'right_elbow'],
    ['left_eye', 'right_eye'],
    ['nose', 'left_eye'],
    ['nose', 'right_eye']
  ];

  async function setDetector(model: 'SINGLE_LIGHTNING' | 'SINGLE_THUNDER' | 'MULTI_LIGHTNING') {
    if (currentModelRef.current === model && detectorRef.current) return;
    currentModelRef.current = model;
    // Dispose previous if supported
    try { (detectorRef.current as any)?.dispose?.(); } catch {}
    const cfg: posedetection.MoveNetModelConfig = {
      modelType:
        model === 'SINGLE_THUNDER'
          ? (posedetection.movenet as any).modelType.SINGLEPOSE_THUNDER
          : model === 'MULTI_LIGHTNING'
          ? (posedetection.movenet as any).modelType.MULTIPOSE_LIGHTNING
          : (posedetection.movenet as any).modelType.SINGLEPOSE_LIGHTNING
    };
    detectorRef.current = await posedetection.createDetector(posedetection.SupportedModels.MoveNet, cfg);
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      await tf.setBackend('webgl');
      await tf.ready();
      await setDetector('SINGLE_LIGHTNING');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      if (cancelled) return;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setReady(true);
        };
      }
    }
    init();
    return () => {
      cancelled = true;
      try {
        const tracks = (videoRef.current?.srcObject as MediaStream | null)?.getTracks?.() ?? [];
        tracks.forEach((t) => t.stop());
      } catch {}
      detectorRef.current = null;
    };
  }, []);

  const draw = useCallback((poses: posedetection.Pose[], ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.lineWidth = 2;

    // Skeleton lines
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)'; // blue
    for (const pose of poses) {
      const byName: Record<string, posedetection.Keypoint> = {};
      for (const kp of pose.keypoints) {
        if ((kp.score ?? 0) >= minPartScoreRef.current && kp.name) byName[kp.name] = kp;
      }
      for (const [a, b] of SKELETON_PAIRS) {
        const ka = byName[a];
        const kb = byName[b];
        if (!ka || !kb) continue;
        ctx.beginPath();
        ctx.moveTo(ka.x, ka.y);
        ctx.lineTo(kb.x, kb.y);
        ctx.stroke();
      }
    }

    // Keypoints
    ctx.fillStyle = 'rgba(16, 185, 129, 0.9)'; // emerald
    for (const pose of poses) {
      for (const kp of pose.keypoints) {
        if ((kp.score ?? 0) < minPartScoreRef.current) continue;
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Velocity vectors for wrists and elbows
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.9)'; // rose
    const prev = lastKeypointsRef.current?.[0];
    const prevByName: Record<string, posedetection.Keypoint> = {};
    (prev?.keypoints ?? []).forEach((k: posedetection.Keypoint) => {
      if ((k?.score ?? 0) >= 0.3 && k.name) prevByName[k.name] = k;
    });
    const main = poses[0];
    if (main) {
      const names = ['left_wrist', 'right_wrist', 'left_elbow', 'right_elbow'];
      const currentByName: Record<string, posedetection.Keypoint> = {};
      (main.keypoints ?? []).forEach((k: posedetection.Keypoint) => {
        if ((k?.score ?? 0) >= 0.3 && k.name) currentByName[k.name] = k;
      });
      for (const n of names) {
        const c = currentByName[n];
        const p = prevByName[n];
        if (!c || !p) continue;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }, []);

  function isShootingGesture(pose?: posedetection.Pose, prevPose?: posedetection.Pose): boolean {
    if (!pose) return false;
    const byName = (p?: posedetection.Pose) => {
      const map: Record<string, posedetection.Keypoint> = {};
      (p?.keypoints ?? []).forEach((k: posedetection.Keypoint) => {
        if ((k?.name as string | undefined)) {
          map[k.name as string] = k;
        }
      });
      return map;
    };
    const k = byName(pose);
    const kp = (name: string) => (k[name] && (k[name].score ?? 0) > 0.3 ? k[name] : undefined);
    const ls = kp('left_shoulder'), rs = kp('right_shoulder');
    const le = kp('left_elbow'), re = kp('right_elbow');
    const lw = kp('left_wrist'), rw = kp('right_wrist');
    if (!ls || !rs || (!le && !re) || (!lw && !rw)) return false;
    const elbowsUp = (le ? le.y < ls.y : false) && (re ? re.y < rs.y : false);
    const wristsUp = (lw ? lw.y < ls.y : false) && (rw ? rw.y < rs.y : false);
    if (!(elbowsUp && wristsUp)) {
      debugInfoRef.current = { elbowsUp, wristsUp, velocity: 0, decision: false };
      return false;
    }
    if (!prevPose) {
      debugInfoRef.current = { elbowsUp, wristsUp, velocity: 0, decision: false };
      return false;
    }
    const prev = byName(prevPose);
    const prevRw = prev['right_wrist'];
    const prevLw = prev['left_wrist'];

    // Convert to velocity per second using last inference delta
    const dtMs = Math.max(16, performance.now() - (lastInferTsRef.current || performance.now()));
    const vRight = (rw && prevRw) ? Math.hypot(rw.x - prevRw.x, rw.y - prevRw.y) * (1000 / dtMs) : 0;
    const vLeft = (lw && prevLw) ? Math.hypot(lw.x - prevLw.x, lw.y - prevLw.y) * (1000 / dtMs) : 0;
    let velocity = Math.max(vRight, vLeft);

    // Directional component: forward along shoulder->wrist
    const rightForward = (rs && rw) ? (() => {
      const dir = { x: rw.x - rs.x, y: rw.y - rs.y };
      const len = Math.hypot(dir.x, dir.y) || 1;
      const prevVec = prevRw && rs ? { x: (rw.x - prevRw.x), y: (rw.y - prevRw.y) } : { x: 0, y: 0 };
      return (dir.x / len) * prevVec.x + (dir.y / len) * prevVec.y;
    })() : 0;
    const leftForward = (ls && lw) ? (() => {
      const dir = { x: lw.x - ls.x, y: lw.y - ls.y };
      const len = Math.hypot(dir.x, dir.y) || 1;
      const prevVec = prevLw && ls ? { x: (lw.x - prevLw.x), y: (lw.y - prevLw.y) } : { x: 0, y: 0 };
      return (dir.x / len) * prevVec.x + (dir.y / len) * prevVec.y;
    })() : 0;
    const forwardComponent = Math.max(rightForward, leftForward) * (1000 / dtMs);

    // Scale-invariant threshold based on frame diagonal
    const canvas = canvasRef.current;
    const diag = canvas ? Math.hypot(canvas.width, canvas.height) : 1000;
    const pxPerSecThreshold = diag * 0.04; // 4% of diagonal per second

    const decision = elbowsUp && wristsUp && (velocity > pxPerSecThreshold || forwardComponent > pxPerSecThreshold * 0.75);
    debugInfoRef.current = { elbowsUp, wristsUp, velocity, decision };
    return decision;
  }

  useEffect(() => {
    let raf = 0;
    async function loop() {
      if (!videoRef.current || !detectorRef.current || !canvasRef.current) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;

      // HiDPI crispness
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Throttle inference for performance
      const now = performance.now();
      const posesFromPrev = lastKeypointsRef.current;
      let poses: posedetection.Pose[] = posesFromPrev;
      const INFER_INTERVAL_MS = 1000 / 15; // ~15 FPS
      if (now - (lastInferTsRef.current || 0) >= INFER_INTERVAL_MS) {
        try {
          const opts: posedetection.PoseDetectorEstimateConfig = currentModelRef.current === 'MULTI_LIGHTNING'
            ? { maxPoses: 3, flipHorizontal: true }
            : { flipHorizontal: true };
          poses = await detectorRef.current.estimatePoses(video, opts);
          lastInferTsRef.current = now;
        } catch {}
      }

      draw(poses, ctx);

      // Debug HUD
      if (debug) {
        const d = debugInfoRef.current;
        const lines = [
          `elbowsUp: ${d.elbowsUp}`,
          `wristsUp: ${d.wristsUp}`,
          `velocity: ${d.velocity.toFixed(1)}`,
          `shooting: ${d.decision}`
        ];
        ctx.save();
        ctx.font = '12px ui-sans-serif, system-ui, -apple-system';
        ctx.textBaseline = 'top';
        const pad = 6;
        const boxW = 160;
        const boxH = lines.length * 16 + pad * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(pad, pad, boxW, boxH);
        ctx.fillStyle = 'white';
        lines.forEach((t, i) => ctx.fillText(t, pad + 6, pad + 4 + i * 16));
        ctx.restore();

        // Event log (recent detections)
        const recents = eventsRef.current.filter((e) => Date.now() - e.ts < 8000);
        if (recents.length) {
          ctx.save();
          ctx.font = '12px ui-sans-serif, system-ui, -apple-system';
          ctx.textBaseline = 'bottom';
          const x = pad;
          let y = canvas.height / (window.devicePixelRatio || 1) - pad;
          for (let i = recents.length - 1; i >= 0; i--) {
            const t = new Date(recents[i].ts).toLocaleTimeString();
            const text = `${recents[i].label} @ ${t}`;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            const tw = ctx.measureText(text).width + 12;
            ctx.fillRect(x, y - 16, tw, 16);
            ctx.fillStyle = 'white';
            ctx.fillText(text, x + 6, y - 14);
            y -= 18;
          }
          ctx.restore();
        }
      }
      const mainPose = poses[0];
      const prevMainPose = lastKeypointsRef.current[0];
      if (mainPose && !gestureOnCooldown && isShootingGesture(mainPose, prevMainPose)) {
        setGestureOnCooldown(true);
        onShootGesture?.();
        if (debug) {
          eventsRef.current.push({ ts: Date.now(), label: 'Shoot detected' });
          if (eventsRef.current.length > 20) eventsRef.current.shift();
        }
        setTimeout(() => setGestureOnCooldown(false), 1500);
      }
      lastKeypointsRef.current = poses;

      // Auto-tune detection if no poses for a while
      if (!poses || poses.length === 0) {
        noPoseFramesRef.current += 1;
      } else {
        noPoseFramesRef.current = 0;
      }
      if (noPoseFramesRef.current === 45) {
        // ease detection: lower part score threshold slightly
        minPartScoreRef.current = Math.max(0.15, minPartScoreRef.current - 0.05);
      }
      if (noPoseFramesRef.current === 90) {
        // switch to more accurate model
        setDetector('SINGLE_THUNDER').catch(() => {});
      }
      if (noPoseFramesRef.current === 180) {
        // try multi-pose as last resort
        setDetector('MULTI_LIGHTNING').catch(() => {});
      }

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw, gestureOnCooldown, onShootGesture]);

  return (
    <div className="relative">
      <video ref={videoRef} className="w-full rounded-lg" muted playsInline />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="absolute top-2 left-2 text-xs px-2 py-1 rounded glass">
        {ready ? 'Webcam Ready · Raise both arms to predict' : 'Initializing...'}
      </div>
    </div>
  );
}


