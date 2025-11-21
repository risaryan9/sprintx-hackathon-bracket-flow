import { supabase } from "@/lib/supabaseClient";
import { Match } from "@/types/match";

/**
 * Update match winner and completion status
 */
export const updateMatchWinner = async (
  matchId: string,
  winnerEntryId: string | null
): Promise<Match> => {
  const { data, error } = await supabase
    .from("matches")
    .update({
      winner_entry_id: winnerEntryId,
      is_completed: winnerEntryId !== null,
    })
    .eq("id", matchId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update match winner: ${error.message}`);
  }

  return data as Match;
};

/**
 * Check if all matches in the current round are completed
 */
export const areAllMatchesCompleted = async (
  tournamentId: string,
  round: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from("matches")
    .select("is_completed")
    .eq("tournament_id", tournamentId)
    .eq("round", round);

  if (error) {
    throw new Error(`Failed to check match completion: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return false;
  }

  return data.every((match) => match.is_completed === true);
};

/**
 * Get the current round name for a knockout tournament
 */
export const getCurrentRound = async (tournamentId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from("matches")
    .select("round, is_completed")
    .eq("tournament_id", tournamentId)
    .order("match_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to get current round: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Group by round and find the round with incomplete matches
  const rounds = new Map<string, { total: number; completed: number }>();
  
  data.forEach((match) => {
    if (!match.round) return;
    const stats = rounds.get(match.round) || { total: 0, completed: 0 };
    stats.total++;
    if (match.is_completed) {
      stats.completed++;
    }
    rounds.set(match.round, stats);
  });

  // Find the first round that has incomplete matches
  for (const [round, stats] of rounds.entries()) {
    if (stats.completed < stats.total) {
      return round;
    }
  }

  // If all matches are completed, return the last round
  const roundNames = Array.from(rounds.keys());
  return roundNames[roundNames.length - 1] || null;
};

/**
 * Get winners from a specific round
 */
export const getRoundWinners = async (
  tournamentId: string,
  round: string
): Promise<string[]> => {
  const { data, error } = await supabase
    .from("matches")
    .select("winner_entry_id")
    .eq("tournament_id", tournamentId)
    .eq("round", round)
    .not("winner_entry_id", "is", null);

  if (error) {
    throw new Error(`Failed to get round winners: ${error.message}`);
  }

  const winners = (data || [])
    .map((match) => match.winner_entry_id)
    .filter((id): id is string => id !== null);

  return winners;
};


