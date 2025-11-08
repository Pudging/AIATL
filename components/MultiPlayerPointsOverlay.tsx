"use client";

import { motion, AnimatePresence } from "framer-motion";

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
};

export default function MultiPlayerPointsOverlay({ players }: Props) {
  const getPosition = (label: PlayerLabel) => {
    switch (label) {
      case "Left Player":
        return "left-[10%]";
      case "Right Player":
        return "right-[10%]";
      case "Center Player":
        return "left-1/2 -translate-x-1/2";
    }
  };

  return (
    <>
      {players.map((player) => (
        <AnimatePresence key={player.label}>
          {player.show && (
            <motion.div
              initial={{ opacity: 0, scale: 0, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: -100 }}
              transition={{ 
                duration: 0.5, 
                ease: "easeOut",
                type: "spring",
                stiffness: 200,
                damping: 15
              }}
              className={`fixed top-1/3 ${getPosition(player.label)} z-50 pointer-events-none`}
            >
              {/* Explosion rings */}
              <motion.div
                className={`absolute w-64 h-64 rounded-full border-4 ${
                  player.points >= 0 ? "border-green-400/50" : "border-red-400/50"
                }`}
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
              <motion.div
                className={`absolute w-64 h-64 rounded-full border-4 ${
                  player.points >= 0 ? "border-yellow-400/50" : "border-orange-400/50"
                }`}
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
              />

              {/* Main points display */}
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative"
              >
                {/* Glow background */}
                <motion.div
                  className={`absolute inset-0 rounded-full blur-2xl ${
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

                {/* Points container */}
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
                      {player.label}
                    </div>
                    
                    {/* Dramatic breakdown */}
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
                            transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                            className="text-lg font-bold text-yellow-200"
                          >
                            × {player.shotMultiplier} 🎯 SHOT TYPE!
                          </motion.div>
                        )}
                        {player.oddsMultiplier && player.oddsMultiplier !== 1 && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.35, type: "spring", stiffness: 260 }}
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
                    
                    {/* Main points with streak badge */}
                    <div className="relative flex items-center justify-center gap-3">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                        animate-pulse={{
                          scale: [1, 1.15, 1],
                          textShadow: [
                            "0 0 15px rgba(255,255,255,0.8)",
                            "0 0 30px rgba(255,255,255,1)",
                            "0 0 15px rgba(255,255,255,0.8)",
                          ],
                        }}
                        transition-pulse={{ duration: 0.6, repeat: Infinity }}
                        className="text-7xl font-black text-white"
                        style={{ textShadow: "0 0 20px rgba(255,255,255,0.9)" }}
                      >
                        {player.points >= 0 ? "+" : "−"}
                        {Math.abs(player.points).toLocaleString()}
                      </motion.div>
                      
                      {/* Streak multiplier badge - STAR SHAPE */}
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
                            damping: 12 
                          }}
                          className="relative w-32 h-32"
                        >
                          {/* Explosion rings */}
                          <motion.div
                            className="absolute inset-0 rounded-full border-4 border-orange-400/70"
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: [1, 2.5, 1], opacity: [0.8, 0, 0.8] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                          />
                          <motion.div
                            className="absolute inset-0 rounded-full border-4 border-red-400/70"
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: [1, 2, 1], opacity: [0.8, 0, 0.8] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
                          />
                          
                          {/* Fire particles orbiting */}
                          {[...Array(20)].map((_, i) => (
                            <motion.div
                              key={`streak-fire-${i}`}
                              className="absolute w-2.5 h-2.5 rounded-full"
                              style={{
                                background: i % 3 === 0 ? "#ff6b00" : i % 3 === 1 ? "#ff0000" : "#ffaa00",
                                left: "50%",
                                top: "50%",
                                boxShadow: "0 0 8px currentColor",
                              }}
                              animate={{
                                x: Math.cos((i / 20) * Math.PI * 2) * 50,
                                y: Math.sin((i / 20) * Math.PI * 2) * 50,
                                opacity: [0.9, 0.4, 0.9],
                                scale: [1.5, 0.8, 1.5],
                                rotate: [0, 360],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.05,
                                ease: "linear",
                              }}
                            />
                          ))}
                          
                          {/* Outer glow */}
                          <motion.div
                            className="absolute inset-0 blur-2xl bg-gradient-to-br from-orange-500 via-red-500 to-yellow-500"
                            animate={{
                              scale: [1, 1.4, 1],
                              opacity: [0.7, 1, 0.7],
                              rotate: [0, 180, 360],
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                          
                          {/* Star shape using clip-path */}
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center"
                            animate={{
                              rotate: [0, 360],
                            }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                          >
                            <div 
                              className="relative w-28 h-28 bg-gradient-to-br from-orange-400 via-red-500 to-orange-600 shadow-2xl"
                              style={{
                                clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
                                boxShadow: "0 0 40px rgba(255, 107, 0, 0.8), inset 0 0 20px rgba(255, 255, 255, 0.3)",
                              }}
                            >
                              {/* Inner star glow */}
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-br from-yellow-300 to-transparent"
                                style={{
                                  clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
                                }}
                                animate={{
                                  opacity: [0.3, 0.7, 0.3],
                                }}
                                transition={{ duration: 1, repeat: Infinity }}
                              />
                            </div>
                          </motion.div>
                          
                          {/* Star border (non-rotating) */}
                          <div 
                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                          >
                            <div 
                              className="w-28 h-28 border-4 border-white"
                              style={{
                                clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
                                filter: "drop-shadow(0 0 10px rgba(255, 255, 255, 0.8))",
                              }}
                            />
                          </div>
                          
                          {/* Multiplier text */}
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center"
                            animate={{
                              scale: [1, 1.15, 1],
                            }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                          >
                            <div className="text-center">
                              <motion.div 
                                className="text-6xl font-black text-white leading-none" 
                                style={{ 
                                  textShadow: "0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(255,255,255,0.5)",
                                  WebkitTextStroke: "2px rgba(0,0,0,0.3)",
                                }}
                                animate={{
                                  textShadow: [
                                    "0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(255,255,255,0.5)",
                                    "0 0 20px rgba(0,0,0,0.8), 0 0 60px rgba(255,255,255,0.9)",
                                    "0 0 20px rgba(0,0,0,0.8), 0 0 40px rgba(255,255,255,0.5)",
                                  ],
                                }}
                                transition={{ duration: 1, repeat: Infinity }}
                              >
                                {player.streakMultiplier.toFixed(1)}×
                              </motion.div>
                              <div className="text-[9px] font-bold text-white uppercase tracking-widest mt-1" style={{ textShadow: "0 0 5px rgba(0,0,0,0.8)" }}>
                                STREAK
                              </div>
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Sparkles */}
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={`sparkle-${i}`}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        player.points >= 0
                          ? ["#fbbf24", "#10b981", "#3b82f6", "#ef4444"][i % 4]
                          : ["#ef4444", "#f59e0b", "#f87171", "#fb7185"][i % 4],
                      left: "50%",
                      top: "50%",
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: Math.cos((i / 20) * Math.PI * 2) * 120,
                      y: Math.sin((i / 20) * Math.PI * 2) * 120,
                      opacity: 0,
                      scale: 0,
                    }}
                    transition={{
                      duration: 1.2,
                      delay: 0.1 + i * 0.02,
                      ease: "easeOut",
                    }}
                  />
                ))}

                {/* Stars */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={`star-${i}`}
                    className={`absolute text-2xl ${
                      player.points >= 0 ? "text-yellow-300" : "text-red-300"
                    }`}
                    style={{
                      left: "50%",
                      top: "50%",
                    }}
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                    animate={{
                      x: Math.cos((i / 8) * Math.PI * 2) * 100,
                      y: Math.sin((i / 8) * Math.PI * 2) * 100,
                      opacity: [0, 1, 0],
                      scale: [0, 1.2, 0],
                      rotate: [0, 180],
                    }}
                    transition={{
                      duration: 1,
                      delay: 0.2 + i * 0.05,
                      ease: "easeOut",
                    }}
                  >
                    ★
                  </motion.div>
                ))}

                {/* Money symbols */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={`money-${i}`}
                    className={`absolute text-3xl font-bold ${
                      player.points >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                    style={{
                      left: "50%",
                      top: "50%",
                    }}
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                    animate={{
                      x: (Math.random() - 0.5) * 200,
                      y: -150 - Math.random() * 50,
                      opacity: [0, 1, 1, 0],
                      scale: [0, 1, 1, 0.5],
                      rotate: (Math.random() - 0.5) * 360,
                    }}
                    transition={{
                      duration: 1.5,
                      delay: 0.3 + i * 0.1,
                      ease: "easeOut",
                    }}
                  >
                    {player.points >= 0 ? "$" : "−"}
                  </motion.div>
                ))}
              </motion.div>

              {/* Flash effect */}
              <motion.div
                className="absolute inset-0 bg-white rounded-full"
                initial={{ opacity: 0.6, scale: 0 }}
                animate={{ opacity: 0, scale: 2 }}
                transition={{ duration: 0.4 }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      ))}
    </>
  );
}
