"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type TutorialOverlayProps = {
  show: boolean;
  onClose: () => void;
};

export default function TutorialOverlay({ show, onClose }: TutorialOverlayProps) {
  const [currentPage, setCurrentPage] = useState(0);

  const pages = [
    // Page 0: Welcome
    {
      title: "Welcome to NBA Shot Predictor",
      content: (
        <div className="space-y-6">
          <p className="text-lg text-slate-200">
            Use your webcam to predict NBA shots in real-time and earn points!
          </p>
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-6">
            <h3 className="mb-3 text-xl font-bold text-emerald-300">How It Works</h3>
            <ol className="space-y-3 text-slate-200">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-300">
                  1
                </span>
                <span>Watch the live NBA game data</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-300">
                  2
                </span>
                <span>When you see "SHOT INCOMING", make a shooting gesture</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-300">
                  3
                </span>
                <span>Earn points if the shot goes in!</span>
              </li>
            </ol>
          </div>
        </div>
      ),
    },
    // Page 1: Poses
    {
      title: "Shooting Gestures",
      content: (
        <div className="space-y-6">
          <p className="text-slate-200">
            Match the shot type for bonus multipliers!
          </p>
          
          {/* Normal Shot */}
          <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-6">
            <h3 className="mb-4 text-lg font-bold text-blue-300">Normal Shot</h3>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <svg className="h-48 w-full" viewBox="0 0 200 300" fill="none">
                  {/* Head */}
                  <circle cx="100" cy="40" r="20" fill="#60A5FA" opacity="0.8" />
                  {/* Body */}
                  <line x1="100" y1="60" x2="100" y2="150" stroke="#60A5FA" strokeWidth="6" />
                  {/* Arms (both raised) */}
                  <line x1="100" y1="80" x2="60" y2="40" stroke="#60A5FA" strokeWidth="6" />
                  <line x1="100" y1="80" x2="140" y2="40" stroke="#60A5FA" strokeWidth="6" />
                  {/* Legs */}
                  <line x1="100" y1="150" x2="80" y2="200" stroke="#60A5FA" strokeWidth="6" />
                  <line x1="100" y1="150" x2="120" y2="200" stroke="#60A5FA" strokeWidth="6" />
                  {/* Hands */}
                  <circle cx="60" cy="40" r="6" fill="#60A5FA" />
                  <circle cx="140" cy="40" r="6" fill="#60A5FA" />
                </svg>
              </div>
              <div className="flex-1 text-sm text-slate-200">
                <p className="font-semibold text-blue-300 mb-2">Both arms raised above head</p>
                <p>Classic jump shot form. Raise both arms above your head as if shooting a basketball.</p>
              </div>
            </div>
          </div>

          {/* Layup */}
          <div className="rounded-lg border border-yellow-400/30 bg-yellow-500/10 p-6">
            <h3 className="mb-4 text-lg font-bold text-yellow-300">Layup</h3>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <svg className="h-48 w-full" viewBox="0 0 200 300" fill="none">
                  {/* Head */}
                  <circle cx="100" cy="40" r="20" fill="#FBBF24" opacity="0.8" />
                  {/* Body */}
                  <line x1="100" y1="60" x2="100" y2="150" stroke="#FBBF24" strokeWidth="6" />
                  {/* Arms (one raised at angle) */}
                  <line x1="100" y1="80" x2="140" y2="50" stroke="#FBBF24" strokeWidth="6" />
                  <line x1="100" y1="80" x2="70" y2="120" stroke="#FBBF24" strokeWidth="6" />
                  {/* Legs */}
                  <line x1="100" y1="150" x2="80" y2="200" stroke="#FBBF24" strokeWidth="6" />
                  <line x1="100" y1="150" x2="120" y2="200" stroke="#FBBF24" strokeWidth="6" />
                  {/* Hands */}
                  <circle cx="140" cy="50" r="6" fill="#FBBF24" />
                  <circle cx="70" cy="120" r="6" fill="#FBBF24" />
                </svg>
              </div>
              <div className="flex-1 text-sm text-slate-200">
                <p className="font-semibold text-yellow-300 mb-2">One arm extended at angle</p>
                <p>Reach up with one arm extended, mimicking a layup motion toward the basket.</p>
              </div>
            </div>
          </div>

          {/* Dunk */}
          <div className="rounded-lg border border-purple-400/30 bg-purple-500/10 p-6">
            <h3 className="mb-4 text-lg font-bold text-purple-300">Dunk</h3>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <svg className="h-48 w-full" viewBox="0 0 200 300" fill="none">
                  {/* Head */}
                  <circle cx="100" cy="40" r="20" fill="#A78BFA" opacity="0.8" />
                  {/* Body */}
                  <line x1="100" y1="60" x2="100" y2="150" stroke="#A78BFA" strokeWidth="6" />
                  {/* Arms (one hand on head) */}
                  <line x1="100" y1="80" x2="100" y2="35" stroke="#A78BFA" strokeWidth="6" />
                  <line x1="100" y1="80" x2="70" y2="120" stroke="#A78BFA" strokeWidth="6" />
                  {/* Legs */}
                  <line x1="100" y1="150" x2="80" y2="200" stroke="#A78BFA" strokeWidth="6" />
                  <line x1="100" y1="150" x2="120" y2="200" stroke="#A78BFA" strokeWidth="6" />
                  {/* Hands */}
                  <circle cx="100" cy="30" r="8" fill="#A78BFA" />
                  <circle cx="70" cy="120" r="6" fill="#A78BFA" />
                </svg>
              </div>
              <div className="flex-1 text-sm text-slate-200">
                <p className="font-semibold text-purple-300 mb-2">One hand on top of head</p>
                <p>Place one hand directly on or above your head, like celebrating a massive dunk!</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    // Page 2: Scoring
    {
      title: "Scoring System",
      content: (
        <div className="space-y-6">
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-6">
            <h3 className="mb-4 text-xl font-bold text-emerald-300">Base Points</h3>
            <div className="space-y-3 text-slate-200">
              <div className="flex items-center justify-between">
                <span>Correct prediction (shot made):</span>
                <span className="font-bold text-emerald-300">+1,000 points</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Incorrect prediction (shot missed):</span>
                <span className="font-bold text-red-300">-1,000 points</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-6">
            <h3 className="mb-4 text-xl font-bold text-blue-300">Multipliers</h3>
            
            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/30 text-xs font-bold">1</div>
                <span className="font-semibold text-blue-200">Shot Type Match</span>
              </div>
              <p className="ml-8 text-sm text-slate-300">
                Match the exact shot type (normal/layup/dunk) for <span className="font-bold text-blue-300">2x multiplier</span>
              </p>
            </div>

            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/30 text-xs font-bold">2</div>
                <span className="font-semibold text-blue-200">Streak Bonus</span>
              </div>
              <p className="ml-8 text-sm text-slate-300">
                Each correct prediction adds <span className="font-bold text-blue-300">+0.2x</span> (1.0x → 1.2x → 1.4x...)
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-500/30 text-xs font-bold">3</div>
                <span className="font-semibold text-purple-200">Player Odds</span>
              </div>
              <p className="ml-8 text-sm text-slate-300 mb-2">
                <span className="font-bold text-purple-300">NEW!</span> Multipliers based on player shooting %:
              </p>
              <div className="ml-8 space-y-1 text-xs text-slate-400">
                <div>• <span className="text-emerald-300">Good shooters</span>: Lower rewards (0.8x-1.4x), higher losses (1.5x-2.4x)</div>
                <div>• <span className="text-yellow-300">Streaky shooters</span>: Higher rewards (1.3x-2.4x), lower losses (0.6x-1.0x)</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-yellow-400/30 bg-yellow-500/10 p-6">
            <h3 className="mb-4 text-xl font-bold text-yellow-300">Example Calculation</h3>
            <div className="space-y-2 text-sm text-slate-200">
              <div className="flex justify-between">
                <span>Base points:</span>
                <span className="font-mono">1,000</span>
              </div>
              <div className="flex justify-between text-blue-300">
                <span>× Shot type match:</span>
                <span className="font-mono">2.0x</span>
              </div>
              <div className="flex justify-between text-blue-300">
                <span>× Streak (3rd in a row):</span>
                <span className="font-mono">1.4x</span>
              </div>
              <div className="flex justify-between text-purple-300">
                <span>× Player odds (good shooter):</span>
                <span className="font-mono">0.9x</span>
              </div>
              <div className="h-px bg-slate-600 my-2"></div>
              <div className="flex justify-between text-lg font-bold text-emerald-300">
                <span>Total:</span>
                <span className="font-mono">2,520 points</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleBack = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleClose = () => {
    setCurrentPage(0);
    onClose();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border-2 border-emerald-400/40 bg-gradient-to-br from-[#0f192b] via-[#1a1d29] to-[#0f192b] shadow-[0_0_80px_rgba(16,185,129,0.4)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-emerald-400/30 bg-emerald-500/10 px-8 py-6">
              <h2 className="text-3xl font-bold text-emerald-300">
                {pages[currentPage].title}
              </h2>
              <div className="mt-3 flex gap-2">
                {pages.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      idx === currentPage
                        ? "bg-emerald-400"
                        : idx < currentPage
                        ? "bg-emerald-400/50"
                        : "bg-slate-600"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[calc(90vh-240px)] overflow-y-auto p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {pages[currentPage].content}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="border-t border-emerald-400/30 bg-[#0b1527] px-8 py-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={currentPage === 0 ? handleClose : handleBack}
                  className="rounded-lg border border-slate-500/40 bg-slate-600/20 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-slate-200 transition hover:bg-slate-600/40"
                >
                  {currentPage === 0 ? "Close" : "Back"}
                </button>
                
                <div className="text-sm text-slate-400">
                  Page {currentPage + 1} of {pages.length}
                </div>

                {currentPage < pages.length - 1 ? (
                  <button
                    onClick={handleNext}
                    className="rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-emerald-200 transition hover:bg-emerald-500/35"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={handleClose}
                    className="rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-emerald-200 transition hover:bg-emerald-500/35"
                  >
                    Start Playing
                  </button>
                )}
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-500/40 bg-slate-600/20 text-slate-300 transition hover:bg-slate-600/40 hover:text-white"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

