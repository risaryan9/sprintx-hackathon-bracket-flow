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
  const clubIds = new Set<string>();

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

  let players: Array<{ id: string; full_name: string; club_id: string | null }> = [];
  let teams: Array<{ id: string; team_name: string; club_id: string | null }> = [];

  try {
    const [playersResult, teamsResult] = await Promise.all([
      playerIdArray.length > 0
        ? supabase
            .from("players")
            .select("id, full_name, club_id")
            .in("id", playerIdArray)
        : Promise.resolve({ data: [], error: null }),
      teamIdArray.length > 0
        ? supabase
            .from("teams")
            .select("id, team_name, club_id")
            .in("id", teamIdArray)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (playersResult.error) {
      console.warn("Error fetching players (table may not exist):", playersResult.error);
    } else {
      players = (playersResult.data || []) as Array<{ id: string; full_name: string; club_id: string | null }>;
      // Collect club IDs from players
      players.forEach((player) => {
        if (player.club_id) clubIds.add(player.club_id);
      });
    }

    if (teamsResult.error) {
      console.warn("Error fetching teams (table may not exist):", teamsResult.error);
    } else {
      teams = (teamsResult.data || []) as Array<{ id: string; team_name: string; club_id: string | null }>;
      // Collect club IDs from teams
      teams.forEach((team) => {
        if (team.club_id) clubIds.add(team.club_id);
      });
    }
  } catch (err) {
    console.warn("Error in parallel fetch for players/teams:", err);
  }

  const clubIdArray = Array.from(clubIds);
  let clubs: Array<{ id: string; name: string }> = [];

  try {
    if (clubIdArray.length > 0) {
      const { data: clubsResult, error: clubsError } = await supabase
        .from("clubs")
        .select("id, name")
        .in("id", clubIdArray);

      if (clubsError) {
        console.warn("Error fetching clubs (table may not exist):", clubsError);
      } else {
        clubs = (clubsResult || []) as Array<{ id: string; name: string }>;
      }
    }
  } catch (err) {
    console.warn("Error fetching clubs:", err);
  }

  const entryMap = new Map(entries.map((e) => [e.id, e]));
  const courtMap = new Map(courts.map((c) => [c.id, c.court_name]));
  const umpireMap = new Map(umpires.map((u) => [u.id, u.full_name]));
  const playerMap = new Map(players.map((p) => [p.id, p.full_name]));
  const playerClubMap = new Map(players.map((p) => [p.id, p.club_id]));
  const teamMap = new Map(teams.map((t) => [t.id, t.team_name]));
  const teamClubMap = new Map(teams.map((t) => [t.id, t.club_id]));
  const clubMap = new Map(clubs.map((c) => [c.id, c.name]));

  const bracketMatches: BracketMatch[] = matches.map((match) => {
    let entry1Name: string | null = null;
    let entry2Name: string | null = null;
    let entry1ClubName: string | null = null;
    let entry2ClubName: string | null = null;

    if (match.entry1_id) {
      const entry = entryMap.get(match.entry1_id);
      if (entry) {
        if (entry.player_id) {
          entry1Name = playerMap.get(entry.player_id) || `Player ${match.entry1_id.slice(0, 8)}`;
          // Get club name for player
          const playerClubId = playerClubMap.get(entry.player_id);
          if (playerClubId) {
            entry1ClubName = clubMap.get(playerClubId) || null;
          }
        } else if (entry.team_id) {
          entry1Name = teamMap.get(entry.team_id) || `Team ${match.entry1_id.slice(0, 8)}`;
          // Get club name for team
          const teamClubId = teamClubMap.get(entry.team_id);
          if (teamClubId) {
            entry1ClubName = clubMap.get(teamClubId) || null;
          }
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
          // Get club name for player
          const playerClubId = playerClubMap.get(entry.player_id);
          if (playerClubId) {
            entry2ClubName = clubMap.get(playerClubId) || null;
          }
        } else if (entry.team_id) {
          entry2Name = teamMap.get(entry.team_id) || `Team ${match.entry2_id.slice(0, 8)}`;
          // Get club name for team
          const teamClubId = teamClubMap.get(entry.team_id);
          if (teamClubId) {
            entry2ClubName = clubMap.get(teamClubId) || null;
          }
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
      entry1_club_name: entry1ClubName,
      entry2_club_name: entry2ClubName,
      court_id: match.court_id,
      court_name: match.court_id ? courtMap.get(match.court_id) || null : null,
      umpire_id: match.umpire_id,
      umpire_name: match.umpire_id ? umpireMap.get(match.umpire_id) || null : null,
      scheduled_time: match.scheduled_time,
      duration_minutes: match.duration_minutes,
      status: match.is_completed ? "completed" : "scheduled",
      winner_entry_id: match.winner_entry_id,
      is_completed: match.is_completed,
      match_code: match.match_code,
      code_valid: match.code_valid,
      actual_start_time: match.actual_start_time || null,
      awaiting_result: match.awaiting_result || false,
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
        entry1_club_name: null,
        entry2_club_name: null,
        court_id: match.court_id,
        court_name: null,
        umpire_id: match.umpire_id,
        umpire_name: null,
        scheduled_time: match.scheduled_time,
        duration_minutes: match.duration_minutes,
        status: match.is_completed ? "completed" : "scheduled",
        winner_entry_id: match.winner_entry_id,
        is_completed: match.is_completed,
        match_code: match.match_code,
        code_valid: match.code_valid,
        actual_start_time: match.actual_start_time || null,
        awaiting_result: match.awaiting_result || false,
      }));
    }
    // If we don't have matches, re-throw the error
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to load bracket: ${errorMessage}`);
  }
};

