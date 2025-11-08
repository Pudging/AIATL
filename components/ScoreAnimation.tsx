'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function ScoreAnimation({ mode }: { mode: 'score' | 'miss' | null }) {
	const text = mode === 'score' ? 'Scored!' : 'Missed!';
	const color = mode === 'score' ? 'text-emerald-400' : 'text-rose-400';
	return (
		<AnimatePresence>
			{mode && (
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.8 }}
					className="pointer-events-none absolute inset-0 flex items-center justify-center"
				>
					<motion.div
						initial={{ filter: 'blur(6px)' }}
						animate={{ filter: 'blur(0px)' }}
						className={`text-5xl font-extrabold drop-shadow ${color}`}
					>
						{text}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}


