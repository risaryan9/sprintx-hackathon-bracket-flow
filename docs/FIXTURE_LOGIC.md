# Fixture Generation Logic

## Overview

The fixture generation system automatically creates match schedules for tournaments based on the tournament format (knockouts, round-robin, or double elimination). This document explains how fixtures are generated, the algorithms used, and the flow of the process.

## Table of Contents

1. [Architecture](#architecture)
2. [Tournament Formats](#tournament-formats)
3. [Fixture Generation Flow](#fixture-generation-flow)
4. [Algorithm Details](#algorithm-details)
5. [Match Code Generation](#match-code-generation)
6. [Next Round Generation](#next-round-generation)
7. [Error Handling](#error-handling)

---

## Architecture

The fixture generation system is located in `src/services/fixtures.ts` and consists of:

- **Main Functions:**
  - `generateFixtures()` - Generates initial fixtures for a tournament
  - `generateNextRoundFixtures()` - Generates next round for knockout tournaments
  
- **Helper Functions:**
  - `generateKnockoutsPairings()` - Creates knockout bracket pairings
  - `generateRoundRobinPairings()` - Creates round-robin pairings
  - `generateDoubleEliminationPairings()` - Creates double elimination pairings
  - `assignCourtsAndUmpires()` - Assigns courts and umpires to matches
  - `generateMatchCode()` - Generates unique match codes

---

## Tournament Formats

The system supports three tournament formats:

### 1. Knockouts (Single Elimination)

- **Structure:** Binary tree bracket where each match eliminates one participant
- **Bracket Size:** Automatically rounds up to next power of 2
- **Example:** 10 participants → 16 participant bracket (6 byes)
- **Rounds:** "Round of 16", "Quarterfinals", "Semifinals", "Final"

### 2. Round Robin

- **Structure:** Every participant plays every other participant exactly once
- **Number of Rounds:** `n-1` rounds (if even), `n` rounds (if odd)
- **Example:** 8 participants → 7 rounds, each participant plays 7 matches
- **Rounds:** "RR - R1", "RR - R2", etc.

### 3. Double Elimination

- **Structure:** Winners bracket + Losers bracket
- **Initial Round:** Same as knockouts for winners bracket
- **Note:** Currently generates initial winners bracket only

---

## Fixture Generation Flow

### Initial Fixture Generation (`generateFixtures`)

The process follows these steps:

```
1. Validate Tournament
   ↓
2. Check Existing Matches (Idempotency)
   ↓
3. Fetch Entries (Players/Teams)
   ↓
4. Fetch Players (for club neutrality)
   ↓
5. Fetch Courts
   ↓
6. Fetch Umpires
   ↓
7. Generate Pairings (Based on Format)
   ↓
8. Calculate Scheduling Parameters
   ↓
9. Assign Courts & Umpires
   ↓
10. Generate Match Records
    ↓
11. Insert Matches into Database
```

#### Step-by-Step Details

**Step 1: Validate Tournament**
```typescript
// Fetch tournament from database
// Check if tournament exists
// Validate tournament configuration
```

**Step 2: Check Existing Matches**
- Prevents duplicate fixture generation
- If matches exist and `force=false`, returns existing matches
- If `force=true`, deletes existing matches before generating new ones

**Step 3: Fetch Entries**
- Retrieves all entries for the tournament
- Validates minimum 2 entries required
- Checks against `max_entries` limit

**Step 4: Fetch Players**
- Fetches player data for club neutrality checks
- Creates placeholder entries if player table doesn't exist

**Step 5-6: Fetch Resources**
- Requires at least 1 court and 1 umpire
- Courts and umpires must be assigned to tournament

**Step 7: Generate Pairings**

Based on tournament format:

**Knockouts:**
1. Calculate bracket size (next power of 2)
2. Shuffle or seed entries
3. Create pairings for first round
4. Assign round names based on bracket size

**Round Robin:**
1. Use round-robin algorithm to generate all rounds
2. Each round ensures every participant plays once
3. Rotates participants to avoid repeat matchups

**Double Elimination:**
1. Initial round uses knockout pairings
2. Future rounds handled by `generateNextRoundFixtures`

**Step 8: Calculate Scheduling Parameters**

```typescript
batchSize = min(courts.length, umpires.length, max_parallel_matches_override)
slotDurationMinutes = match_duration_minutes + rest_time_minutes
startTime = start_time_override || tournament.start_date (9:00 AM default)
```

**Step 9: Assign Courts & Umpires**
- See [Scheduling Logic Documentation](./SCHEDULING_LOGIC.md) for details

**Step 10: Generate Match Records**

Each match record includes:
- `tournament_id` - Tournament reference
- `round` - Round name (e.g., "Quarterfinals")
- `match_order` - Sequential match number (1, 2, 3...)
- `entry1_id` / `entry2_id` - Participant references
- `court_id` - Assigned court
- `umpire_id` - Assigned umpire
- `scheduled_time` - ISO timestamp (YYYY-MM-DD HH:MM:SS)
- `duration_minutes` - Match duration
- `match_code` - Unique match code (e.g., "ABCD-001")
- `code_valid` - Initial state: `true`
- `is_completed` - Initial state: `false`

**Step 11: Insert Matches**
- Batch insert all match records
- Returns created matches with database IDs

---

## Algorithm Details

### Knockouts Pairing Algorithm

```typescript
function generateKnockoutsPairings(entryIds, seeded):
  1. bracketSize = nextPowerOfTwo(entryIds.length)
  2. if seeded:
       orderedEntries = entryIds (preserve order)
     else:
       orderedEntries = shuffle(entryIds)
  3. bracket = new Array(bracketSize).fill(null)
  4. Fill bracket with entries
  5. Create pairings: (bracket[i], bracket[i+1]) for i = 0, 2, 4...
```

**Example: 10 Participants → 16 Bracket**
- Positions 0-9: Actual entries
- Positions 10-15: Byes (null entries)
- Pairings: (0,1), (2,3), (4,5), (6,7), (8,9), (10,11), (12,13), (14,15)

### Round Robin Algorithm

The round-robin algorithm uses a **rotation method**:

```typescript
function generateRoundRobinPairings(entryIds):
  1. n = entryIds.length
  2. isOdd = (n % 2 === 1)
  3. numRounds = isOdd ? n : n-1
  4. For each round:
       - Fix first entry
       - Rotate other entries
       - Pair: first with last, second with second-last, etc.
       - Remove bye pairs if odd number
```

**Example: 8 Participants**

```
Round 1: (1,8), (2,7), (3,6), (4,5)
Round 2: (1,7), (8,6), (2,5), (3,4)
Round 3: (1,6), (7,5), (8,4), (2,3)
...
Round 7: (1,2), (3,8), (4,7), (5,6)
```

Each participant plays every other participant exactly once.

### Round Naming

**Knockouts:**
- Calculated based on bracket size
- `getKnockoutsRoundName(roundIndex, totalRounds)`:
  - Round of 32 → "Round of 32"
  - Round of 16 → "Round of 16"
  - Round of 8 → "Quarterfinals"
  - Round of 4 → "Semifinals"
  - Round of 2 → "Final"

**Round Robin:**
- Format: `"RR - R{roundNumber}"`
- Example: "RR - R1", "RR - R2", "RR - R7"

**Double Elimination:**
- Winners Bracket: "Winners Bracket - Round 1"
- Future: "Losers Bracket - Round 1", etc.

---

## Match Code Generation

Match codes provide a unique identifier for each match that umpires can use to access match management.

### Code Format

```
{tournamentPrefix}-{matchOrder}
```

**Example:**
- Tournament ID: `b6d3f9e2-6a1a-4672-9e3d-8f7d0f0f04a5`
- Match Order: 1
- Match Code: `B6D3-001`

### Generation Logic

```typescript
function generateMatchCode(tournamentId, matchOrder):
  1. tournamentPrefix = tournamentId.slice(0, 4).toUpperCase()
  2. paddedOrder = matchOrder.toString().padStart(3, "0")
  3. return `${tournamentPrefix}-${paddedOrder}`
```

### Properties

- **Unique:** Each match has a unique code within the tournament
- **Sequential:** Match codes increment with match order
- **Human-readable:** Easy to type and communicate
- **Secure:** Validated against match code in database (see [Match Code Flow](./MATCH_CODE_FLOW.md))

---

## Next Round Generation

For knockout tournaments, the system can automatically generate the next round once all matches in the current round are completed.

### Flow (`generateNextRoundFixtures`)

```
1. Validate Tournament & Format
   ↓
2. Check Current Round Completion
   ↓
3. Verify All Matches Have Winners
   ↓
4. Determine Next Round Name
   ↓
5. Check if Next Round Already Exists
   ↓
6. Generate Pairings for Next Round
   ↓
7. Schedule Next Round Matches
   ↓
8. Insert New Matches
```

### Round Progression Logic

The system determines the next round based on the number of winners:

| Winners | Next Round |
|---------|------------|
| 8 | Quarterfinals |
| 4 | Semifinals |
| 2 | Final |
| 16 | Round of 16 |
| 32+ | Round of {winner_count} |

**Special Cases:**

1. **2 Winners → Final**
   - Checks if Final already exists
   - If exists and incomplete, deletes it
   - If exists and completed, returns error (tournament complete)

2. **Incomplete Next Round**
   - If next round exists but is incomplete, deletes incomplete matches
   - Regenerates with correct winners

3. **Round Name Calculation**
   - Uses direct mapping for standard rounds (8→4, 4→2, 2→1)
   - For non-standard sizes, calculates based on bracket structure

### Timing

- Next round starts after the current round ends
- Start time = Latest match time + slot duration
- Ensures no overlap between rounds

---

## Error Handling

The fixture generation system uses a structured error response:

```typescript
interface GenerateFixturesResult {
  status: "ok" | "error";
  created: number;
  matches: Match[];
  warnings: string[];
  error?: string;
}
```

### Common Errors

1. **Tournament Not Found**
   - Error: `"Tournament not found"`
   - Solution: Verify tournament ID

2. **Insufficient Entries**
   - Error: `"Not enough players. Minimum 2 players required."`
   - Solution: Add more entries to tournament

3. **Max Entries Exceeded**
   - Error: `"Entries count exceeds tournament max_entries"`
   - Solution: Reduce entries or increase max_entries

4. **No Courts/Umpires**
   - Error: `"No courts available"` / `"No umpires available"`
   - Solution: Assign courts/umpires to tournament

5. **Matches Already Exist**
   - Warning: `"Fixtures already exist. Use force=true to regenerate."`
   - Solution: Use `force: true` option to regenerate

### Warnings

- **Club Neutrality Warning:**
  - `"Limited umpires available. Some matches may have same-club umpires."`
  - Occurs when club neutrality is requested but insufficient umpires

- **Dry Run:**
  - `"Dry run: No matches were inserted."`
  - Indicates matches were generated but not saved

---

## Options & Configuration

### GenerateFixturesOptions

```typescript
{
  seeded?: boolean;                      // Use entry order vs random shuffle
  force?: boolean;                       // Delete existing matches first
  start_time_override?: string;          // Custom start time (ISO)
  max_parallel_matches_override?: number;// Max concurrent matches
  respect_club_neutrality?: boolean;     // Avoid same-club umpires
  dry_run?: boolean;                     // Generate without saving
}
```

### Example Usage

```typescript
// Basic generation
await generateFixtures(tournamentId, {});

// Force regeneration with custom time
await generateFixtures(tournamentId, {
  force: true,
  start_time_override: "2025-12-01T09:00:00Z",
  respect_club_neutrality: true
});

// Dry run to preview
await generateFixtures(tournamentId, {
  dry_run: true
});
```

---

## Database Schema

### Matches Table

Key fields for fixtures:

- `tournament_id` (UUID, FK)
- `round` (VARCHAR) - Round name
- `match_order` (INTEGER) - Sequential order
- `entry1_id` / `entry2_id` (UUID, FK, nullable)
- `court_id` (UUID, FK, nullable)
- `umpire_id` (UUID, FK, nullable)
- `scheduled_time` (TIMESTAMP)
- `duration_minutes` (INTEGER)
- `match_code` (VARCHAR, unique)
- `code_valid` (BOOLEAN)
- `is_completed` (BOOLEAN)

---

## Performance Considerations

1. **Batch Insert**
   - All matches inserted in single database transaction
   - Efficient for tournaments with many matches

2. **Idempotency**
   - Checks existing matches before generation
   - Prevents duplicate fixture creation

3. **Validation Early**
   - Validates resources (courts, umpires) before generation
   - Fails fast if requirements not met

---

## Testing Scenarios

### Scenario 1: Knockouts Tournament (8 participants)
- Expected: 8 matches in Round 1, 4 in Quarterfinals, 2 in Semifinals, 1 Final
- Total: 15 matches

### Scenario 2: Round Robin (6 participants)
- Expected: 5 rounds, 3 matches per round
- Total: 15 matches (each participant plays 5 matches)

### Scenario 3: Odd Number of Participants
- Round Robin: 1 participant sits out each round (bye)
- Knockouts: Filled to next power of 2 with byes

---

## Related Documentation

- [Scheduling Logic](./SCHEDULING_LOGIC.md) - Court and umpire assignment
- [Match Code Flow](./MATCH_CODE_FLOW.md) - Match code validation and usage
- [Workflow Diagram](./WORKFLOW_DIAGRAM.md) - Overall system flow

