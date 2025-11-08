"use client";

import { motion, AnimatePresence } from "framer-motion";

type PlayerLabel = "Left Player" | "Right Player" | "Center Player";

type PlayerPoints = {
  label: PlayerLabel;
  points: number;
  show: boolean;
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
                  className={`relative rounded-2xl px-6 py-4 border-4 border-white shadow-2xl ${
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
                    <div className="text-sm font-bold text-white mb-1 uppercase tracking-wider whitespace-nowrap">
                      {player.label}
                    </div>
                    <motion.div
                      animate={{
                        scale: [1, 1.15, 1],
                        textShadow: [
                          "0 0 15px rgba(255,255,255,0.8)",
                          "0 0 30px rgba(255,255,255,1)",
                          "0 0 15px rgba(255,255,255,0.8)",
                        ],
                      }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                      className="text-6xl font-black text-white"
                      style={{ textShadow: "0 0 20px rgba(255,255,255,0.9)" }}
                    >
                      {player.points >= 0 ? "+" : "−"}
                      {Math.abs(player.points)}
                    </motion.div>
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

