import { Tournament, CreateTournamentInput } from "@/types/tournament";
import { Entry } from "@/types/match";
import { supabase } from "@/lib/supabaseClient";

export const getTournaments = async (): Promise<Tournament[]> => {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("is_active", true)
    .order("start_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as Tournament[] | null) ?? [];
};

export const getOrganizerTournaments = async (organizerName: string): Promise<Tournament[]> => {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("organizer_name", organizerName)
    .order("start_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as Tournament[] | null) ?? [];
};

export const createTournament = async (input: CreateTournamentInput): Promise<Tournament> => {
  const { data, error } = await supabase
    .from("tournaments")
    .insert([input])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Tournament;
};

export const getTournamentById = async (id: string): Promise<Tournament | null> => {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(error.message);
  }

  return data as Tournament;
};

export const getTournamentEntriesCount = async (tournamentId: string): Promise<number> => {
  const { count, error } = await supabase
    .from("entries")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
};

export const getTournamentEntries = async (tournamentId: string): Promise<Entry[]> => {
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as Entry[] | null) ?? [];
};

export interface Court {
  id: string;
  tournament_id: string | null;
  court_name: string;
  location: string | null;
  created_at: string;
  is_idle: boolean;
  last_assigned_start_time: string | null;
  last_assigned_match_id: string | null;
}

export const getTournamentCourts = async (tournamentId: string): Promise<Court[]> => {
  const { data, error } = await supabase
    .from("courts")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("court_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as Court[] | null) ?? [];
};

export interface Umpire {
  id: string;
  tournament_id: string | null;
  full_name: string;
  contact: string | null;
  license_no: string | null;
  email: string | null;
  gender: "male" | "female" | "other" | null;
  age: number | null;
  experience_years: number | null;
  certification_level: "national" | "state" | "international" | null;
  association: string | null;
  bio: string | null;
  sports_expertise: string | null; // JSON array or comma-separated string
  created_at: string;
  is_idle: boolean;
  last_assigned_start_time: string | null;
  last_assigned_match_id: string | null;
}

export const getTournamentUmpires = async (tournamentId: string): Promise<Umpire[]> => {
  // Fetch umpires directly by tournament_id (similar to how courts are fetched)
  const { data: umpires, error: umpiresError } = await supabase
    .from("umpires")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("full_name", { ascending: true });

  if (umpiresError) {
    throw new Error(`Failed to fetch umpires: ${umpiresError.message}`);
  }

  return (umpires as Umpire[] | null) ?? [];
};

export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  wins: number;
  losses: number;
  points: number;
  matchesPlayed: number;
}

export const getTournamentLeaderboard = async (
  tournamentId: string
): Promise<LeaderboardEntry[]> => {
  // First, get all completed matches for this tournament
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("entry1_id, entry2_id, entry1_score, entry2_score, winner_entry_id")
    .eq("tournament_id", tournamentId)
    .eq("is_completed", true)
    .not("entry1_id", "is", null)
    .not("entry2_id", "is", null);

  if (matchesError) {
    throw new Error(`Failed to fetch matches: ${matchesError.message}`);
  }

  if (!matches || matches.length === 0) {
    return [];
  }

  // Get all unique entry IDs from matches
  const entryIds = new Set<string>();
  matches.forEach((match) => {
    if (match.entry1_id) entryIds.add(match.entry1_id);
    if (match.entry2_id) entryIds.add(match.entry2_id);
  });

  // Fetch entries with their player/team info
  const { data: entries, error: entriesError } = await supabase
    .from("entries")
    .select("id, player_id, team_id")
    .in("id", Array.from(entryIds))
    .eq("tournament_id", tournamentId);

  if (entriesError) {
    throw new Error(`Failed to fetch entries: ${entriesError.message}`);
  }

  if (!entries || entries.length === 0) {
    return [];
  }

  // Get player and team IDs
  const playerIds = entries
    .map((e) => e.player_id)
    .filter((id): id is string => id !== null);
  const teamIds = entries
    .map((e) => e.team_id)
    .filter((id): id is string => id !== null);

  // Fetch players and teams
  const [playersResult, teamsResult] = await Promise.all([
    playerIds.length > 0
      ? supabase
          .from("players")
          .select("id, full_name")
          .in("id", playerIds)
      : { data: [], error: null },
    teamIds.length > 0
      ? supabase
          .from("teams")
          .select("id, team_name")
          .in("id", teamIds)
      : { data: [], error: null },
  ]);

  if (playersResult.error) {
    throw new Error(`Failed to fetch players: ${playersResult.error.message}`);
  }
  if (teamsResult.error) {
    throw new Error(`Failed to fetch teams: ${teamsResult.error.message}`);
  }

  // Create maps for quick lookup
  const playersMap = new Map(
    (playersResult.data || []).map((p) => [p.id, p.full_name])
  );
  const teamsMap = new Map(
    (teamsResult.data || []).map((t) => [t.id, t.team_name])
  );
  const entryMap = new Map(
    entries.map((e) => [
      e.id,
      {
        playerId: e.player_id,
        teamId: e.team_id,
      },
    ])
  );

  // Helper to get entry name
  const getEntryName = (entryId: string): string => {
    const entry = entryMap.get(entryId);
    if (!entry) return "Unknown";
    if (entry.playerId) {
      return playersMap.get(entry.playerId) || "Unknown Player";
    }
    if (entry.teamId) {
      return teamsMap.get(entry.teamId) || "Unknown Team";
    }
    return "Unknown";
  };

  // Calculate stats for each entry
  const statsMap = new Map<
    string,
    { wins: number; losses: number; points: number; matchesPlayed: number }
  >();

  matches.forEach((match) => {
    const entry1Id = match.entry1_id!;
    const entry2Id = match.entry2_id!;
    const entry1Score = match.entry1_score ?? 0;
    const entry2Score = match.entry2_score ?? 0;
    const winnerId = match.winner_entry_id;

    // Initialize stats if not exists
    if (!statsMap.has(entry1Id)) {
      statsMap.set(entry1Id, { wins: 0, losses: 0, points: 0, matchesPlayed: 0 });
    }
    if (!statsMap.has(entry2Id)) {
      statsMap.set(entry2Id, { wins: 0, losses: 0, points: 0, matchesPlayed: 0 });
    }

    const entry1Stats = statsMap.get(entry1Id)!;
    const entry2Stats = statsMap.get(entry2Id)!;

    // Update matches played
    entry1Stats.matchesPlayed++;
    entry2Stats.matchesPlayed++;

    // Update points
    entry1Stats.points += entry1Score;
    entry2Stats.points += entry2Score;

    // Update wins/losses
    if (winnerId === entry1Id) {
      entry1Stats.wins++;
      entry2Stats.losses++;
    } else if (winnerId === entry2Id) {
      entry2Stats.wins++;
      entry1Stats.losses++;
    }
    // If no winner is set, neither gets a win/loss (draw scenario)
  });

  // Convert to array and sort
  const leaderboard: LeaderboardEntry[] = Array.from(statsMap.entries())
    .map(([entryId, stats]) => ({
      rank: 0, // Will be set after sorting
      playerName: getEntryName(entryId),
      wins: stats.wins,
      losses: stats.losses,
      points: stats.points,
      matchesPlayed: stats.matchesPlayed,
    }))
    .sort((a, b) => {
      // Sort by: wins (desc), then points (desc), then losses (asc)
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.points !== a.points) return b.points - a.points;
      return a.losses - b.losses;
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  return leaderboard;
};

