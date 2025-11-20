import { supabase } from "@/lib/supabaseClient";
import { Match } from "@/types/match";
import { BracketMatch } from "@/types/bracket";

export const getTournamentMatchesForBracket = async (
  tournamentId: string
): Promise<BracketMatch[]> => {
  let matches: Match[] = [];
  
  try {
    const { data: matchesData, error: matchesError } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("match_order", { ascending: true });

    if (matchesError) {
      console.error("Error fetching matches:", matchesError);
      throw new Error(`Failed to fetch matches: ${matchesError.message}`);
    }

    if (!matchesData || matchesData.length === 0) {
      return [];
    }

    matches = matchesData as Match[];

  const entryIds = new Set<string>();
  const courtIds = new Set<string>();
  const umpireIds = new Set<string>();
  const playerIds = new Set<string>();
  const teamIds = new Set<string>();

  matches.forEach((match) => {
    if (match.entry1_id) entryIds.add(match.entry1_id);
    if (match.entry2_id) entryIds.add(match.entry2_id);
    if (match.court_id) courtIds.add(match.court_id);
    if (match.umpire_id) umpireIds.add(match.umpire_id);
  });

  const entryIdArray = Array.from(entryIds);
  const courtIdArray = Array.from(courtIds);
  const umpireIdArray = Array.from(umpireIds);

  let entries: Array<{ id: string; player_id: string | null; team_id: string | null }> = [];
  let courts: Array<{ id: string; court_name: string }> = [];
  let umpires: Array<{ id: string; full_name: string }> = [];

  try {
    const [entriesResult, courtsResult, umpiresResult] = await Promise.all([
      entryIdArray.length > 0
        ? supabase
            .from("entries")
            .select("id, player_id, team_id")
            .in("id", entryIdArray)
        : Promise.resolve({ data: [], error: null }),
      courtIdArray.length > 0
        ? supabase
            .from("courts")
            .select("id, court_name")
            .in("id", courtIdArray)
        : Promise.resolve({ data: [], error: null }),
      umpireIdArray.length > 0
        ? supabase
            .from("umpires")
            .select("id, full_name")
            .in("id", umpireIdArray)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (entriesResult.error) {
      console.warn("Error fetching entries:", entriesResult.error);
    } else {
      entries = (entriesResult.data || []) as Array<{
        id: string;
        player_id: string | null;
        team_id: string | null;
      }>;
    }

    if (courtsResult.error) {
      console.warn("Error fetching courts:", courtsResult.error);
    } else {
      courts = (courtsResult.data || []) as Array<{ id: string; court_name: string }>;
    }

    if (umpiresResult.error) {
      console.warn("Error fetching umpires:", umpiresResult.error);
    } else {
      umpires = (umpiresResult.data || []) as Array<{ id: string; full_name: string }>;
    }
  } catch (err) {
    console.warn("Error in parallel fetch for entries/courts/umpires:", err);
  }

  entries.forEach((entry) => {
    if (entry.player_id) playerIds.add(entry.player_id);
    if (entry.team_id) teamIds.add(entry.team_id);
  });

  const playerIdArray = Array.from(playerIds);
  const teamIdArray = Array.from(teamIds);

  let players: Array<{ id: string; full_name: string }> = [];
  let teams: Array<{ id: string; name: string }> = [];

  try {
    const [playersResult, teamsResult] = await Promise.all([
      playerIdArray.length > 0
        ? supabase
            .from("players")
            .select("id, full_name")
            .in("id", playerIdArray)
        : Promise.resolve({ data: [], error: null }),
      teamIdArray.length > 0
        ? supabase
            .from("teams")
            .select("id, name")
            .in("id", teamIdArray)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (playersResult.error) {
      console.warn("Error fetching players (table may not exist):", playersResult.error);
    } else {
      players = (playersResult.data || []) as Array<{ id: string; full_name: string }>;
    }

    if (teamsResult.error) {
      console.warn("Error fetching teams (table may not exist):", teamsResult.error);
    } else {
      teams = (teamsResult.data || []) as Array<{ id: string; name: string }>;
    }
  } catch (err) {
    console.warn("Error in parallel fetch for players/teams:", err);
  }

  const entryMap = new Map(entries.map((e) => [e.id, e]));
  const courtMap = new Map(courts.map((c) => [c.id, c.court_name]));
  const umpireMap = new Map(umpires.map((u) => [u.id, u.full_name]));
  const playerMap = new Map(players.map((p) => [p.id, p.full_name]));
  const teamMap = new Map(teams.map((t) => [t.id, t.name]));

  const bracketMatches: BracketMatch[] = matches.map((match) => {
    let entry1Name: string | null = null;
    let entry2Name: string | null = null;

    if (match.entry1_id) {
      const entry = entryMap.get(match.entry1_id);
      if (entry) {
        if (entry.player_id) {
          entry1Name = playerMap.get(entry.player_id) || `Player ${match.entry1_id.slice(0, 8)}`;
        } else if (entry.team_id) {
          entry1Name = teamMap.get(entry.team_id) || `Team ${match.entry1_id.slice(0, 8)}`;
        } else {
          entry1Name = `Entry ${match.entry1_id.slice(0, 8)}`;
        }
      } else {
        entry1Name = `Entry ${match.entry1_id.slice(0, 8)}`;
      }
    }

    if (match.entry2_id) {
      const entry = entryMap.get(match.entry2_id);
      if (entry) {
        if (entry.player_id) {
          entry2Name = playerMap.get(entry.player_id) || `Player ${match.entry2_id.slice(0, 8)}`;
        } else if (entry.team_id) {
          entry2Name = teamMap.get(entry.team_id) || `Team ${match.entry2_id.slice(0, 8)}`;
        } else {
          entry2Name = `Entry ${match.entry2_id.slice(0, 8)}`;
        }
      } else {
        entry2Name = `Entry ${match.entry2_id.slice(0, 8)}`;
      }
    }

    return {
      id: match.id,
      tournament_id: match.tournament_id,
      round: match.round,
      match_order: match.match_order,
      entry1_id: match.entry1_id,
      entry2_id: match.entry2_id,
      entry1_name: entry1Name,
      entry2_name: entry2Name,
      court_id: match.court_id,
      court_name: match.court_id ? courtMap.get(match.court_id) || null : null,
      umpire_id: match.umpire_id,
      umpire_name: match.umpire_id ? umpireMap.get(match.umpire_id) || null : null,
      scheduled_time: match.scheduled_time,
      status: match.is_completed ? "completed" : "scheduled",
      winner_entry_id: match.winner_entry_id,
      is_completed: match.is_completed,
    };
  });

    return bracketMatches;
  } catch (error) {
    console.error("Error in getTournamentMatchesForBracket:", error);
    // Return matches with minimal data if full lookup fails
    if (matches && matches.length > 0) {
      console.warn("Falling back to minimal match data due to error:", error);
      return matches.map((match) => ({
        id: match.id,
        tournament_id: match.tournament_id,
        round: match.round,
        match_order: match.match_order,
        entry1_id: match.entry1_id,
        entry2_id: match.entry2_id,
        entry1_name: match.entry1_id ? `Entry ${match.entry1_id.slice(0, 8)}` : null,
        entry2_name: match.entry2_id ? `Entry ${match.entry2_id.slice(0, 8)}` : null,
        court_id: match.court_id,
        court_name: null,
        umpire_id: match.umpire_id,
        umpire_name: null,
        scheduled_time: match.scheduled_time,
        status: match.is_completed ? "completed" : "scheduled",
        winner_entry_id: match.winner_entry_id,
        is_completed: match.is_completed,
      }));
    }
    // If we don't have matches, re-throw the error
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to load bracket: ${errorMessage}`);
  }
};

