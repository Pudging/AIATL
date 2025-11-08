'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import type { ParsedGameState } from '@/components/types';
import WebcamGestureDetector from '@/components/WebcamGestureDetector';
import ScoreAnimation from '@/components/ScoreAnimation';

export default function GameViewPage() {
	const params = useParams<{ id: string }>();
	const id = params.id;
	const [state, setState] = useState<ParsedGameState | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [points, setPoints] = useState<number>(0);
	const [overlay, setOverlay] = useState<'score' | 'miss' | null>(null);
	const predictionsRef = useRef<{ ts: number; period?: number | string | null; clock?: string }[]>([]);

	useEffect(() => {
		let active = true;
		async function load() {
			try {
				const res = await fetch(`/api/games/${id}`, { cache: 'no-store' });
				const data = await res.json();
				if (!active) return;
				if (data?.state) {
					setState(data.state);
					checkPredictionsAgainstUpdate(data.state);
				}
				setError(null);
			} catch {
				if (active) setError('Failed to fetch live update');
			}
		}
		load();
		const timer = setInterval(load, 3000);
		return () => {
			active = false;
			clearInterval(timer);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id]);

	function registerPrediction(pred: { ts: number; period?: number | string | null; clock?: string }) {
		predictionsRef.current.push(pred);
		if (predictionsRef.current.length > 10) predictionsRef.current.shift();
	}

	function checkPredictionsAgainstUpdate(gameState: ParsedGameState) {
		const lastShot = gameState?.lastAction?.actionType === 'shot' ? gameState.lastAction : null;
		if (!lastShot) return;
		const isMade = (lastShot.shotResult || '').toLowerCase() === 'made';
		const recent = predictionsRef.current.filter((p) => Date.now() - p.ts < 15000);
		if (recent.length === 0) return;
		// consume predictions on a shot event
		predictionsRef.current = [];
		if (isMade) {
			setPoints((v) => v + 10);
			setOverlay('score');
			setTimeout(() => setOverlay(null), 1500);
		} else {
			setOverlay('miss');
			setTimeout(() => setOverlay(null), 900);
		}
	}

	const sortedPlayers = useMemo(() => {
		return (state?.players ?? []).slice().sort((a, b) => b.pts - a.pts);
	}, [state]);

	return (
		<div className="grid lg:grid-cols-2 gap-6">
			<div className="glass rounded-xl p-4">
				<div className="flex items-center justify-between mb-3">
					<div className="text-sm opacity-75">Period {state?.period ?? '-'}</div>
					<div className="text-lg font-mono">{state?.clock ?? ''}</div>
					<div className="text-sm">Points: <span className="font-bold">{points}</span></div>
				</div>
				<div className="flex items-center justify-between">
					<div className="text-2xl font-semibold">{state?.score?.away ?? 0}</div>
					<div className="text-xs opacity-70">Score</div>
					<div className="text-2xl font-semibold">{state?.score?.home ?? 0}</div>
				</div>
				<div className="mt-4 grid grid-cols-2 gap-3">
					<div className="text-sm">
						<div className="opacity-70 mb-1">Ball currently with:</div>
						<div className="font-semibold">{state?.ballHandler?.name ?? '—'} {state?.ballHandler?.teamTricode ? `(${state.ballHandler.teamTricode})` : ''}</div>
					</div>
					<div className="text-sm">
						<div className="opacity-70 mb-1">Shooter:</div>
						<div className="font-semibold">
							{state?.shooter?.name ?? '—'}
							{state?.shooter?.teamTricode ? ` (${state.shooter.teamTricode})` : ''}
							{state?.shooter?.result ? ` — ${state.shooter.result}` : ''}
						</div>
					</div>
				</div>
				<div className="mt-4">
					<div className="opacity-70 text-sm mb-2">Player points and FG%</div>
					<div className="max-h-64 overflow-auto pr-2">
						<table className="w-full text-sm">
							<thead className="text-xs opacity-70">
								<tr>
									<th className="text-left py-1">Player</th>
									<th className="text-right">PTS</th>
									<th className="text-right">FG</th>
									<th className="text-right">FG%</th>
								</tr>
							</thead>
							<tbody>
								{sortedPlayers.map((p) => (
									<tr key={p.personId} className="border-t border-white/10">
										<td className="py-1">{p.name} {p.teamTricode ? `(${p.teamTricode})` : ''}</td>
										<td className="text-right font-mono">{p.pts}</td>
										<td className="text-right font-mono">{p.fgm}/{p.fga}</td>
										<td className="text-right font-mono">{p.fgPct}%</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
			<div className="relative glass rounded-xl p-3">
				<WebcamGestureDetector onShootGesture={() => registerPrediction({ ts: Date.now(), period: state?.period, clock: state?.clock })} />
				{overlay && <ScoreAnimation mode={overlay} />}
				{error && <div className="absolute bottom-3 left-3 right-3 text-xs text-red-400">{error}</div>}
			</div>
		</div>
	);
}


