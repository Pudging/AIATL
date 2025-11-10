"use client";

import { AnimatePresence, motion } from "framer-motion";

type PlayerLabel = "Left Player" | "Right Player" | "Center Player";

type PlayerPoints = {
  label: PlayerLabel;
  points: number;
  show: boolean;
  basePoints?: number;
  shotMultiplier?: number;
  streakMultiplier?: number;
  oddsMultiplier?: number;
};

type Props = {
  players: PlayerPoints[];
  displayNames?: Partial<Record<PlayerLabel, string>>;
};

const LANE_ORDER: PlayerLabel[] = ["Left Player", "Center Player", "Right Player"];

export default function MultiPlayerPointsOverlay({
  players,
  displayNames,
}: Props) {
  const locatePlayer = (label: PlayerLabel) =>
    players.find((entry) => entry.label === label && entry.show);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-start justify-center pt-24">
      <div className="w-full max-w-6xl px-4">
        <div className="grid grid-cols-3 gap-6">
          {LANE_ORDER.map((label) => {
            const player = locatePlayer(label);
            return (
              <div key={label} className="flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {player && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.75 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{
                        duration: 0.5,
                        ease: "easeOut",
                        type: "spring",
                        stiffness: 200,
                        damping: 15,
                      }}
                      className="relative w-full max-w-[16rem]"
                    >
                      <motion.div
                        className={`absolute inset-0 rounded-3xl border-4 ${
                          player.points >= 0
                            ? "border-green-400/50"
                            : "border-red-400/50"
                        }`}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 2.5, opacity: 0 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                      />
                      <motion.div
                        className={`absolute inset-0 rounded-3xl border-4 ${
                          player.points >= 0
                            ? "border-yellow-400/50"
                            : "border-orange-400/50"
                        }`}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                      />

                      <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="relative"
                      >
                        <motion.div
                          className={`absolute inset-0 rounded-2xl blur-2xl ${
                            player.points >= 0
                              ? "bg-gradient-to-br from-yellow-400 to-orange-500"
                              : "bg-gradient-to-br from-red-400 to-orange-500"
                          }`}
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.6, 0.9, 0.6],
                          }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                        />

                        <div
                          className={`relative rounded-2xl px-8 py-6 border-4 border-white shadow-2xl ${
                            player.points >= 0
                              ? "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500"
                              : "bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500"
                          }`}
                        >
                          <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-center"
                          >
                            <div className="text-sm font-bold text-white mb-2 uppercase tracking-wider whitespace-nowrap">
                              {displayNames?.[label] ?? player.label}
                            </div>

                            {player.basePoints && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="mb-3 space-y-2"
                              >
                                <div className="text-xl font-bold text-white/90">
                                  {Math.abs(player.basePoints).toLocaleString()}
                                </div>
                                {player.shotMultiplier && player.shotMultiplier > 1 && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{
                                      delay: 0.3,
                                      type: "spring",
                                      stiffness: 300,
                                    }}
                                    className="text-lg font-bold text-yellow-200"
                                  >
                                    × {player.shotMultiplier} 🎯 SHOT TYPE!
                                  </motion.div>
                                )}
                                {player.oddsMultiplier && player.oddsMultiplier !== 1 && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{
                                      delay: 0.35,
                                      type: "spring",
                                      stiffness: 260,
                                    }}
                                    className={`text-base font-semibold ${
                                      player.oddsMultiplier > 1
                                        ? "text-emerald-50"
                                        : "text-orange-100"
                                    }`}
                                  >
                                    × {player.oddsMultiplier.toFixed(2)} Shooting odds
                                  </motion.div>
                                )}
                                <motion.div
                                  initial={{ scaleX: 0 }}
                                  animate={{ scaleX: 1 }}
                                  transition={{ delay: 0.4, duration: 0.3 }}
                                  className="h-1 bg-white/50 rounded-full my-2"
                                />
                              </motion.div>
                            )}

                            <div className="relative flex items-center justify-center gap-3">
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                                style={{ textShadow: "0 0 20px rgba(255,255,255,0.9)" }}
                                className="text-7xl font-black text-white"
                              >
                                {player.points >= 0 ? "+" : "−"}
                                {Math.abs(player.points).toLocaleString()}
                              </motion.div>

                              {player.streakMultiplier && player.streakMultiplier > 1 && (
                                <motion.div
                                  initial={{ scale: 0, rotate: -180, x: 100, opacity: 0 }}
                                  animate={{
                                    scale: [0, 1.3, 1],
                                    rotate: [0, 360, 0],
                                    x: 0,
                                    opacity: 1,
                                  }}
                                  transition={{
                                    delay: 0.6,
                                    duration: 0.8,
                                    type: "spring",
                                    stiffness: 200,
                                    damping: 12,
                                  }}
                                  className="relative w-32 h-32"
                                >
                                  <motion.div
                                    className="absolute inset-0 rounded-full border-4 border-orange-400/70"
                                    initial={{ scale: 0, opacity: 1 }}
                                    animate={{
                                      scale: [1, 2.5, 1],
                                      opacity: [0.8, 0, 0.8],
                                    }}
                                    transition={{
                                      duration: 1.5,
                                      repeat: Infinity,
                                      ease: "easeOut",
                                    }}
                                  />
                                  <motion.div
                                    className="absolute inset-0 rounded-full border-4 border-white/30"
                                    initial={{ scale: 0, opacity: 1 }}
                                    animate={{
                                      scale: [1, 2.5, 1],
                                      opacity: [0.6, 0, 0.6],
                                    }}
                                    transition={{
                                      duration: 1.3,
                                      repeat: Infinity,
                                      ease: "easeOut",
                                    }}
                                  />
                                  <motion.div
                                    className="absolute inset-0 rounded-full border-2 border-yellow-200/70"
                                    initial={{ scale: 0, opacity: 1 }}
                                    animate={{
                                      scale: [1, 2.2, 1],
                                      opacity: [0.5, 0, 0.5],
                                    }}
                                    transition={{
                                      duration: 1.1,
                                      repeat: Infinity,
                                      ease: "easeOut",
                                    }}
                                  />
                                  <motion.div className="absolute inset-0 flex items-center justify-center text-2xl text-white/90 font-bold">
                                    ×{player.streakMultiplier.toFixed(1)}
                                  </motion.div>
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        </div>

                        {[...Array(6)].map((_, i) => (
                          <motion.div
                            key={`sparkle-${i}`}
                            className="absolute h-1.5 w-1.5 rounded-full"
                            style={{
                              left: `${15 + Math.random() * 70}%`,
                              top: `${15 + Math.random() * 70}%`,
                              filter: "blur(0.5px)",
                              backgroundColor: "rgba(255,255,255,0.85)",
                            }}
                            initial={{ opacity: 0 }}
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
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
