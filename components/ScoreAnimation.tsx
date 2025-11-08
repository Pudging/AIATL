"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

type LaneLabel = "Left Player" | "Center Player" | "Right Player";

const PLAYER_ACCENT_COLORS: Record<LaneLabel, string> = {
  "Left Player": "#3b82f6",
  "Right Player": "#f97316",
  "Center Player": "#10b981",
};

type Props = {
  mode: "score" | "miss" | null;
  activeLabels?: LaneLabel[];
  lanePoints?: Partial<Record<LaneLabel, number | null>>;
};

export default function ScoreAnimation({
  mode,
  activeLabels,
  lanePoints,
}: Props) {
  const text = mode === "score" ? "Scored!" : "Missed!";
  const color = mode === "score" ? "text-emerald-400" : "text-rose-400";
  const playersCount = activeLabels?.length ?? 1;
  const titleSize =
    playersCount > 1 ? "text-4xl md:text-5xl" : "text-5xl md:text-6xl";
  const lanes = useMemo<LaneLabel[]>(
    () => ["Left Player", "Center Player", "Right Player"],
    []
  );

  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-6"
        >
          <motion.div
            initial={{ filter: "blur(6px)", scale: 0.95 }}
            animate={{ filter: "blur(0px)", scale: 1 }}
            className={`font-extrabold drop-shadow ${color} ${titleSize}`}
          >
            {text}
          </motion.div>

          {/* Lane-specific popups (one per active player) */}
          {activeLabels && lanePoints ? (
            <div className="w-full max-w-6xl">
              <div className="grid grid-cols-3 gap-6">
                {lanes.map((label) => {
                  const isActive = activeLabels.includes(label);
                  if (!isActive) {
                    return <div key={label} />;
                  }
                  const value = lanePoints[label];
                  const isPositive = (value ?? 0) > 0;
                  const isNegative = (value ?? 0) < 0;
                  const display =
                    value === null || value === undefined
                      ? null
                      : `${isPositive ? "+" : isNegative ? "−" : ""}${Math.abs(
                          value ?? 0
                        )}`;
                  return (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, y: 12, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -12, scale: 0.9 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 18,
                      }}
                      className="relative flex items-center justify-center"
                    >
                      {display !== null ? (
                        <div className="relative">
                          {/* Glow ring */}
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0.6 }}
                            animate={{
                              scale: [0.9, 1.1, 1],
                              opacity: [0.6, 0.9, 0.8],
                            }}
                            transition={{
                              duration: 1.2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            className="absolute -inset-3 rounded-3xl blur-2xl"
                            style={{
                              background: `radial-gradient(35% 35% at 50% 50%, ${PLAYER_ACCENT_COLORS[label]}66, transparent 60%)`,
                            }}
                          />
                          {/* Card */}
                          <div
                            className="relative rounded-2xl px-6 py-4 text-center border shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
                            style={{
                              borderColor: `${PLAYER_ACCENT_COLORS[label]}66`,
                              background:
                                "linear-gradient(135deg, rgba(17,24,39,0.85), rgba(2,6,23,0.85))",
                            }}
                          >
                            <div
                              className="text-[10px] uppercase tracking-wider font-semibold mb-2"
                              style={{ color: PLAYER_ACCENT_COLORS[label] }}
                            >
                              {label}
                            </div>
                            <motion.div
                              className={`font-extrabold leading-none ${
                                isPositive
                                  ? "text-green-400"
                                  : isNegative
                                  ? "text-red-400"
                                  : "text-white/90"
                              }`}
                              style={{
                                fontSize: "3rem",
                                textShadow:
                                  "0 0 18px rgba(255,255,255,0.2), 0 0 32px rgba(255,255,255,0.18)",
                              }}
                              animate={{ scale: [1, 1.08, 1] }}
                              transition={{
                                duration: 0.9,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                            >
                              {display}
                            </motion.div>
                          </div>
                          {/* Floating sparkles */}
                          <div className="pointer-events-none">
                            {[...Array(6)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="absolute w-1.5 h-1.5 rounded-full"
                                style={{
                                  backgroundColor: PLAYER_ACCENT_COLORS[label],
                                  left: `${20 + Math.random() * 60}%`,
                                  top: `${20 + Math.random() * 60}%`,
                                  filter: "blur(0.5px)",
                                }}
                                initial={{ opacity: 0, y: 0 }}
                                animate={{
                                  opacity: [0, 0.9, 0],
                                  y: [
                                    -6 - Math.random() * 10,
                                    -14 - Math.random() * 12,
                                  ],
                                }}
                                transition={{
                                  duration: 1.4 + Math.random() * 0.6,
                                  repeat: Infinity,
                                  delay: Math.random() * 0.6,
                                  ease: "easeOut",
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
