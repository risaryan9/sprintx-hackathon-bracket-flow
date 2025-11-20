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
  const shuffled = [...array];
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
  let umpireIndex = 0;
  let waveStart = new Date(startTime);

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

      waveMatches.forEach((match) => {
        const court = courts.length > 0 ? courts[courtIndex % courts.length] : null;
        let umpire = umpires.length > 0 ? umpires[umpireIndex % umpires.length] : null;

        // Try to find neutral umpire if respect_club_neutrality is true
        if (respectClubNeutrality && match.entry1_id && match.entry2_id) {
          const entry1 = entries.find((e) => e.id === match.entry1_id);
          const entry2 = entries.find((e) => e.id === match.entry2_id);
          
          // Get player IDs from entries
          const player1Id = entry1?.player_id;
          const player2Id = entry2?.player_id;
          
          if (player1Id && player2Id) {
            const player1 = players.find((p) => p.id === player1Id);
            const player2 = players.find((p) => p.id === player2Id);
            const player1Club = player1?.club_id;
            const player2Club = player2?.club_id;

            if (player1Club || player2Club) {
              const neutralUmpire = umpires.find(
                (u) => u.club_id !== player1Club && u.club_id !== player2Club
              );
              if (neutralUmpire) {
                umpire = neutralUmpire;
              }
            }
          }
        }

        scheduled.push({
          ...match,
          scheduled_time: new Date(waveTime),
          court_id: court?.id || null,
          umpire_id: umpire?.id || null,
        });

        courtIndex++;
        if (umpire) {
          umpireIndex++;
        }
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
      .select("*");

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

