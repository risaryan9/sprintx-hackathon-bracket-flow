import { BracketMatch } from "@/types/bracket";

// Types matching react-brackets structure
export interface Seed {
  id: number | string;
  teams: Array<{
    name?: string;
    [key: string]: any;
  }>;
  date?: string;
  mobileBreakpoint?: number;
  [key: string]: any;
}

export interface RoundProps {
  seeds: Seed[];
  title: string;
  [key: string]: any;
}

export interface MatchSeed extends Seed {
  matchId?: string;
  scheduled_time?: string | null;
  court_name?: string | null;
  umpire_name?: string | null;
  is_completed?: boolean | null;
  winner_entry_id?: string | null;
  entry1_id?: string | null;
  entry2_id?: string | null;
  actual_start_time?: string | null;
  awaiting_result?: boolean | null;
  duration_minutes?: number | null;
}

export const transformMatchesToRounds = (
  matches: BracketMatch[],
  tournamentFormat: "knockouts" | "round_robin" | "double_elimination"
): RoundProps[] => {
  if (matches.length === 0) return [];

  // Group matches by round
  const matchesByRound = new Map<string, BracketMatch[]>();
  
  matches.forEach((match) => {
    const roundName = match.round || "Round 1";
    if (!matchesByRound.has(roundName)) {
      matchesByRound.set(roundName, []);
    }
    matchesByRound.get(roundName)!.push(match);
  });

  // Sort rounds (you might need to adjust this based on your round naming convention)
  const sortedRounds = Array.from(matchesByRound.entries()).sort((a, b) => {
    // Try to extract round number for sorting
    const aNum = extractRoundNumber(a[0]);
    const bNum = extractRoundNumber(b[0]);
    return aNum - bNum;
  });

  // Transform to RoundProps format
  const rounds: RoundProps[] = sortedRounds.map(([roundName, roundMatches]) => {
    // Sort matches by match_order within each round
    const sortedMatches = [...roundMatches].sort((a, b) => {
      const orderA = a.match_order ?? 0;
      const orderB = b.match_order ?? 0;
      return orderA - orderB;
    });

    const seeds: MatchSeed[] = sortedMatches.map((match) => ({
      id: match.id,
      matchId: match.id,
      date: match.scheduled_time 
        ? new Date(match.scheduled_time).toLocaleDateString()
        : undefined,
      teams: [
        {
          name: match.entry1_name || "TBD",
          id: match.entry1_id || undefined,
        },
        {
          name: match.entry2_name || "BYE",
          id: match.entry2_id || undefined,
        },
      ],
      scheduled_time: match.scheduled_time,
      court_name: match.court_name,
      umpire_name: match.umpire_name,
      is_completed: match.is_completed,
      winner_entry_id: match.winner_entry_id,
      entry1_id: match.entry1_id,
      entry2_id: match.entry2_id,
      actual_start_time: match.actual_start_time,
      awaiting_result: match.awaiting_result,
      duration_minutes: match.duration_minutes,
    }));

    return {
      title: roundName,
      seeds,
    };
  });

  return rounds;
};

// Helper to extract round number from round name
const extractRoundNumber = (roundName: string): number => {
  // Try common patterns like "Round of 16", "Quarterfinals", etc.
  const lower = roundName.toLowerCase();
  
  if (lower.includes("final") && !lower.includes("semi")) return 100;
  if (lower.includes("semifinal")) return 50;
  if (lower.includes("quarterfinal")) return 25;
  if (lower.includes("round of")) {
    const match = roundName.match(/round of (\d+)/i);
    if (match) return parseInt(match[1], 10);
  }
  
  const match = roundName.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);
  
  return 0;
};

