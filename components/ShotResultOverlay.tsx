"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  show: boolean;
  shotData: {
    playerName: string;
    teamTricode?: string;
    shotResult: string;
    shotType?: string;
    points?: number;
    shotLocation?: { x: number; y: number };
    distance?: string;
  } | null;
  onComplete?: () => void;
};

export default function ShotResultOverlay({
  show,
  shotData,
  onComplete,
}: Props) {
  if (!shotData) return null;

  const isMade = shotData.shotResult?.toLowerCase().includes("made");

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          key="shot-result"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.5, rotate: 10 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="relative text-center p-8 rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 border-4 max-w-2xl"
            style={{
              borderColor: isMade ? "#10b981" : "#ef4444",
            }}
          >
            {/* Result text */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={`text-7xl font-black mb-4 ${
                isMade ? "text-green-400" : "text-red-400"
              }`}
              style={{
                textShadow: isMade
                  ? "0 0 40px rgba(16, 185, 129, 0.8)"
                  : "0 0 40px rgba(239, 68, 68, 0.8)",
              }}
            >
              {isMade ? "SWISHHH!" : "MISSED!"}
            </motion.div>

            {/* Player info */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-6"
            >
              <div className="text-3xl font-bold text-white mb-2">
                {shotData.playerName}
                {shotData.teamTricode && (
                  <span className="ml-2 text-xl opacity-75">
                    ({shotData.teamTricode})
                  </span>
                )}
              </div>
              <div className="flex items-center justify-center gap-4 text-lg">
                {shotData.shotType && (
                  <span className="px-3 py-1 bg-white/10 rounded-full">
                    {shotData.shotType}
                  </span>
                )}
                {shotData.points && isMade && (
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full font-bold">
                    +{shotData.points} PTS
                  </span>
                )}
                {shotData.distance && (
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                    {shotData.distance}
                  </span>
                )}
              </div>
            </motion.div>

            {/* Shot location visualization */}
            {shotData.shotLocation && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="relative w-64 h-64 mx-auto bg-gradient-to-br from-orange-900/30 to-orange-800/30 rounded-lg border-2 border-orange-500/50"
              >
                <div className="absolute inset-0 flex items-center justify-center text-xs opacity-40">
                  Court View
                </div>
                {/* Basket */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-4 border-white/50" />
                {/* Shot marker */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.5, 1] }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className={`absolute w-6 h-6 rounded-full ${
                    isMade ? "bg-green-400" : "bg-red-400"
                  }`}
                  style={{
                    left: `${shotData.shotLocation.x}%`,
                    top: `${shotData.shotLocation.y}%`,
                    transform: "translate(-50%, -50%)",
                    boxShadow: isMade
                      ? "0 0 20px rgba(16, 185, 129, 0.8)"
                      : "0 0 20px rgba(239, 68, 68, 0.8)",
                  }}
                />
                {/* Arc line */}
                <motion.svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                >
                  <motion.path
                    d={`M ${shotData.shotLocation.x * 2.56} ${
                      shotData.shotLocation.y * 2.56
                    } Q 128 64 128 240`}
                    stroke={isMade ? "#10b981" : "#ef4444"}
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="8 4"
                    opacity="0.6"
                  />
                </motion.svg>
              </motion.div>
            )}

            {/* Confetti effect for made shots */}
            {isMade && (
              <>
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={`confetti-${i}`}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: [
                        "#fbbf24",
                        "#10b981",
                        "#3b82f6",
                        "#ef4444",
                      ][i % 4],
                      left: "50%",
                      top: "20%",
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: (Math.random() - 0.5) * 400,
                      y: Math.random() * 400 + 200,
                      opacity: 0,
                      scale: 0,
                      rotate: Math.random() * 720,
                    }}
                    transition={{
                      duration: 1.5,
                      delay: 0.3 + Math.random() * 0.3,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
