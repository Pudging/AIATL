'use client';

import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  show: boolean;
  points: number;
};

export default function PointsEarnedOverlay({ show, points }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="points-earned"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 2 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          {/* Explosion rings */}
          <motion.div
            className="absolute w-96 h-96 rounded-full border-8 border-green-400/50"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute w-96 h-96 rounded-full border-8 border-yellow-400/50"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 1.3, ease: 'easeOut', delay: 0.1 }}
          />
          <motion.div
            className="absolute w-96 h-96 rounded-full border-8 border-orange-400/50"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
          />

          {/* Main points display */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="relative"
          >
            {/* Glow background */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full blur-3xl"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 0.9, 0.6]
              }}
              transition={{ duration: 1, repeat: Infinity }}
            />

            {/* Points container */}
            <div className="relative bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-3xl p-8 border-4 border-white shadow-2xl">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <div className="text-2xl font-bold text-white mb-2 uppercase tracking-wider">
                  Points Earned!
                </div>
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    textShadow: [
                      '0 0 20px rgba(255,255,255,0.8)',
                      '0 0 40px rgba(255,255,255,1)',
                      '0 0 20px rgba(255,255,255,0.8)'
                    ]
                  }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="text-8xl font-black text-white"
                  style={{ textShadow: '0 0 30px rgba(255,255,255,0.9)' }}
                >
                  +{points}
                </motion.div>
              </motion.div>
            </div>

            {/* Sparkles */}
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={`sparkle-${i}`}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  backgroundColor: ['#fbbf24', '#10b981', '#3b82f6', '#ef4444', '#f59e0b'][i % 5],
                  left: '50%',
                  top: '50%'
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: (Math.cos((i / 30) * Math.PI * 2) * 200) + (Math.random() - 0.5) * 100,
                  y: (Math.sin((i / 30) * Math.PI * 2) * 200) + (Math.random() - 0.5) * 100,
                  opacity: 0,
                  scale: 0,
                  rotate: Math.random() * 720
                }}
                transition={{
                  duration: 1.5,
                  delay: 0.2 + (i * 0.02),
                  ease: 'easeOut'
                }}
              />
            ))}

            {/* Stars */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={`star-${i}`}
                className="absolute text-yellow-300 text-4xl"
                style={{
                  left: '50%',
                  top: '50%'
                }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{
                  x: Math.cos((i / 12) * Math.PI * 2) * 150,
                  y: Math.sin((i / 12) * Math.PI * 2) * 150,
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  rotate: [0, 180]
                }}
                transition={{
                  duration: 1.2,
                  delay: 0.3 + (i * 0.05),
                  ease: 'easeOut'
                }}
              >
                ★
              </motion.div>
            ))}

            {/* Money symbols */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`money-${i}`}
                className="absolute text-green-400 text-5xl font-bold"
                style={{
                  left: '50%',
                  top: '50%'
                }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{
                  x: (Math.random() - 0.5) * 300,
                  y: -200 - Math.random() * 100,
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1, 1, 0.5],
                  rotate: (Math.random() - 0.5) * 360
                }}
                transition={{
                  duration: 2,
                  delay: 0.4 + (i * 0.1),
                  ease: 'easeOut'
                }}
              >
                $
              </motion.div>
            ))}
          </motion.div>

          {/* Flash effect */}
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

