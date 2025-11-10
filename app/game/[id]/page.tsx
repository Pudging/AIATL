import GameExperience from "@/components/game/GameExperience";

type GamePageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function GamePage({ params, searchParams }: GamePageProps) {
  const sessionIdParam = (() => {
    const raw = searchParams?.sessionId;
    if (Array.isArray(raw)) return raw[0] ?? null;
    return raw ?? null;
  })();

  return (
    <GameExperience
      gameId={params.id}
      sessionIdParam={sessionIdParam}
    />
  );
}
