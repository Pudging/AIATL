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
		const timer = setInterval(load, 1500);
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

	const lastAction = state?.lastAction;
	const recentActions = state?.recentActions ?? [];
	const lastShot = state?.lastShot;

	return (
		<div className="grid lg:grid-cols-2 gap-6">
			<div className="glass rounded-xl p-4 space-y-4">
				{/* Header: Period, Clock, User Points */}
				<div className="flex items-center justify-between">
					<div className="text-sm opacity-75">Period {state?.period ?? '-'}</div>
					<div className="text-2xl font-mono font-bold">{state?.clock ?? '--:--'}</div>
					<div className="text-sm">Your Points: <span className="font-bold text-green-400">{points}</span></div>
				</div>

				{/* Live Score */}
				<div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
					<div>
						<div className="text-xs opacity-60">{state?.awayTeam ?? 'Away'}</div>
						<div className="text-3xl font-bold">{state?.score?.away ?? 0}</div>
					</div>
					<div className="text-xs opacity-70">LIVE</div>
					<div className="text-right">
						<div className="text-xs opacity-60">{state?.homeTeam ?? 'Home'}</div>
						<div className="text-3xl font-bold">{state?.score?.home ?? 0}</div>
					</div>
				</div>

				{/* Last Shot Taken */}
				{lastShot && lastShot.playerName && (
					<div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-3 border border-yellow-500/30">
						<div className="text-xs opacity-70 mb-1">Last Shot</div>
						<div className="text-lg font-semibold">
							{lastShot.playerName}
							{lastShot.teamTricode && <span className="ml-2 text-sm opacity-75">({lastShot.teamTricode})</span>}
						</div>
						<div className="flex items-center gap-2 mt-1">
							<span className={`text-sm font-bold ${lastShot.shotResult && lastShot.shotResult.toLowerCase().includes('made') ? 'text-green-400' : 'text-red-400'}`}>
								{lastShot.shotResult || 'Unknown'}
							</span>
							{lastShot.shotType && <span className="text-xs opacity-70">{lastShot.shotType}</span>}
							<span className="text-xs font-mono bg-white/10 px-1.5 py-0.5 rounded">+{lastShot.points || '?'}</span>
						</div>
						{lastShot.description && <div className="text-xs opacity-60 mt-1">{lastShot.description}</div>}
					</div>
				)}

				{/* Current Possession */}
				<div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-3">
					<div className="text-xs opacity-70 mb-1">Ball Handler</div>
					<div className="text-lg font-semibold">
						{state?.ballHandler?.name ?? '—'}
						{state?.ballHandler?.teamTricode && <span className="ml-2 text-sm opacity-75">({state.ballHandler.teamTricode})</span>}
					</div>
				</div>

				{/* Current Shooter */}
				{state?.shooter && (
					<div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg p-3">
						<div className="text-xs opacity-70 mb-1">Active Shooter</div>
						<div className="text-lg font-semibold">
							{state.shooter.name}
							{state.shooter.teamTricode && <span className="ml-2 text-sm opacity-75">({state.shooter.teamTricode})</span>}
						</div>
						{state.shooter.result && <div className="text-sm mt-1 opacity-80">{state.shooter.result}</div>}
					</div>
				)}

				{/* Last Action */}
				{lastAction && (
					<div className="bg-white/5 rounded-lg p-3">
						<div className="text-xs opacity-70 mb-1">Last Action</div>
						<div className="text-sm">
							<span className="font-semibold">{lastAction.playerName ?? 'Unknown'}</span>
							{lastAction.teamTricode && <span className="opacity-75"> ({lastAction.teamTricode})</span>}
							{lastAction.actionType && <span className="ml-2 text-xs bg-white/10 px-2 py-0.5 rounded">{lastAction.actionType}</span>}
							{lastAction.shotResult && <span className="ml-2 text-xs font-semibold">{lastAction.shotResult}</span>}
							{lastAction.description && <div className="text-xs opacity-60 mt-1">{lastAction.description}</div>}
						</div>
					</div>
				)}

				{/* Recent Actions Feed */}
				{recentActions.length > 0 && (
					<div>
						<div className="text-xs opacity-70 mb-2">Recent Actions</div>
						<div className="space-y-1 max-h-32 overflow-auto pr-2">
							{recentActions.slice(0, 5).map((act, i) => (
								<div key={i} className="text-xs bg-white/5 rounded px-2 py-1">
									<span className="font-semibold">{act.playerName ?? '?'}</span>
									{act.teamTricode && <span className="opacity-60"> ({act.teamTricode})</span>}
									{act.actionType && <span className="ml-1 opacity-75">— {act.actionType}</span>}
									{act.shotResult && <span className="ml-1 font-semibold">{act.shotResult}</span>}
								</div>
							))}
						</div>
					</div>
				)}

				{/* Player Stats Table */}
				<div>
					<div className="text-xs opacity-70 mb-2">Top Scorers</div>
					<div className="max-h-48 overflow-auto pr-2">
						<table className="w-full text-sm">
							<thead className="text-xs opacity-70 sticky top-0 bg-black/50">
								<tr>
									<th className="text-left py-1">Player</th>
									<th className="text-right">PTS</th>
									<th className="text-right">FG</th>
									<th className="text-right">FG%</th>
								</tr>
							</thead>
							<tbody>
								{sortedPlayers.slice(0, 10).map((p) => (
									<tr key={p.personId} className="border-t border-white/10">
										<td className="py-1">
											{p.name}
											{p.teamTricode && <span className="text-xs opacity-60 ml-1">({p.teamTricode})</span>}
										</td>
										<td className="text-right font-mono font-semibold">{p.pts}</td>
										<td className="text-right font-mono text-xs">{p.fgm}/{p.fga}</td>
										<td className="text-right font-mono text-xs">{p.fgPct}%</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			{/* Webcam + Gesture Detector */}
			<div className="relative glass rounded-xl p-3">
				<WebcamGestureDetector debug onShootGesture={() => registerPrediction({ ts: Date.now(), period: state?.period, clock: state?.clock })} />
				{overlay && <ScoreAnimation mode={overlay} />}
				{error && <div className="absolute bottom-3 left-3 right-3 text-xs text-red-400 bg-black/50 p-2 rounded">{error}</div>}
			</div>
		</div>
	);
}


