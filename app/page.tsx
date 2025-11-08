'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { SimplifiedGame } from '@/components/types';

export default function HomePage() {
	const [games, setGames] = useState<SimplifiedGame[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		async function load() {
			try {
				const res = await fetch('/api/games', { cache: 'no-store' });
				const data = await res.json();
				if (!active) return;
				setGames(data.games ?? []);
				setError(null);
			} catch {
				if (active) setError('Failed to load games');
			} finally {
				if (active) setLoading(false);
			}
		}
		load();
		const id = setInterval(load, 10000);
		return () => {
			active = false;
			clearInterval(id);
		};
	}, []);

	if (loading) return <div>Loading live games...</div>;
	if (error) return <div className="text-red-400">{error}</div>;

	// Add test game if no live games
	const testGame: SimplifiedGame = {
		id: 'test001',
		status: 2,
		statusText: 'TEST GAME',
		period: 2,
		gameClock: 'PT05M23.00S',
		home: {
			name: 'Lakers',
			tricode: 'LAL',
			id: 1610612747,
			score: 58,
			logo: 'https://cdn.nba.com/logos/nba/1610612747/global/L/logo.svg'
		},
		away: {
			name: 'Celtics',
			tricode: 'BOS',
			id: 1610612738,
			score: 62,
			logo: 'https://cdn.nba.com/logos/nba/1610612738/global/L/logo.svg'
		}
	};

	const allGames = games.length > 0 ? games : [testGame];

	return (
		<div>
			{games.length === 0 && (
				<div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-sm">
					No live games right now. Showing test game for demo purposes.
				</div>
			)}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{allGames.map((g) => (
				<Link key={g.id} href={`/game/${g.id}`} className="glass rounded-xl p-4 hover:bg-white/15 transition">
					<div className="flex items-center gap-3">
						<img src={g.away.logo} alt={g.away.tricode} className="w-10 h-10" />
						<div className="flex-1">
							<div className="flex justify-between">
								<div className="font-semibold">{g.away.tricode}</div>
								<div className="font-mono">{g.away.score}</div>
							</div>
							<div className="text-xs opacity-75">{g.away.name}</div>
						</div>
					</div>
					<div className="mt-2 flex items-center gap-3">
						<img src={g.home.logo} alt={g.home.tricode} className="w-10 h-10" />
						<div className="flex-1">
							<div className="flex justify-between">
								<div className="font-semibold">{g.home.tricode}</div>
								<div className="font-mono">{g.home.score}</div>
							</div>
							<div className="text-xs opacity-75">{g.home.name}</div>
						</div>
					</div>
					<div className="mt-3 text-xs opacity-70">
						{g.statusText} {g.gameClock ? `• ${g.gameClock}` : ''}
					</div>
				</Link>
			))}
			</div>
		</div>
	);
}


