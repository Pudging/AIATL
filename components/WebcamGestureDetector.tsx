'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as posedetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs';

type Props = {
  onShootGesture?: () => void;
};

export default function WebcamGestureDetector({ onShootGesture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<posedetection.PoseDetector | null>(null);
  const lastKeypointsRef = useRef<posedetection.Pose[]>([]);
  const lastInferTsRef = useRef<number>(0);
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

  useEffect(() => {
    let cancelled = false;
    async function init() {
      await tf.setBackend('webgl');
      await tf.ready();
      const detector = await posedetection.createDetector(
        posedetection.SupportedModels.MoveNet,
        {
          modelType: (posedetection.movenet as any).modelType.MULTIPOSE_LIGHTNING
        } as posedetection.MoveNetModelConfig
      );
      detectorRef.current = detector;
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
        if ((kp.score ?? 0) >= 0.3 && kp.name) byName[kp.name] = kp;
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
        if ((kp.score ?? 0) < 0.3) continue;
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
    if (!(elbowsUp && wristsUp)) return false;
    if (!prevPose) return false;
    const prev = byName(prevPose);
    const prevRw = prev['right_wrist'];
    const prevLw = prev['left_wrist'];
    const vRight = (rw && prevRw) ? Math.hypot(rw.x - prevRw.x, rw.y - prevRw.y) : 0;
    const vLeft = (lw && prevLw) ? Math.hypot(lw.x - prevLw.x, lw.y - prevLw.y) : 0;
    const velocity = Math.max(vRight, vLeft);
    return velocity > 20;
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
          poses = await detectorRef.current.estimatePoses(video, { maxPoses: 3, flipHorizontal: true });
          lastInferTsRef.current = now;
        } catch {}
      }

      draw(poses, ctx);
      const mainPose = poses[0];
      const prevMainPose = lastKeypointsRef.current[0];
      if (mainPose && !gestureOnCooldown && isShootingGesture(mainPose, prevMainPose)) {
        setGestureOnCooldown(true);
        onShootGesture?.();
        setTimeout(() => setGestureOnCooldown(false), 1500);
      }
      lastKeypointsRef.current = poses;
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


