import { supabase } from "@/lib/supabaseClient";
import { BracketMatch } from "@/types/bracket";

export interface UmpireWithMatches {
  umpire: {
    id: string;
    full_name: string;
    license_no: string | null;
  };
  matches: BracketMatch[];
  tournamentNames: Record<string, string>;
}

/**
 * Get umpire by license number and fetch all their upcoming matches
 */
export const getUmpireMatchesByLicense = async (
  licenseNo: string
): Promise<UmpireWithMatches> => {
  // First, find the umpire by license_no
  const { data: umpireData, error: umpireError } = await supabase
    .from("umpires")
    .select("id, full_name, license_no")
    .eq("license_no", licenseNo)
    .single();

  if (umpireError || !umpireData) {
    throw new Error("Umpire not found with the provided license number.");
  }

  const umpireId = umpireData.id;

  // Get current time to filter for upcoming matches
  const now = new Date().toISOString();

  // Fetch all matches assigned to this umpire that are not completed and are upcoming
  const { data: matchesData, error: matchesError } = await supabase
    .from("matches")
    .select("*")
    .eq("umpire_id", umpireId)
    .eq("is_completed", false)
    .gte("scheduled_time", now)
    .order("scheduled_time", { ascending: true });

  if (matchesError) {
    throw new Error(`Failed to fetch matches: ${matchesError.message}`);
  }

  const matches = matchesData || [];

  // Now enrich matches with related data (tournaments, entries, courts, etc.)
  const tournamentIds = new Set<string>();
  const entryIds = new Set<string>();
  const courtIds = new Set<string>();

  matches.forEach((match: any) => {
    if (match.tournament_id) tournamentIds.add(match.tournament_id);
    if (match.entry1_id) entryIds.add(match.entry1_id);
    if (match.entry2_id) entryIds.add(match.entry2_id);
    if (match.court_id) courtIds.add(match.court_id);
  });

  // Fetch related data in parallel
  const [tournamentsResult, entriesResult, courtsResult] = await Promise.all([
    tournamentIds.size > 0
      ? supabase
          .from("tournaments")
          .select("id, name")
          .in("id", Array.from(tournamentIds))
      : Promise.resolve({ data: [], error: null }),
    entryIds.size > 0
      ? supabase
          .from("entries")
          .select("id, player_id, team_id")
          .in("id", Array.from(entryIds))
      : Promise.resolve({ data: [], error: null }),
    courtIds.size > 0
      ? supabase
          .from("courts")
          .select("id, court_name")
          .in("id", Array.from(courtIds))
      : Promise.resolve({ data: [], error: null }),
  ]);

  const tournaments = (tournamentsResult.data || []) as Array<{
    id: string;
    name: string;
  }>;
  const entries = (entriesResult.data || []) as Array<{
    id: string;
    player_id: string | null;
    team_id: string | null;
  }>;
  const courts = (courtsResult.data || []) as Array<{ id: string; court_name: string }>;

  // Fetch players and teams
  const playerIds = new Set<string>();
  const teamIds = new Set<string>();
  entries.forEach((entry) => {
    if (entry.player_id) playerIds.add(entry.player_id);
    if (entry.team_id) teamIds.add(entry.team_id);
  });

  const [playersResult, teamsResult] = await Promise.all([
    playerIds.size > 0
      ? supabase
          .from("players")
          .select("id, full_name")
          .in("id", Array.from(playerIds))
      : Promise.resolve({ data: [], error: null }),
    teamIds.size > 0
      ? supabase
          .from("teams")
          .select("id, team_name")
          .in("id", Array.from(teamIds))
      : Promise.resolve({ data: [], error: null }),
  ]);

  const players = (playersResult.data || []) as Array<{ id: string; full_name: string }>;
  const teams = (teamsResult.data || []) as Array<{ id: string; team_name: string }>;

  // Create maps for quick lookup
  const tournamentMap = new Map(tournaments.map((t) => [t.id, t.name]));
  const entryMap = new Map(entries.map((e) => [e.id, e]));
  const courtMap = new Map(courts.map((c) => [c.id, c.court_name]));
  const playerMap = new Map(players.map((p) => [p.id, p.full_name]));
  const teamMap = new Map(teams.map((t) => [t.id, t.team_name]));

  // Transform matches to BracketMatch format
  const bracketMatches: BracketMatch[] = matches.map((match: any) => {
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
      entry1_club_name: null,
      entry2_club_name: null,
      court_id: match.court_id,
      court_name: match.court_id ? courtMap.get(match.court_id) || null : null,
      umpire_id: match.umpire_id,
      umpire_name: umpireData.full_name,
      scheduled_time: match.scheduled_time,
      status: match.is_completed ? "completed" : "scheduled",
      winner_entry_id: match.winner_entry_id,
      is_completed: match.is_completed,
      match_code: match.match_code,
      code_valid: match.code_valid,
    };
  });

  // Convert Map to Record for JSON serialization
  const tournamentNames: Record<string, string> = {};
  tournamentMap.forEach((name, id) => {
    tournamentNames[id] = name;
  });

  return {
    umpire: {
      id: umpireData.id,
      full_name: umpireData.full_name,
      license_no: umpireData.license_no,
    },
    matches: bracketMatches,
    tournamentNames: tournamentNames,
  };
};

