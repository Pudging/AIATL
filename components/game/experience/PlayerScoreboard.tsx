import { motion } from "framer-motion";
import {
  LABEL_COLORS,
  type PlayerLabel,
} from "@/components/game/constants";
import type {
  PlayerPointsDisplayMap,
  PlayerSlotMap,
} from "@/components/game/experience/types";

type PlayerScoreboardProps = {
  labels: PlayerLabel[];
  pointsByPlayer: Record<PlayerLabel, number>;
  playerPointsDisplay: PlayerPointsDisplayMap;
  playersBySlot: PlayerSlotMap;
  playerStreaks: Record<PlayerLabel, number>;
  onRemovePlayer: (slot: number) => void | Promise<void>;
};

const labelToSlot = (label: PlayerLabel) => {
  if (label === "Left Player") return 0;
  if (label === "Center Player") return 1;
  return 2;
};

export function PlayerScoreboard({
  labels,
  pointsByPlayer,
  playerPointsDisplay,
  playersBySlot,
  playerStreaks,
  onRemovePlayer,
}: PlayerScoreboardProps) {
  if (!labels.length) return null;

  const playerCount = labels.length;
  const pointValues = labels.map((label) => pointsByPlayer[label] ?? 0);
  const maxPoints = Math.max(...pointValues);
  const minPoints = Math.min(...pointValues);

  return (
    <div className="flex flex-wrap items-stretch justify-center gap-2 md:gap-3 w-full max-w-7xl mx-auto px-2">
      {labels.map((label) => {
        const points = pointsByPlayer[label] ?? 0;
        const digitCount = points.toLocaleString().length;
        const slotIndex = labelToSlot(label);
        const player = playersBySlot[slotIndex];
        const displayName = player?.name ?? label;

        const isWinning = points === maxPoints && maxPoints !== minPoints;
        const isLosing = points === minPoints && maxPoints !== minPoints;

        const getTextSize = () => {
          if (playerCount === 3) {
            if (digitCount <= 4) return "text-2xl sm:text-3xl md:text-4xl";
            if (digitCount <= 6) return "text-xl sm:text-2xl md:text-3xl";
            if (digitCount <= 8) return "text-lg sm:text-xl md:text-2xl";
            return "text-base sm:text-lg md:text-xl";
          }
          if (digitCount <= 4) return "text-4xl sm:text-5xl md:text-6xl";
          if (digitCount <= 6) return "text-3xl sm:text-4xl md:text-5xl";
          if (digitCount <= 8) return "text-2xl sm:text-3xl md:text-4xl";
          return "text-xl sm:text-2xl md:text-3xl";
        };

        const getWidthClasses = () => {
          if (playerCount === 3) return "flex-1 min-w-[100px] max-w-[160px]";
          if (playerCount === 2) return "flex-1 min-w-[140px] max-w-[220px]";
          return "flex-1 min-w-[160px] max-w-[280px]";
        };

        const getScoreColor = () => {
          if (playerPointsDisplay[label].show) {
            return playerPointsDisplay[label].points > 0
              ? "#49e6b5"
              : "#a855f7";
          }
          if (isWinning) return "#10b981";
          if (isLosing) return "#ef4444";
          return "#ffffff";
        };

        return (
          <motion.div
            key={label}
            className={`${getWidthClasses()} flex flex-col items-center justify-center border border-[#24405c] bg-[#0d1b31] px-2.5 py-2 shadow-[0_20px_45px_rgba(0,0,0,0.55)]`}
            style={{
              borderColor: LABEL_COLORS[label],
              boxShadow: `0 0 18px ${LABEL_COLORS[label]}33`,
            }}
            animate={{
              scale: playerPointsDisplay[label].show ? [1, 1.05, 1] : 1,
            }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="mb-1 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.35em]"
              style={{ color: LABEL_COLORS[label] }}
            >
              {player?.id ? (
                <a
                  href={`/stats?userId=${player.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline hover:opacity-80 transition"
                  onClick={(event) => event.stopPropagation()}
                >
                  {displayName}
                </a>
              ) : (
                displayName
              )}
            </div>
            <motion.div
              className={`${getTextSize()} leading-none font-extrabold tabular-nums text-flash`}
              key={points}
              initial={{ scale: 1, filter: "brightness(1)" }}
              animate={{
                scale: playerPointsDisplay[label].show ? [1, 1.3, 1] : 1,
                color: getScoreColor(),
                filter: playerPointsDisplay[label].show
                  ? ["brightness(1)", "brightness(1.8)", "brightness(1)"]
                  : "brightness(1)",
              }}
              transition={{ duration: 0.5 }}
            >
              {points.toLocaleString()}
            </motion.div>
            <div className="mt-1">
              {player && (
                <button
                  onClick={() => onRemovePlayer(slotIndex)}
                  className="rounded bg-red-600/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white hover:bg-red-600"
                >
                  Remove
                </button>
              )}
            </div>
            {playerStreaks[label] > 0 && (
              <motion.div
                initial={{ scale: 0, y: -5 }}
                animate={{ scale: 1, y: 0 }}
                className="relative text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-white whitespace-nowrap overflow-visible"
              >
                {[...Array(6)].map((_, index) => (
                  <motion.div
                    key={`fire-${index}`}
                    className="absolute w-1 h-1 rounded-full"
                    style={{
                      background: index % 2 === 0 ? "#ff6b00" : "#ff0000",
                      left: `${10 + index * 15}%`,
                      bottom: "100%",
                    }}
                    animate={{
                      y: [-2, -8, -2],
                      opacity: [0.8, 0.4, 0.8],
                      scale: [1, 0.5, 1],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: index * 0.1,
                      ease: "easeInOut",
                    }}
                  />
                ))}
                {playerStreaks[label]} STREAK
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
