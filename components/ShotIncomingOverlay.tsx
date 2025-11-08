'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

type ShotOddsDetails = {
  playerName: string;
  percentage: number | null;
  statLabel: "FG%" | "3P%" | null;
  rewardMultiplier: number;
  lossMultiplier: number;
  isThree: boolean;
};

type Props = {
  show: boolean;
  countdown: number;
  shotOdds?: ShotOddsDetails | null;
  onComplete?: () => void;
};

export default function ShotIncomingOverlay({
  show,
  countdown,
  shotOdds,
  onComplete,
}: Props) {
  const [pulseKey, setPulseKey] = useState(0);
  const [currentCount, setCurrentCount] = useState(countdown);

  useEffect(() => {
    if (show) {
      setPulseKey((k) => k + 1);
      setCurrentCount(countdown);
      
      const interval = setInterval(() => {
        setCurrentCount((c) => {
          if (c <= 1) {
            clearInterval(interval);
            onComplete?.();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [show, countdown, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="shot-incoming"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          {/* Spinning rings */}
          <motion.div
            key={`ring-outer-${pulseKey}`}
            className="absolute w-96 h-96 rounded-full border-8 border-yellow-500/30"
            animate={{
              rotate: 360,
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
              scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
            }}
          />
          <motion.div
            key={`ring-middle-${pulseKey}`}
            className="absolute w-72 h-72 rounded-full border-8 border-orange-500/40"
            animate={{
              rotate: -360,
              scale: [1, 1.15, 1],
              opacity: [0.4, 0.7, 0.4]
            }}
            transition={{
              rotate: { duration: 1.5, repeat: Infinity, ease: 'linear' },
              scale: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
            }}
          />
          <motion.div
            key={`ring-inner-${pulseKey}`}
            className="absolute w-48 h-48 rounded-full border-8 border-red-500/50"
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
              rotate: { duration: 1, repeat: Infinity, ease: 'linear' },
              scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 1, repeat: Infinity, ease: 'easeInOut' }
            }}
          />

          {/* Center content */}
          <div className="relative z-10 text-center">
            <motion.div
              key={`text-${pulseKey}`}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  textShadow: [
                    '0 0 20px rgba(255,215,0,0.8)',
                    '0 0 40px rgba(255,215,0,1)',
                    '0 0 20px rgba(255,215,0,0.8)'
                  ]
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="text-6xl md:text-8xl font-black text-yellow-400 uppercase tracking-wider"
                style={{ textShadow: '0 0 30px rgba(255,215,0,0.9)' }}
              >
                Shot Incoming!
              </motion.div>
            </motion.div>

            <motion.div
              key={`subtitle-${pulseKey}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-8"
            >
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  color: ['#fbbf24', '#f59e0b', '#fbbf24']
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="text-3xl md:text-5xl font-bold text-amber-400 uppercase"
              >
                Make Your Prediction NOW!
              </motion.div>
            </motion.div>

            {/* Countdown timer */}
            <motion.div
              key={`countdown-${pulseKey}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
              className="relative"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="text-9xl font-black text-white"
                style={{
                  textShadow: '0 0 40px rgba(255,255,255,0.8), 0 0 80px rgba(255,215,0,0.6)'
                }}
              >
                {currentCount}
              </motion.div>
              <motion.div
                className="absolute inset-0 text-9xl font-black text-yellow-400 blur-xl"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                {currentCount}
              </motion.div>
            </motion.div>

            {shotOdds && (
              <motion.div
                key={`odds-${pulseKey}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.4 }}
                className="mt-10 max-w-xl mx-auto"
              >
                <div className="text-sm uppercase tracking-[0.4em] text-amber-200/80 mb-3">
                  Risk profile: {shotOdds.playerName}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-400/50 bg-emerald-500/10 p-4 shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                    <div className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-200/80">
                      Make shot
                    </div>
                    <div className="mt-2 text-4xl font-black text-white">
                      × {shotOdds.rewardMultiplier.toFixed(2)}
                    </div>
                    <div className="text-xs text-emerald-100/80 mt-1">
                      Bigger upside for tougher shooters
                    </div>
                  </div>
                  <div className="rounded-2xl border border-rose-400/50 bg-rose-500/10 p-4 shadow-[0_0_25px_rgba(244,63,94,0.25)]">
                    <div className="text-xs font-semibold uppercase tracking-[0.4em] text-rose-200/80">
                      Miss shot
                    </div>
                    <div className="mt-2 text-4xl font-black text-white">
                      × {shotOdds.lossMultiplier.toFixed(2)}
                    </div>
                    <div className="text-xs text-rose-100/80 mt-1">
                      Cold hands cost more for sharpshooters
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-col items-center gap-1 text-sm text-white/80">
                  <span className="font-semibold uppercase tracking-[0.3em] text-amber-200/80">
                    {shotOdds.statLabel ?? (shotOdds.isThree ? "3P%" : "FG%")}
                  </span>
                  <span className="text-2xl font-bold text-white">
                    {shotOdds.percentage != null
                      ? `${(shotOdds.percentage * 100).toFixed(1)}%`
                      : "No season data"}
                  </span>
                  <span className="text-xs text-white/70">
                    {shotOdds.isThree ? "3PT look" : "Inside the arc"}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Flashing indicators */}
            <div className="mt-8 flex justify-center gap-4">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-4 h-4 rounded-full bg-yellow-400"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}
            </div>
          </div>

          {/* Corner sparkles */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              className="absolute w-3 h-3 bg-yellow-400 rounded-full"
              style={{
                top: `${10 + Math.random() * 80}%`,
                left: `${10 + Math.random() * 80}%`
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: Math.random() * 1.5
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
