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
  tournamentSports: Record<string, string>;
}

/**
 * Validate match code
 */
export const validateMatchCode = async (
  matchId: string,
  matchCode: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from("matches")
    .select("match_code, code_valid, is_completed")
    .eq("id", matchId)
    .single();

  if (error || !data) {
    throw new Error("Match not found.");
  }

  if (data.is_completed) {
    throw new Error("This match has already been completed and cannot be edited.");
  }

  if (!data.code_valid) {
    throw new Error("Match code has been invalidated and cannot be used.");
  }

  if (data.match_code !== matchCode) {
    return false;
  }

  return true;
};

export interface MatchScoreInput {
  entry1_score?: number | null;
  entry2_score?: number | null;
  winner_entry_id: string | null;
  entry1_disqualified?: boolean;
  entry2_disqualified?: boolean;
}

/**
 * Submit match score and finalize match
 */
export const submitMatchScore = async (
  matchId: string,
  entry1Id: string | null,
  entry2Id: string | null,
  scoreInput: MatchScoreInput
): Promise<void> => {
  // First validate the match can be updated
  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .select("match_code, code_valid, is_completed")
    .eq("id", matchId)
    .single();

  if (matchError || !matchData) {
    throw new Error("Match not found.");
  }

  if (matchData.is_completed) {
    throw new Error("This match has already been completed.");
  }

  if (!matchData.code_valid) {
    throw new Error("Match code has been invalidated.");
  }

  // Determine winner if disqualification is set
  let winnerEntryId = scoreInput.winner_entry_id;
  
  if (scoreInput.entry1_disqualified && scoreInput.entry2_disqualified) {
    throw new Error("Both entries cannot be disqualified.");
  }
  
  if (scoreInput.entry1_disqualified) {
    if (!entry2Id) {
      throw new Error("Cannot disqualify entry 1 when entry 2 is not assigned.");
    }
    winnerEntryId = entry2Id;
  } else if (scoreInput.entry2_disqualified) {
    if (!entry1Id) {
      throw new Error("Cannot disqualify entry 2 when entry 1 is not assigned.");
    }
    winnerEntryId = entry1Id;
  }

  if (!winnerEntryId) {
    throw new Error("A winner must be assigned before completing the match.");
  }

  // Update match with scores and completion status
  const updateData: any = {
    winner_entry_id: winnerEntryId,
    is_completed: true,
    code_valid: false,
  };

  // Add scores if provided (assuming these fields exist in the database)
  if (scoreInput.entry1_score !== undefined && scoreInput.entry1_score !== null) {
    updateData.entry1_score = scoreInput.entry1_score;
  }
  if (scoreInput.entry2_score !== undefined && scoreInput.entry2_score !== null) {
    updateData.entry2_score = scoreInput.entry2_score;
  }

  const { error: updateError } = await supabase
    .from("matches")
    .update(updateData)
    .eq("id", matchId);

  if (updateError) {
    throw new Error(`Failed to submit match score: ${updateError.message}`);
  }
};

/**
 * Get umpire by license number and fetch all their upcoming matches
 */
export const getUmpireMatchesByLicense = async (
  licenseNo: string
): Promise<UmpireWithMatches> => {
  // First, find the umpire by license_no
  console.log(`Looking up umpire with license_no: ${licenseNo}`);
  const { data: umpireData, error: umpireError } = await supabase
    .from("umpires")
    .select("id, full_name, license_no")
    .eq("license_no", licenseNo)
    .single();

  if (umpireError || !umpireData) {
    console.error("Umpire lookup error:", umpireError);
    // Try to see what umpires exist (for debugging)
    const { data: allUmpires } = await supabase
      .from("umpires")
      .select("id, full_name, license_no")
      .limit(5);
    console.log("Sample umpires in database:", allUmpires);
    throw new Error("Umpire not found with the provided license number.");
  }

  const umpireId = umpireData.id;
  console.log(`Found umpire: ${umpireData.full_name}, ID: ${umpireId}, License: ${umpireData.license_no}`);

  // Get current time to filter for upcoming matches
  const now = new Date();

  // Fetch all matches assigned to this umpire that are not completed
  // Don't filter by scheduled_time in the query - we'll do it in JavaScript
  // to properly handle null values and future dates
  const { data: matchesData, error: matchesError } = await supabase
    .from("matches")
    .select("*")
    .eq("umpire_id", umpireId)
    .eq("is_completed", false);

  if (matchesError) {
    throw new Error(`Failed to fetch matches: ${matchesError.message}`);
  }

  // Helper function to parse scheduled_time (handles both ISO and "YYYY-MM-DD HH:MM:SS" formats)
  const parseScheduledTime = (timeStr: string | null): Date | null => {
    if (!timeStr) return null;
    // If it's in "YYYY-MM-DD HH:MM:SS" format, convert to ISO
    if (timeStr.includes(" ") && !timeStr.includes("T")) {
      timeStr = timeStr.replace(" ", "T");
    }
    // Try to parse as ISO
    let date = new Date(timeStr);
    // If still invalid, try adding timezone
    if (isNaN(date.getTime())) {
      date = new Date(timeStr + "Z");
    }
    return isNaN(date.getTime()) ? null : date;
  };

  // Filter matches - include all incomplete matches regardless of date for now
  // This will help debug if the issue is with date parsing or something else
  // We'll filter to show all incomplete matches assigned to this umpire
  let matches = matchesData || [];
  
  // Log for debugging
  console.log(`Umpire ID: ${umpireId}, Found ${matches.length} incomplete matches`);
  if (matches.length > 0) {
    console.log("Sample match:", {
      id: matches[0].id,
      umpire_id: matches[0].umpire_id,
      scheduled_time: matches[0].scheduled_time,
      is_completed: matches[0].is_completed
    });
  }

  // Sort matches by scheduled_time, with nulls last
  matches.sort((a: any, b: any) => {
    const timeA = parseScheduledTime(a.scheduled_time);
    const timeB = parseScheduledTime(b.scheduled_time);
    if (!timeA && !timeB) return 0;
    if (!timeA) return 1;
    if (!timeB) return -1;
    return timeA.getTime() - timeB.getTime();
  });

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
          .select("id, name, sport")
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
    sport: string;
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

  // Also fetch tournament sports for scoring type determination
  const tournamentSports: Record<string, string> = {};
  tournaments.forEach((t) => {
    tournamentSports[t.id] = t.sport || "";
  });

  return {
    umpire: {
      id: umpireData.id,
      full_name: umpireData.full_name,
      license_no: umpireData.license_no,
    },
    matches: bracketMatches,
    tournamentNames: tournamentNames,
    tournamentSports: tournamentSports,
  };
};

