import { supabase } from "@/lib/supabaseClient";
import { Tournament } from "@/types/tournament";
import {
  Match,
  Entry,
  Player,
  Court,
  Umpire,
  GenerateFixturesOptions,
  GenerateFixturesResult,
} from "@/types/match";

// Helper: Compute next power of two
const nextPowerOfTwo = (n: number): number => {
  if (n <= 1) return 1;
  return Math.pow(2, Math.ceil(Math.log2(n)));
};

// Helper: Shuffle array (Fisher-Yates)
const shuffle = <T>(array: T[], seed?: number): T[] => {
  const  shuffled = [...array];
  if (seed !== undefined) {
    // Seeded shuffle using simple LCG
    let rng = seed;
    for (let i = shuffled.length - 1; i > 0; i--) {
      rng = (rng * 1103515245 + 12345) & 0x7fffffff;
      const j = rng % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
  } else {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
  }
  return shuffled;
};


// Generate knockouts pairings (using entry IDs)
const generateKnockoutsPairings = (
  entryIds: string[],
  seeded: boolean
): Array<{ entry1_id: string | null; entry2_id: string | null }> => {
  const bracketSize = nextPowerOfTwo(entryIds.length);
  const pairings: Array<{ entry1_id: string | null; entry2_id: string | null }> = [];

  let orderedEntries: string[];
  if (seeded) {
    orderedEntries = [...entryIds];
  } else {
    orderedEntries = shuffle(entryIds);
  }

  // Fill bracket with entries and byes
  const bracket: (string | null)[] = new Array(bracketSize).fill(null);
  for (let i = 0; i < orderedEntries.length; i++) {
    bracket[i] = orderedEntries[i];
  }

  // Create pairings
  for (let i = 0; i < bracketSize; i += 2) {
    pairings.push({
      entry1_id: bracket[i],
      entry2_id: bracket[i + 1],
    });
  }

  return pairings;
};

// Generate round-robin pairings (using entry IDs)
const generateRoundRobinPairings = (
  entryIds: string[]
): Array<Array<{ entry1_id: string | null; entry2_id: string | null }>> => {
  if (entryIds.length < 2) return [];
  
  const n = entryIds.length;
  const isOdd = n % 2 === 1;
  const numRounds = isOdd ? n : n - 1;
  const rounds: Array<Array<{ entry1_id: string | null; entry2_id: string | null }>> = [];
  
  // Create array with dummy entry for odd numbers
  const entries = isOdd ? [...entryIds, null] : [...entryIds];
  const numEntries = entries.length;
  
  for (let round = 0; round < numRounds; round++) {
    const pairs: Array<{ entry1_id: string | null; entry2_id: string | null }> = [];
    
    // First entry is fixed, others rotate
    for (let i = 0; i < numEntries / 2; i++) {
      const entry1 = entries[i];
      const entry2 = entries[numEntries - 1 - i];
      
      // Skip if either is null (dummy bye) or both are null
      if (entry1 !== null || entry2 !== null) {
        pairs.push({
          entry1_id: entry1,
          entry2_id: entry2,
        });
      }
    }
    
    rounds.push(pairs);
    
    // Rotate entries (except first one)
    if (round < numRounds - 1) {
      const last = entries.pop()!;
      entries.splice(1, 0, last);
    }
  }
  
  return rounds;
};

// Generate double elimination initial round (winners bracket)
const generateDoubleEliminationPairings = (
  entryIds: string[],
  seeded: boolean
): Array<{ entry1_id: string | null; entry2_id: string | null }> => {
  // For now, create initial winners bracket like knockouts
  return generateKnockoutsPairings(entryIds, seeded);
};

// Get round name for knockouts
const getKnockoutsRoundName = (roundIndex: number, totalRounds: number): string => {
  const roundSize = Math.pow(2, totalRounds - roundIndex);
  if (roundSize >= 32) return `Round of ${roundSize}`;
  if (roundSize === 16) return "Round of 16";
  if (roundSize === 8) return "Quarterfinals";
  if (roundSize === 4) return "Semifinals";
  if (roundSize === 2) return "Final";
  return `Round ${roundIndex + 1}`;
};

// Helper: Generate match code
const generateMatchCode = (tournamentId: string, matchOrder: number): string => {
  const tournamentPrefix = tournamentId.slice(0, 4).toUpperCase();
  return `${tournamentPrefix}-${matchOrder.toString().padStart(3, "0")}`;
};

// Assign courts and umpires with rotation
const assignCourtsAndUmpires = (
  matches: Array<{
    entry1_id: string | null;
    entry2_id: string | null;
    round: string;
  }>,
  courts: Court[],
  umpires: Umpire[],
  entries: Entry[],
  players: Player[],
  startTime: Date,
  slotDurationMinutes: number,
  batchSize: number,
  respectClubNeutrality: boolean
): Array<{
  entry1_id: string | null;
  entry2_id: string | null;
  round: string;
  scheduled_time: Date;
  court_id: string | null;
  umpire_id: string | null;
}> => {
  const scheduled: Array<{
    entry1_id: string | null;
    entry2_id: string | null;
    round: string;
    scheduled_time: Date;
    court_id: string | null;
    umpire_id: string | null;
  }> = [];

  let courtIndex = 0;
  let waveStart = new Date(startTime);

  // Track umpire assignments by time slot to prevent conflicts
  // Map: timeSlotKey -> Set of umpire IDs already assigned at that time
  const umpireSchedule = new Map<string, Set<string>>();
  
  // Track umpire assignment counts for even distribution
  const umpireAssignmentCounts = new Map<string, number>();
  umpires.forEach((u) => umpireAssignmentCounts.set(u.id, 0));

  // Helper: Get time slot key for a given time
  const getTimeSlotKey = (time: Date): string => {
    return time.toISOString();
  };

  // Helper: Get available umpires at a given time
  const getAvailableUmpires = (time: Date): Umpire[] => {
    const timeKey = getTimeSlotKey(time);
    const assignedUmpireIds = umpireSchedule.get(timeKey) || new Set<string>();
    
    return umpires.filter((u) => !assignedUmpireIds.has(u.id));
  };

  // Helper: Select best umpire (prioritize neutral, then least assigned)
  const selectBestUmpire = (
    availableUmpires: Umpire[],
    match: { entry1_id: string | null; entry2_id: string | null },
    entries: Entry[],
    players: Player[],
    respectNeutrality: boolean
  ): Umpire | null => {
    if (availableUmpires.length === 0) return null;
    if (availableUmpires.length === 1) return availableUmpires[0];

    // If respect_club_neutrality, try to find neutral umpire first
    if (respectNeutrality && match.entry1_id && match.entry2_id) {
      const entry1 = entries.find((e) => e.id === match.entry1_id);
      const entry2 = entries.find((e) => e.id === match.entry2_id);
      
      if (entry1 && entry2) {
        const player1Id = entry1.player_id;
        const player2Id = entry2.player_id;
        
        if (player1Id && player2Id) {
          const player1 = players.find((p) => p.id === player1Id);
          const player2 = players.find((p) => p.id === player2Id);
          const player1Club = player1?.club_id;
          const player2Club = player2?.club_id;

          if (player1Club || player2Club) {
            // Find neutral umpires (not from either club)
            const neutralUmpires = availableUmpires.filter(
              (u) => u.club_id !== player1Club && u.club_id !== player2Club
            );
            
            if (neutralUmpires.length > 0) {
              availableUmpires = neutralUmpires;
            }
          }
        }
      }
    }

    // Among available (and potentially neutral) umpires, select the one with least assignments
    // This ensures even distribution across all umpires
    let bestUmpire = availableUmpires[0];
    let minAssignments = umpireAssignmentCounts.get(bestUmpire.id) || 0;

    for (const umpire of availableUmpires) {
      const assignments = umpireAssignmentCounts.get(umpire.id) || 0;
      if (assignments < minAssignments) {
        bestUmpire = umpire;
        minAssignments = assignments;
      }
    }

    return bestUmpire;
  };

  // Group matches by round
  const matchesByRound = new Map<string, typeof matches>();
  matches.forEach((match) => {
    if (!matchesByRound.has(match.round)) {
      matchesByRound.set(match.round, []);
    }
    matchesByRound.get(match.round)!.push(match);
  });

  // Schedule each round
  for (const [roundName, roundMatches] of matchesByRound.entries()) {
    let waveIndex = 0;

    for (let i = 0; i < roundMatches.length; i += batchSize) {
      const waveMatches = roundMatches.slice(i, i + batchSize);
      const waveTime = new Date(waveStart);
      waveTime.setMinutes(waveTime.getMinutes() + waveIndex * slotDurationMinutes);
      const timeKey = getTimeSlotKey(waveTime);

      // Initialize time slot if needed
      if (!umpireSchedule.has(timeKey)) {
        umpireSchedule.set(timeKey, new Set<string>());
      }

      waveMatches.forEach((match) => {
        // Skip BYE matches - they don't need courts, umpires, or scheduling
        const isBye = match.entry1_id === null || match.entry2_id === null;
        if (isBye) {
          scheduled.push({
            ...match,
            scheduled_time: new Date(waveTime), // Keep time for ordering, but won't be used
            court_id: null, // BYE matches don't need courts
            umpire_id: null, // BYE matches don't need umpires
          });
          return; // Don't increment courtIndex for BYE matches
        }

        const court = courts.length > 0 ? courts[courtIndex % courts.length] : null;
        
        // Get available umpires at this time
        const availableUmpires = getAvailableUmpires(waveTime);
        
        // Select best umpire (neutral if possible, then least assigned)
        const umpire = selectBestUmpire(
          availableUmpires,
          match,
          entries,
          players,
          respectClubNeutrality
        );

        // Assign umpire to this time slot
        if (umpire) {
          umpireSchedule.get(timeKey)!.add(umpire.id);
          const currentCount = umpireAssignmentCounts.get(umpire.id) || 0;
          umpireAssignmentCounts.set(umpire.id, currentCount + 1);
        }

        scheduled.push({
          ...match,
          scheduled_time: new Date(waveTime),
          court_id: court?.id || null,
          umpire_id: umpire?.id || null,
        });

        courtIndex++;
      });

      waveIndex++;
    }

    // Move to next round start time
    const roundsInThisRound = Math.ceil(roundMatches.length / batchSize);
    waveStart.setMinutes(waveStart.getMinutes() + roundsInThisRound * slotDurationMinutes);
  }

  return scheduled;
};

// Main fixture generation function
export const generateFixtures = async (
  tournamentId: string,
  options: GenerateFixturesOptions = {}
): Promise<GenerateFixturesResult> => {
  const {
    seeded = false,
    force = false,
    start_time_override,
    max_parallel_matches_override,
    respect_club_neutrality = true,
    dry_run = false,
  } = options;

  try {
    // 1. Fetch tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();

    if (tournamentError || !tournament) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: `Tournament not found: ${tournamentError?.message || "Unknown error"}`,
      };
    }

    // 2. Check existing matches (idempotency)
    const { data: existingMatches, error: existingError } = await supabase
      .from("matches")
      .select("id")
      .eq("tournament_id", tournamentId);

    if (existingError) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: `Failed to check existing matches: ${existingError.message}`,
      };
    }

    if (existingMatches && existingMatches.length > 0 && !force) {
      // Return existing matches
      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("scheduled_time", { ascending: true });

      return {
        status: "ok",
        created: 0,
        matches: (matches as Match[]) || [],
        warnings: ["Fixtures already exist. Use force=true to regenerate."],
      };
    }

    // 3. Fetch entries
    const { data: entries, error: entriesError } = await supabase
      .from("entries")
      .select("*")
      .eq("tournament_id", tournamentId);

    if (entriesError) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: `Failed to fetch entries: ${entriesError.message}`,
      };
    }

    if (!entries || entries.length < 2) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: "Not enough players. Minimum 2 players required.",
      };
    }

    // Validate max entries
    if (tournament.max_entries && entries.length > tournament.max_entries) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: `Entries count (${entries.length}) exceeds tournament max_entries (${tournament.max_entries})`,
      };
    }

    // Check minimum threshold (85% of max_entries, rounded up)
    if (tournament.max_entries && tournament.max_entries > 0) {
      const minimumRequired = Math.ceil(tournament.max_entries * 0.85);
      if (entries.length < minimumRequired) {
        return {
          status: "error",
          created: 0,
          matches: [],
          warnings: [],
          error: `Not enough entries. Need at least ${minimumRequired} entries (85% of ${tournament.max_entries}) to generate fixtures. Currently have ${entries.length}.`,
        };
      }
    }

    // 4. Fetch players
    const playerIds = entries
      .map((e) => e.player_id)
      .filter((id): id is string => id !== null);
    const teamIds = entries
      .map((e) => e.team_id)
      .filter((id): id is string => id !== null);

    let players: Player[] = [];
    if (playerIds.length > 0) {
      // Try to fetch from players table, but don't fail if table doesn't exist
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("*")
        .in("id", playerIds);

      if (playersError) {
        // If players table doesn't exist, create minimal player objects
        players = playerIds.map((id) => ({
          id,
          name: `Player ${id.slice(0, 8)}`,
          club_id: null,
          contact: null,
          seed: null,
        }));
      } else {
        players = (playersData as Player[]) || [];
        // Fill in missing players
        const fetchedIds = new Set(players.map((p) => p.id));
        playerIds.forEach((id) => {
          if (!fetchedIds.has(id)) {
            players.push({
              id,
              name: `Player ${id.slice(0, 8)}`,
              club_id: null,
              contact: null,
              seed: null,
            });
          }
        });
      }
    }

    // 5. Fetch courts
    const { data: courts, error: courtsError } = await supabase
      .from("courts")
      .select("*")
      .eq("tournament_id", tournamentId);

    if (courtsError) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: `Failed to fetch courts: ${courtsError.message}`,
      };
    }

    if (!courts || courts.length === 0) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: "No courts available for this tournament.",
      };
    }

    // 6. Fetch umpires
    const { data: umpires, error: umpiresError } = await supabase
      .from("umpires")
      .select("*")
      .eq("tournament_id", tournamentId);

    if (umpiresError) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: `Failed to fetch umpires: ${umpiresError.message}`,
      };
    }

    if (!umpires || umpires.length === 0) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: "No umpires available.",
      };
    }

    // 7. Generate pairings based on format using entry IDs
    const format = tournament.format;
    const entryIds = entries.map((e) => e.id);

    let pairings: Array<{
      entry1_id: string | null;
      entry2_id: string | null;
      round: string;
    }> = [];

    if (format === "knockouts") {
      const pairs = generateKnockoutsPairings(entryIds, seeded);
      const bracketSize = nextPowerOfTwo(entryIds.length);
      const totalRounds = Math.log2(bracketSize);
      pairs.forEach((pair) => {
        pairings.push({
          ...pair,
          round: getKnockoutsRoundName(0, totalRounds),
        });
      });
    } else if (format === "round_robin") {
      const rounds = generateRoundRobinPairings(entryIds);
      rounds.forEach((round, roundIdx) => {
        round.forEach((pair) => {
          pairings.push({
            ...pair,
            round: `RR - R${roundIdx + 1}`,
          });
        });
      });
    } else if (format === "double_elimination") {
      const pairs = generateDoubleEliminationPairings(entryIds, seeded);
      pairs.forEach((pair) => {
        pairings.push({
          ...pair,
          round: "Winners Bracket - Round 1",
        });
      });
    }

    if (pairings.length === 0) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: "Failed to generate pairings. Unsupported format or no valid entries.",
      };
    }

    // 8. Calculate scheduling parameters
    const batchSize = Math.min(
      courts.length,
      umpires.length,
      max_parallel_matches_override || Infinity
    );
    const slotDurationMinutes =
      tournament.match_duration_minutes + tournament.rest_time_minutes;

    // Parse start time
    let startTime: Date;
    if (start_time_override) {
      startTime = new Date(start_time_override);
    } else {
      startTime = new Date(tournament.start_date);
      const defaultHour = 9;
      startTime.setHours(defaultHour, 0, 0, 0);
    }

    // 9. Assign courts and umpires
    const scheduledMatches = assignCourtsAndUmpires(
      pairings,
      courts as Court[],
      umpires as Umpire[],
      entries as Entry[],
      players,
      startTime,
      slotDurationMinutes,
      batchSize,
      respect_club_neutrality
    );

    // 10. Prepare match records
    const matchRecords = scheduledMatches.map((match, index) => {
      const isBye = match.entry1_id === null || match.entry2_id === null;
      const matchCode = generateMatchCode(tournamentId, index + 1);

      // For BYE matches: automatically complete with winner, no court/umpire assignment
      if (isBye) {
        // Determine winner (the non-null entry)
        const winnerEntryId = match.entry1_id || match.entry2_id;

        return {
          tournament_id: tournamentId,
          round: match.round,
          match_order: index + 1,
          entry1_id: match.entry1_id,
          entry2_id: match.entry2_id,
          court_id: null, // BYE matches don't need courts
          umpire_id: null, // BYE matches don't need umpires
          scheduled_time: null, // BYE matches don't need scheduling
          duration_minutes: tournament.match_duration_minutes,
          rest_enforced: tournament.rest_time_minutes > 0,
          match_code: matchCode,
          code_valid: true,
          winner_entry_id: winnerEntryId, // Auto-assign winner
          is_completed: true, // Auto-complete BYE matches
        };
      }

      // For regular matches: use normal scheduling
      // Format scheduled_time as timestamp without timezone (YYYY-MM-DD HH:MM:SS)
      const scheduledTimeStr = match.scheduled_time
        .toISOString()
        .replace("T", " ")
        .slice(0, 19);

      return {
        tournament_id: tournamentId,
        round: match.round,
        match_order: index + 1,
        entry1_id: match.entry1_id,
        entry2_id: match.entry2_id,
        court_id: match.court_id,
        umpire_id: match.umpire_id,
        scheduled_time: scheduledTimeStr,
        duration_minutes: tournament.match_duration_minutes,
        rest_enforced: tournament.rest_time_minutes > 0,
        match_code: matchCode,
        code_valid: true,
        winner_entry_id: null,
        is_completed: false,
      };
    });

    // 11. Dry run check
    if (dry_run) {
      return {
        status: "ok",
        created: 0,
        matches: matchRecords as Match[],
        warnings: ["Dry run: No matches were inserted."],
      };
    }

    // 12. Delete existing matches if force=true
    if (force && existingMatches && existingMatches.length > 0) {
      const { error: deleteError } = await supabase
        .from("matches")
        .delete()
        .eq("tournament_id", tournamentId);

      if (deleteError) {
        return {
          status: "error",
          created: 0,
          matches: [],
          warnings: [],
          error: `Failed to delete existing matches: ${deleteError.message}`,
        };
      }
    }

    // 13. Insert matches in batch
    const { data: insertedMatches, error: insertError } = await supabase
      .from("matches")
      .insert(matchRecords)
      .select();

    if (insertError) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: `Failed to insert matches: ${insertError.message}`,
      };
    }

    const warnings: string[] = [];
    if (respect_club_neutrality && umpires.length < players.length) {
      warnings.push("Limited umpires available. Some matches may have same-club umpires.");
    }

    return {
      status: "ok",
      created: insertedMatches?.length || 0,
      matches: (insertedMatches as Match[]) || [],
      warnings,
    };
  } catch (error) {
    return {
      status: "error",
      created: 0,
      matches: [],
      warnings: [],
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

/**
 * Generate next round fixtures for knockout tournament
 */
export const generateNextRoundFixtures = async (
  tournamentId: string,
  currentRound: string,
  options: GenerateFixturesOptions = {}
): Promise<GenerateFixturesResult> => {
  const {
    respect_club_neutrality = true,
    dry_run = false,
  } = options;

  try {
    // 1. Fetch tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();

    if (tournamentError || !tournament) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: `Tournament not found: ${tournamentError?.message || "Unknown error"}`,
      };
    }

    // Only allow for knockout format
    if (tournament.format !== "knockouts") {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: "Next round fixtures can only be generated for knockout tournaments.",
      };
    }

    // 2. Get all matches from current round and verify all have winners
    const { data: allMatches, error: allMatchesError } = await supabase
      .from("matches")
      .select("id, is_completed, winner_entry_id")
      .eq("tournament_id", tournamentId)
      .eq("round", currentRound);

    if (allMatchesError) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: `Failed to check match completion: ${allMatchesError.message}`,
      };
    }

    if (!allMatches || allMatches.length === 0) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: "No matches found in the current round.",
      };
    }

    // Verify all matches are completed AND have winners
    const allCompleted = allMatches.every((match) => match.is_completed === true);
    if (!allCompleted) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: "All matches in the current round must be completed before generating the next round.",
      };
    }

    // Get winners - all matches should have winners if completed
    const winnerIds = allMatches
      .map((match) => match.winner_entry_id)
      .filter((id): id is string => id !== null);

    if (winnerIds.length === 0) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: "No winners found in the current round. All matches must have winners assigned.",
      };
    }

    // Critical: Ensure all matches have winners (not just some)
    if (winnerIds.length !== allMatches.length) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: `Only ${winnerIds.length} out of ${allMatches.length} matches have winners. All matches must have winners before generating the next round.`,
      };
    }

    // 4. Determine next round name
    const currentRoundSize = winnerIds.length;
    
    // Explicit validation: Ensure we have a valid number of winners
    if (currentRoundSize < 1) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: "No winners found. Cannot generate next round.",
      };
    }
    
    // If we have exactly 2 winners, the next round is always "Final"
    let nextRoundName: string;
    
    if (currentRoundSize === 2) {
      // Check if Final already exists AND is completed
      const { data: finalMatches, error: finalCheckError } = await supabase
        .from("matches")
        .select("id, is_completed")
        .eq("tournament_id", tournamentId)
        .eq("round", "Final");

      if (finalCheckError) {
        return {
          status: "error",
          created: 0,
          matches: [],
          warnings: [],
          error: `Failed to check for existing Final: ${finalCheckError.message}`,
        };
      }

      // If Final exists, check its status
      if (finalMatches && finalMatches.length > 0) {
        // Check if any Final match has a winner (is completed)
        const { data: finalWithWinner, error: winnerCheckError } = await supabase
          .from("matches")
          .select("id, is_completed, winner_entry_id")
          .eq("tournament_id", tournamentId)
          .eq("round", "Final");

        if (winnerCheckError) {
          return {
            status: "error",
            created: 0,
            matches: [],
            warnings: [],
            error: `Failed to check Final status: ${winnerCheckError.message}`,
          };
        }

        // If any Final has a winner, tournament is complete
        const hasWinner = finalWithWinner?.some(
          (match) => match.winner_entry_id !== null && match.is_completed === true
        );

        if (hasWinner) {
          return {
            status: "error",
            created: 0,
            matches: [],
            warnings: [],
            error: "Tournament is already complete. Final has already been played and a winner declared.",
          };
        }

        // Final exists but has no winner - delete it so we can create a new one with correct winners
        const { error: deleteFinalError } = await supabase
          .from("matches")
          .delete()
          .eq("tournament_id", tournamentId)
          .eq("round", "Final")
          .is("winner_entry_id", null);

        if (deleteFinalError) {
          return {
            status: "error",
            created: 0,
            matches: [],
            warnings: [],
            error: `Failed to delete incomplete Final: ${deleteFinalError.message}`,
          };
        }
      }

      // No Final exists (or we just deleted incomplete one) - proceed to create it
      nextRoundName = "Final";
    } else {
      // Determine next round directly based on number of winners
      // This is more reliable than trying to calculate indices
      let determinedRoundName: string | null = null;

      // Map number of winners to the next round name
      // When we have X winners, the next round will have X players
      // IMPORTANT: This must follow the exact progression:
      // Round of 16 (16 players) → 8 winners → Quarterfinals
      // Quarterfinals (8 players) → 4 winners → Semifinals  
      // Semifinals (4 players) → 2 winners → Final
      switch (currentRoundSize) {
        case 8:
          // 8 winners from Round of 16 → Next: Quarterfinals (8 players, 4 matches)
          // This MUST be Quarterfinals, never skip to Semifinals
          determinedRoundName = "Quarterfinals";
          break;
        case 4:
          // 4 winners from Quarterfinals → Next: Semifinals (4 players, 2 matches)
          determinedRoundName = "Semifinals";
          break;
        case 2:
          // 2 winners from Semifinals → Next: Final (handled above in special case, but keep here for safety)
          determinedRoundName = "Final";
          break;
        default:
          // For other sizes, determine next round directly based on winner count
          // The pattern: X winners → Next round with X players
          if (currentRoundSize >= 32) {
            // 32+ winners → Round of [next size]
            determinedRoundName = `Round of ${currentRoundSize}`;
          } else if (currentRoundSize === 16) {
            // 16 winners → Round of 16 (shouldn't happen, but handle it)
            determinedRoundName = "Round of 16";
          } else {
            // For other sizes, use a more direct approach
            // Calculate what the next round should be based on number of players
            const nextRoundPlayerCount = currentRoundSize; // Next round has same number of players as current winners
            
            if (nextRoundPlayerCount === 8) {
              determinedRoundName = "Quarterfinals";
            } else if (nextRoundPlayerCount === 4) {
              determinedRoundName = "Semifinals";
            } else if (nextRoundPlayerCount === 2) {
              determinedRoundName = "Final";
            } else if (nextRoundPlayerCount >= 32) {
              determinedRoundName = `Round of ${nextRoundPlayerCount}`;
            } else if (nextRoundPlayerCount === 16) {
              determinedRoundName = "Round of 16";
            } else {
              // Fallback: calculate based on bracket structure
              const { data: firstRoundMatches, error: firstRoundError } = await supabase
                .from("matches")
                .select("round")
                .eq("tournament_id", tournamentId)
                .order("match_order", { ascending: true })
                .limit(1);

              if (firstRoundError || !firstRoundMatches || firstRoundMatches.length === 0) {
                return {
                  status: "error",
                  created: 0,
                  matches: [],
                  warnings: [],
                  error: `Failed to fetch first round: ${firstRoundError?.message || "No matches found"}`,
                };
              }

              const firstRound = firstRoundMatches[0].round;
              const { data: firstRoundData, error: firstRoundCountError } = await supabase
                .from("matches")
                .select("id")
                .eq("tournament_id", tournamentId)
                .eq("round", firstRound);

              if (firstRoundCountError || !firstRoundData) {
                return {
                  status: "error",
                  created: 0,
                  matches: [],
                  warnings: [],
                  error: `Failed to count first round matches: ${firstRoundCountError?.message}`,
                };
              }

              const originalBracketSize = firstRoundData.length * 2;
              const adjustedBracketSize = nextPowerOfTwo(originalBracketSize);
              const totalRounds = Math.log2(adjustedBracketSize);
              
              // Find the round index that matches current round size
              let currentRoundIndex = -1;
              for (let i = 0; i < totalRounds; i++) {
                const roundSize = Math.pow(2, totalRounds - i);
                if (roundSize === currentRoundSize) {
                  currentRoundIndex = i;
                  break;
                }
              }

              if (currentRoundIndex === -1 || currentRoundIndex === totalRounds - 1) {
                if (currentRound === "Final") {
                  return {
                    status: "error",
                    created: 0,
                    matches: [],
                    warnings: [],
                    error: "Tournament is already complete. No next round available.",
                  };
                }
                currentRoundIndex = Math.floor(Math.log2(adjustedBracketSize / currentRoundSize));
              }

              const nextRoundIndex = currentRoundIndex + 1;
              if (nextRoundIndex >= totalRounds) {
                return {
                  status: "error",
                  created: 0,
                  matches: [],
                  warnings: [],
                  error: "Tournament is already complete. No next round available.",
                };
              }

              determinedRoundName = getKnockoutsRoundName(nextRoundIndex, totalRounds);
            }
          }
          break;
      }

      if (!determinedRoundName) {
        return {
          status: "error",
          created: 0,
          matches: [],
          warnings: [],
          error: `Could not determine next round for ${currentRoundSize} winners.`,
        };
      }

      nextRoundName = determinedRoundName;
    }

    // 5. Check if next round already exists (only if not handled above)
    // Skip this check for Final if we already checked/deleted it in the 2-winners case
    if (!(currentRoundSize === 2 && nextRoundName === "Final")) {
      const { data: existingNextRound, error: existingError } = await supabase
        .from("matches")
        .select("id, is_completed, winner_entry_id")
        .eq("tournament_id", tournamentId)
        .eq("round", nextRoundName);

      if (existingError) {
        return {
          status: "error",
          created: 0,
          matches: [],
          warnings: [],
          error: `Failed to check existing next round: ${existingError.message}`,
        };
      }

      if (existingNextRound && existingNextRound.length > 0) {
        // Check if the round is completed (all matches have winners)
        const isCompleted = existingNextRound.every(
          (match) => match.is_completed === true && match.winner_entry_id !== null
        );
        if (isCompleted) {
          return {
            status: "error",
            created: 0,
            matches: [],
            warnings: [],
            error: `Round (${nextRoundName}) already exists and is completed.`,
          };
        }
        // Round exists but not completed - delete incomplete matches and regenerate
        const { error: deleteIncompleteError } = await supabase
          .from("matches")
          .delete()
          .eq("tournament_id", tournamentId)
          .eq("round", nextRoundName)
          .is("winner_entry_id", null);

        if (deleteIncompleteError) {
          return {
            status: "error",
            created: 0,
            matches: [],
            warnings: [],
            error: `Failed to delete incomplete round matches: ${deleteIncompleteError.message}`,
          };
        }
      }
    }

    // 6. Generate pairings for next round
    const pairs = generateKnockoutsPairings(winnerIds, false);
    const pairings = pairs.map((pair) => ({
      ...pair,
      round: nextRoundName,
    }));

    // 7. Fetch courts and umpires
    const { data: courts, error: courtsError } = await supabase
      .from("courts")
      .select("*")
      .eq("tournament_id", tournamentId);

    if (courtsError) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: `Failed to fetch courts: ${courtsError.message}`,
      };
    }

    if (!courts || courts.length === 0) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: "No courts available for this tournament.",
      };
    }

    const { data: umpires, error: umpiresError } = await supabase
      .from("umpires")
      .select("*")
      .eq("tournament_id", tournamentId);

    if (umpiresError) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: `Failed to fetch umpires: ${umpiresError.message}`,
      };
    }

    if (!umpires || umpires.length === 0) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: "No umpires available.",
      };
    }

    // 8. Fetch entries and players for club neutrality
    const { data: entries, error: entriesError } = await supabase
      .from("entries")
      .select("*")
      .in("id", winnerIds);

    if (entriesError) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: `Failed to fetch entries: ${entriesError.message}`,
      };
    }

    const playerIds = (entries || [])
      .map((e) => e.player_id)
      .filter((id): id is string => id !== null);

    let players: Player[] = [];
    if (playerIds.length > 0) {
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("*")
        .in("id", playerIds);

      if (!playersError && playersData) {
        players = playersData as Player[];
      }
    }

    // 9. Calculate scheduling parameters
    const batchSize = Math.min(courts.length, umpires.length);
    const slotDurationMinutes =
      tournament.match_duration_minutes + tournament.rest_time_minutes;

    // Get the latest scheduled time from current round to start next round
    const { data: latestMatch, error: latestError } = await supabase
      .from("matches")
      .select("scheduled_time")
      .eq("tournament_id", tournamentId)
      .eq("round", currentRound)
      .order("scheduled_time", { ascending: false })
      .limit(1)
      .single();

    let startTime: Date;
    if (latestMatch && latestMatch.scheduled_time) {
      startTime = new Date(latestMatch.scheduled_time);
      // Start next round after a break (e.g., next day or same day evening)
      startTime.setMinutes(startTime.getMinutes() + slotDurationMinutes);
    } else {
      startTime = new Date(tournament.start_date);
      startTime.setHours(9, 0, 0, 0);
    }

    // 10. Assign courts and umpires
    const scheduledMatches = assignCourtsAndUmpires(
      pairings,
      courts as Court[],
      umpires as Umpire[],
      entries as Entry[],
      players,
      startTime,
      slotDurationMinutes,
      batchSize,
      respect_club_neutrality
    );

    // 11. Get highest match_order to continue numbering
    const { data: maxMatchOrder, error: maxOrderError } = await supabase
      .from("matches")
      .select("match_order")
      .eq("tournament_id", tournamentId)
      .order("match_order", { ascending: false })
      .limit(1)
      .single();

    let nextMatchOrder = 1;
    if (!maxOrderError && maxMatchOrder && maxMatchOrder.match_order) {
      nextMatchOrder = (maxMatchOrder.match_order as number) + 1;
    }

    // 12. Prepare match records
    const matchRecords = scheduledMatches.map((match, index) => {
      const isBye = match.entry1_id === null || match.entry2_id === null;
      const matchCode = generateMatchCode(tournamentId, nextMatchOrder + index);

      // For BYE matches: automatically complete with winner, no court/umpire assignment
      if (isBye) {
        // Determine winner (the non-null entry)
        const winnerEntryId = match.entry1_id || match.entry2_id;

        return {
          tournament_id: tournamentId,
          round: match.round,
          match_order: nextMatchOrder + index,
          entry1_id: match.entry1_id,
          entry2_id: match.entry2_id,
          court_id: null, // BYE matches don't need courts
          umpire_id: null, // BYE matches don't need umpires
          scheduled_time: null, // BYE matches don't need scheduling
          duration_minutes: tournament.match_duration_minutes,
          rest_enforced: tournament.rest_time_minutes > 0,
          match_code: matchCode,
          code_valid: true,
          winner_entry_id: winnerEntryId, // Auto-assign winner
          is_completed: true, // Auto-complete BYE matches
        };
      }

      // For regular matches: use normal scheduling
      const scheduledTimeStr = match.scheduled_time
        .toISOString()
        .replace("T", " ")
        .slice(0, 19);

      return {
        tournament_id: tournamentId,
        round: match.round,
        match_order: nextMatchOrder + index,
        entry1_id: match.entry1_id,
        entry2_id: match.entry2_id,
        court_id: match.court_id,
        umpire_id: match.umpire_id,
        scheduled_time: scheduledTimeStr,
        duration_minutes: tournament.match_duration_minutes,
        rest_enforced: tournament.rest_time_minutes > 0,
        match_code: matchCode,
        code_valid: true,
        winner_entry_id: null,
        is_completed: false,
      };
    });

    // 13. Dry run check
    if (dry_run) {
      return {
        status: "ok",
        created: 0,
        matches: matchRecords as Match[],
        warnings: ["Dry run: No matches were inserted."],
      };
    }

    // 14. Insert matches
    const { data: insertedMatches, error: insertError } = await supabase
      .from("matches")
      .insert(matchRecords)
      .select();

    if (insertError) {
      return {
        status: "error",
        created: 0,
        matches: [],
        warnings: [],
        error: `Failed to insert matches: ${insertError.message}`,
      };
    }

    return {
      status: "ok",
      created: insertedMatches?.length || 0,
      matches: (insertedMatches as Match[]) || [],
      warnings: [],
    };
  } catch (error) {
    return {
      status: "error",
      created: 0,
      matches: [],
      warnings: [],
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

