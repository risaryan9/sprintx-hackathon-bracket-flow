# Match Code Flow

## Overview

The match code system provides secure access control for match management. Each match has a unique code that umpires must enter to access match controls (start match, enter scores, disqualify players, etc.). This document explains the complete flow of match code generation, validation, and usage.

## Table of Contents

1. [Architecture](#architecture)
2. [Match Code Generation](#match-code-generation)
3. [Match Code Validation](#match-code-validation)
4. [Umpire Access Flow](#umpire-access-flow)
5. [Match Management Flow](#match-management-flow)
6. [Security Model](#security-model)
7. [State Management](#state-management)
8. [Error Handling](#error-handling)

---

## Architecture

The match code system involves multiple components:

- **Match Code Generation:** During fixture generation (`generateFixtures()`)
- **Match Code Validation:** Umpire service (`validateMatchCode()`)
- **Match Retrieval:** Umpire service (`getMatchByCode()`)
- **Match Management:** Score submission, match start, disqualification

### Key Functions

**Location: `src/services/fixtures.ts`**
- `generateMatchCode()` - Creates unique match codes

**Location: `src/services/umpires.ts`**
- `getMatchByCode()` - Retrieves match by code and umpire
- `validateMatchCode()` - Validates match code
- `submitMatchScore()` - Submits match results (invalidates code)

**Location: `src/services/matches.ts`**
- `startMatch()` - Starts match timer (marks resources as busy)

---

## Match Code Generation

Match codes are generated automatically when fixtures are created.

### Code Format

```
{tournamentPrefix}-{matchOrder}
```

**Example:**
- Tournament ID: `b6d3f9e2-6a1a-4672-9e3d-8f7d0f0f04a5`
- Match Order: 1
- **Match Code: `B6D3-001`**

### Generation Algorithm

```typescript
function generateMatchCode(tournamentId: string, matchOrder: number): string {
  // Extract first 4 characters of tournament ID
  const tournamentPrefix = tournamentId.slice(0, 4).toUpperCase();
  
  // Pad match order to 3 digits
  const paddedOrder = matchOrder.toString().padStart(3, "0");
  
  return `${tournamentPrefix}-${paddedOrder}`;
}
```

### Properties

- **Unique per tournament:** Each match has a unique sequential code
- **Human-readable:** Easy to type and communicate verbally
- **Sequential:** Codes increment with match order (001, 002, 003...)
- **Short:** Format keeps codes concise (e.g., `B6D3-042`)

### Storage

Match codes are stored in the `matches` table:
- Field: `match_code` (VARCHAR, unique)
- Field: `code_valid` (BOOLEAN) - Indicates if code is still valid
- Initial state: `code_valid = true`

### Example Generation

For a tournament with 16 matches:

```
Match Order → Match Code
1           → B6D3-001
2           → B6D3-002
3           → B6D3-003
...
16          → B6D3-016
```

---

## Match Code Validation

Match code validation ensures that:
1. The match code exists
2. The match is assigned to the requesting umpire
3. The match code is still valid (not used)
4. The match is not already completed

### Validation Flow

```
1. Umpire enters match code
   ↓
2. System retrieves match by code
   ↓
3. Verify match is assigned to umpire
   ↓
4. Verify match code validity
   ↓
5. Verify match not completed
   ↓
6. Return match data (if valid)
```

### Validation Function

**Location: `src/services/umpires.ts`**

```typescript
async function validateMatchCode(
  matchId: string,
  matchCode: string
): Promise<boolean>
```

**Steps:**

1. **Fetch Match:**
   ```sql
   SELECT match_code, code_valid, is_completed
   FROM matches
   WHERE id = matchId
   ```

2. **Check Completion:**
   - If `is_completed = true` → Error: "Match already completed"

3. **Check Code Validity:**
   - If `code_valid = false` → Error: "Match code has been invalidated"

4. **Compare Codes:**
   - If `match_code !== inputCode` → Return `false`
   - If `match_code === inputCode` → Return `true`

### Error Cases

| Condition | Error Message |
|-----------|---------------|
| Match not found | "Match not found." |
| Match completed | "This match has already been completed and cannot be edited." |
| Code invalidated | "Match code has been invalidated and cannot be used." |
| Code mismatch | Returns `false` (no error thrown) |

---

## Umpire Access Flow

The complete flow from umpire login to match management:

```
1. Umpire Dashboard Access
   ↓
2. Enter License Number
   ↓
3. Load Umpire Profile
   ↓
4. Enter Match Code
   ↓
5. Validate Match Code
   ↓
6. Load Match Data
   ↓
7. Match Management Available
```

### Step-by-Step Flow

**Step 1: Dashboard Access**
- Umpire navigates to `/umpire` (UmpireDashboard)
- Initial state: License number input field

**Step 2: License Entry**
```typescript
// User enters license number (e.g., "IND-UMP-5099")
setSubmittedLicenseNo(licenseNo)
```

**Step 3: Load Profile**
```typescript
// Fetch umpire data
const { data: umpireData } = useQuery({
  queryKey: ["umpire-matches", submittedLicenseNo],
  queryFn: () => getUmpireMatchesByLicense(submittedLicenseNo),
  enabled: !!submittedLicenseNo
})
```

**Step 4: Match Code Entry**
```typescript
// User enters match code (e.g., "B6D3-001")
setMatchCode(matchCode)
```

**Step 5: Validation**
```typescript
// Get match by code and verify assignment
const match = await getMatchByCode(matchCode, umpireId)

if (!match) {
  // Match not found or not assigned to umpire
  return error
}

// Validate match code
const isValid = await validateMatchCode(match.id, matchCode)

if (!isValid) {
  // Invalid match code
  return error
}
```

**Step 6: Load Match**
```typescript
// Match is valid and loaded
setValidatedMatch(match)
// Match management UI becomes available
```

---

## Match Management Flow

Once a match code is validated, umpires can manage the match.

### Available Actions

1. **Start Match**
   - Records `actual_start_time`
   - Marks umpire and court as busy
   - Starts match timer

2. **Enter Scores**
   - Records entry scores
   - Assigns winner
   - Handles disqualification

3. **Submit Results**
   - Marks match as completed
   - Invalidates match code (`code_valid = false`)
   - Resets umpire/court idle status

### Start Match Flow

```typescript
async function startMatch(matchId: string): Promise<void> {
  1. Fetch match data
  2. Verify match not completed
  3. Verify match not already started
  4. Update match:
     - actual_start_time = now()
  5. Update umpire:
     - is_idle = false
     - last_assigned_start_time = now()
     - last_assigned_match_id = matchId
  6. Update court:
     - is_idle = false
     - last_assigned_start_time = now()
     - last_assigned_match_id = matchId
}
```

**Database Updates:**

```sql
-- Match
UPDATE matches
SET actual_start_time = NOW()
WHERE id = matchId;

-- Umpire
UPDATE umpires
SET is_idle = false,
    last_assigned_start_time = NOW(),
    last_assigned_match_id = matchId
WHERE id = umpire_id;

-- Court
UPDATE courts
SET is_idle = false,
    last_assigned_start_time = NOW(),
    last_assigned_match_id = matchId
WHERE id = court_id;
```

### Score Submission Flow

```typescript
async function submitMatchScore(
  matchId: string,
  entry1Id: string | null,
  entry2Id: string | null,
  scoreInput: MatchScoreInput
): Promise<void> {
  1. Validate match can be updated:
     - Match exists
     - Match not completed
     - Code still valid
     
  2. Determine winner:
     - If disqualification: winner = other entry
     - Else: winner = scoreInput.winner_entry_id
     
  3. Update match:
     - winner_entry_id = winner
     - is_completed = true
     - code_valid = false  // Invalidate code
     - entry1_score = score (if provided)
     - entry2_score = score (if provided)
     
  4. Reset resources:
     - Umpire: is_idle = true
     - Court: is_idle = true
}
```

**Match Score Input:**

```typescript
interface MatchScoreInput {
  entry1_score?: number | null;
  entry2_score?: number | null;
  winner_entry_id: string | null;
  entry1_disqualified?: boolean;
  entry2_disqualified?: boolean;
}
```

**Code Invalidation:**
- After score submission, `code_valid = false`
- Prevents further edits to completed matches
- Ensures data integrity

---

## Security Model

### Access Control Layers

1. **License Number Verification**
   - Only registered umpires can access dashboard
   - License number must exist in database

2. **Match Assignment Check**
   - Match must be assigned to the umpire (`umpire_id` matches)
   - `getMatchByCode()` filters by both code and umpire ID

3. **Match Code Validation**
   - Code must match database exactly
   - Code must be valid (`code_valid = true`)

4. **State Validation**
   - Match cannot be already completed
   - Code cannot be already used

### Security Features

**Single-Use Codes:**
- After score submission, code is invalidated
- Prevents multiple submissions
- Ensures match results are final

**Umpire Restriction:**
- Match code only works for assigned umpire
- Other umpires cannot access the match
- Prevents unauthorized access

**State Checks:**
- Multiple validation layers
- Database constraints
- Application-level checks

### Attack Prevention

| Attack Vector | Prevention |
|---------------|------------|
| Code guessing | Sequential codes are not predictable (require tournament ID prefix) |
| Unauthorized access | Match must be assigned to umpire |
| Double submission | Code invalidated after first submission |
| Replay attack | Code becomes invalid after use |
| Completed match editing | State check prevents edits to completed matches |

---

## State Management

### Match States

| State | `is_completed` | `code_valid` | `actual_start_time` | Description |
|-------|----------------|--------------|---------------------|-------------|
| Scheduled | `false` | `true` | `null` | Match created, not started |
| Running | `false` | `true` | `timestamp` | Match in progress |
| Awaiting Result | `false` | `true` | `timestamp` | Match time ended, awaiting result |
| Completed | `true` | `false` | `timestamp` | Match finished, results submitted |

### Code Validity States

**Valid (`code_valid = true`):**
- Match code can be used
- Match can be managed
- Scores can be submitted

**Invalid (`code_valid = false`):**
- Match code cannot be used
- Match is read-only
- Results are final

### State Transitions

```
Scheduled
  ↓ [Start Match]
Running
  ↓ [Time Expires]
Awaiting Result
  ↓ [Submit Score]
Completed (code invalidated)
```

---

## Error Handling

### Validation Errors

**Match Not Found:**
```typescript
{
  error: "Umpire not found with the provided license number."
}
```

**Match Code Not Assigned:**
```typescript
{
  error: "Match code not found or not assigned to you."
}
```

**Invalid Match Code:**
```typescript
{
  error: "Invalid match code. Please try again."
}
```

**Match Already Completed:**
```typescript
{
  error: "This match has already been completed and cannot be edited."
}
```

**Code Invalidated:**
```typescript
{
  error: "Match code has been invalidated and cannot be used."
}
```

### User Experience

**Clear Error Messages:**
- Specific errors for each failure case
- Actionable messages
- No technical jargon

**Real-time Validation:**
- Immediate feedback on code entry
- Prevents unnecessary submissions
- Shows loading states

---

## Match Code Retrieval

### Function: `getMatchByCode()`

Retrieves match by code and verifies umpire assignment.

**Location: `src/services/umpires.ts`**

```typescript
async function getMatchByCode(
  matchCode: string,
  umpireId: string
): Promise<BracketMatch | null>
```

**Query:**
```sql
SELECT *
FROM matches
WHERE match_code = matchCode
  AND umpire_id = umpireId
```

**Enrichment:**
- Fetches tournament data
- Fetches entry data (players/teams)
- Fetches court data
- Fetches umpire name
- Transforms to `BracketMatch` format

**Returns:**
- `BracketMatch` object if found and assigned
- `null` if not found or not assigned

---

## Database Schema

### Matches Table

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id),
  match_code VARCHAR UNIQUE NOT NULL,
  code_valid BOOLEAN DEFAULT true,
  umpire_id UUID REFERENCES umpires(id),
  is_completed BOOLEAN DEFAULT false,
  winner_entry_id UUID,
  actual_start_time TIMESTAMP,
  ...
);
```

### Key Fields

- `match_code` - Unique identifier (format: `XXXX-NNN`)
- `code_valid` - Boolean flag for code validity
- `umpire_id` - Assigned umpire (required for validation)
- `is_completed` - Match completion status
- `actual_start_time` - When match started

---

## Example Scenarios

### Scenario 1: Successful Match Access

```
1. Umpire enters license: "IND-UMP-5099"
2. System loads umpire profile
3. Umpire enters match code: "B6D3-001"
4. System validates:
   - Match code exists ✓
   - Assigned to umpire ✓
   - Code is valid ✓
   - Match not completed ✓
5. Match loaded successfully
6. Umpire can manage match
```

### Scenario 2: Invalid Match Code

```
1. Umpire enters license: "IND-UMP-5099"
2. System loads umpire profile
3. Umpire enters match code: "B6D3-999"
4. System validates:
   - Match code exists ✗
5. Error: "Match code not found or not assigned to you"
```

### Scenario 3: Completed Match

```
1. Umpire enters match code: "B6D3-001"
2. System validates:
   - Match code exists ✓
   - Assigned to umpire ✓
   - Code is valid ✗ (already used)
3. Error: "Match code has been invalidated and cannot be used"
```

### Scenario 4: Wrong Umpire

```
1. Umpire A enters match code: "B6D3-001"
2. Match is assigned to Umpire B
3. System validates:
   - Match code exists ✓
   - Assigned to umpire ✗ (different umpire)
4. Error: "Match code not found or not assigned to you"
```

---

## UI Flow

### Umpire Dashboard

**Location: `src/pages/UmpireDashboard.tsx`**

**Components:**
1. License Number Input
2. Umpire Profile Panel (left side)
3. Match Code Input (right side)
4. Match Management Panel (after validation)

**State Management:**
```typescript
const [licenseNo, setLicenseNo] = useState("")
const [matchCode, setMatchCode] = useState("")
const [validatedMatch, setValidatedMatch] = useState<BracketMatch | null>(null)
const [matchCodeError, setMatchCodeError] = useState<string | null>(null)
```

**Flow:**
```
1. Enter license → Load profile
2. Enter match code → Validate
3. If valid → Show match management
4. If invalid → Show error
```

---

## Best Practices

1. **Never Share Match Codes**
   - Match codes should only be communicated to assigned umpire
   - Don't display codes publicly

2. **One-Time Use**
   - Codes are invalidated after score submission
   - Prevents accidental duplicate submissions

3. **Secure Transmission**
   - Match codes transmitted over HTTPS
   - Never log match codes in plain text

4. **Clear Communication**
   - Provide match codes to umpires before match
   - Include in match assignment notifications

---

## Related Documentation

- [Fixture Logic](./FIXTURE_LOGIC.md) - How match codes are generated
- [Scheduling Logic](./SCHEDULING_LOGIC.md) - How matches are assigned to umpires
- [Idle Tracking](./IDLE_TRACKING_IMPLEMENTATION.md) - Resource status management

---

## Troubleshooting

### Issue: Match Code Not Found

**Possible Causes:**
- Typo in match code
- Match not assigned to umpire
- Match code doesn't exist

**Solution:**
- Verify match code spelling
- Check match assignment
- Confirm match exists in database

### Issue: Code Already Invalidated

**Possible Causes:**
- Match already completed
- Code already used

**Solution:**
- Check match completion status
- Match results are final

### Issue: Wrong Umpire

**Possible Causes:**
- Match assigned to different umpire
- Umpire ID mismatch

**Solution:**
- Verify match assignment
- Check umpire license number

