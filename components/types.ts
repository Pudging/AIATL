export type SimplifiedTeam = {
  name: string;
  tricode: string;
  id: number;
  score: number;
  logo: string;
};

export type SimplifiedGame = {
  id: string;
  status: number;
  statusText: string;
  period: string | number | null;
  gameClock: string;
  home: SimplifiedTeam;
  away: SimplifiedTeam;
};

export type PlayerStat = {
  personId: string;
  name: string;
  teamTricode?: string;
  fga: number;
  fgm: number;
  pts: number;
  fgPct: number;
};

export type ParsedGameState = {
  period: number | string | null;
  clock: string;
  score: { home: number; away: number };
  shooter: { personId?: string; name?: string; teamTricode?: string; result?: string } | null;
  ballHandler: { personId?: string; name?: string; teamTricode?: string } | null;
  lastAction: any;
  players: PlayerStat[];
};


