import { supabase } from "@/lib/supabaseClient";
import { Match } from "@/types/match";

/**
 * Start a match - marks the match as started, and marks the umpire and court as not idle
 */
export const startMatch = async (matchId: string): Promise<void> => {
  // First, get the match details - use select("*") to get all columns
  // This works whether the migration has been run or not
  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (matchError) {
    console.error("Error fetching match:", matchError);
    // Provide more helpful error message
    if (matchError.code === "PGRST116") {
      throw new Error("Match not found.");
    }
    throw new Error(`Failed to fetch match: ${matchError.message}`);
  }

  if (!matchData) {
    throw new Error("Match not found.");
  }

  if (matchData.is_completed) {
    throw new Error("This match has already been completed.");
  }

  // Check if match has already been started (only if actual_start_time column exists)
  if (matchData.actual_start_time) {
    throw new Error("This match has already been started.");
  }

  const now = new Date().toISOString();

  // Start a transaction-like operation
  // Update the match with actual_start_time
  // Note: If actual_start_time column doesn't exist, this will fail
  // User should run migration_add_actual_start_time_matches.sql first
  const { error: updateMatchError } = await supabase
    .from("matches")
    .update({ actual_start_time: now })
    .eq("id", matchId);

  if (updateMatchError) {
    // Check if error is because column doesn't exist
    if (updateMatchError.message?.includes("actual_start_time") || 
        updateMatchError.message?.includes("column") ||
        updateMatchError.code === "42703") {
      throw new Error(
        "Database migration not applied. Please run migration_add_actual_start_time_matches.sql first."
      );
    }
    throw new Error(`Failed to start match: ${updateMatchError.message}`);
  }

  // Update the umpire if assigned
  // Note: If idle tracking columns don't exist, these will fail silently
  // User should run migration_add_idle_tracking_umpires.sql first
  if (matchData.umpire_id) {
    const { error: updateUmpireError } = await supabase
      .from("umpires")
      .update({
        is_idle: false,
        last_assigned_start_time: now,
        last_assigned_match_id: matchId,
      })
      .eq("id", matchData.umpire_id);

    if (updateUmpireError) {
      console.error("Failed to update umpire idle status:", updateUmpireError);
      // Check if columns don't exist - provide helpful error
      if (updateUmpireError.message?.includes("is_idle") ||
          updateUmpireError.message?.includes("last_assigned") ||
          updateUmpireError.code === "42703") {
        console.warn(
          "Umpire idle tracking columns may not exist. " +
          "Run migration_add_idle_tracking_umpires.sql to enable this feature."
        );
      }
      // Don't throw - the match start is more important
    }
  }

  // Update the court if assigned
  // Note: If idle tracking columns don't exist, these will fail silently
  // User should run migration_add_idle_tracking_courts.sql first
  if (matchData.court_id) {
    const { error: updateCourtError } = await supabase
      .from("courts")
      .update({
        is_idle: false,
        last_assigned_start_time: now,
        last_assigned_match_id: matchId,
      })
      .eq("id", matchData.court_id);

    if (updateCourtError) {
      console.error("Failed to update court idle status:", updateCourtError);
      // Check if columns don't exist - provide helpful error
      if (updateCourtError.message?.includes("is_idle") ||
          updateCourtError.message?.includes("last_assigned") ||
          updateCourtError.code === "42703") {
        console.warn(
          "Court idle tracking columns may not exist. " +
          "Run migration_add_idle_tracking_courts.sql to enable this feature."
        );
      }
      // Don't throw - the match start is more important
    }
  }
};

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


