# Idle Status Calculation Formula

## Formula

The time until idle is calculated using this formula:

```
time_until_idle = (start_time + duration_minutes) - current_time
```

Where:
- `start_time` = When the match actually started (timestamp)
- `duration_minutes` = How long the match lasts (in minutes)
- `current_time` = Current timestamp (now)

## Database Fields Used

### Courts Table
- `is_idle` (boolean) - Current idle status flag
- `last_assigned_start_time` (timestamp) - When match was assigned to this court
- `last_assigned_match_id` (uuid) - ID of the match currently occupying this court

### Umpires Table  
- `is_idle` (boolean) - Current idle status flag
- `last_assigned_start_time` (timestamp) - When match was assigned to this umpire
- `last_assigned_match_id` (uuid) - ID of the match currently being overseen

### Matches Table
- `actual_start_time` (timestamp) - When umpire clicked "Start Match"
- `duration_minutes` (integer) - Duration of the match in minutes

## Calculation Logic

### Step 1: Determine Start Time
Priority order:
1. `last_assigned_start_time` from court/umpire record (preferred - when match was assigned)
2. `actual_start_time` from match record (fallback - when match actually started)

### Step 2: Calculate End Time
```
end_time = start_time + (duration_minutes × 60,000 milliseconds)
```

### Step 3: Calculate Time Until Idle
```
time_until_idle_ms = end_time - current_time
time_until_idle_minutes = ceil(time_until_idle_ms / 60,000)
```

### Step 4: Determine Status

**If `time_until_idle_minutes <= 0`:**
- Status: **Idle**
- Display: "Overtime" or "Less than 1m"

**If `time_until_idle_minutes > 0`:**
- Status: **Busy**
- Display: "Free in Xm" or "Free in Xh Ym"

## Example Calculation

**Scenario:**
- Match started at: 2:00 PM (2024-11-21 14:00:00)
- Duration: 60 minutes
- Current time: 2:30 PM (2024-11-21 14:30:00)

**Calculation:**
```
start_time = 2024-11-21 14:00:00
end_time = 2024-11-21 14:00:00 + 60 minutes = 2024-11-21 15:00:00
current_time = 2024-11-21 14:30:00

time_until_idle = 15:00:00 - 14:30:00 = 30 minutes
```

**Result:**
- Status: **Busy**
- Display: "Free in 30m"

## Implementation Details

### When Match Starts
1. `matches.actual_start_time` = NOW()
2. `courts.last_assigned_start_time` = NOW()
3. `courts.last_assigned_match_id` = match.id
4. `courts.is_idle` = false
5. `umpires.last_assigned_start_time` = NOW()
6. `umpires.last_assigned_match_id` = match.id
7. `umpires.is_idle` = false

### When Match Completes
1. `matches.is_completed` = true
2. `courts.is_idle` = true
3. `courts.last_assigned_start_time` = NULL
4. `courts.last_assigned_match_id` = NULL
5. `umpires.is_idle` = true
6. `umpires.last_assigned_start_time` = NULL
7. `umpires.last_assigned_match_id` = NULL

### Real-Time Updates
- UI refreshes data every 30 seconds
- Calculation runs on every render
- Status badge updates automatically
- Countdown updates in real-time

## Edge Cases Handled

1. **Match not started yet**: Shows "Waiting to start"
2. **Missing duration**: Shows idle (can't calculate)
3. **Missing start time**: Shows idle (can't calculate)
4. **Overtime match**: Shows "Overtime" status
5. **Null database values**: Handled gracefully with fallbacks
6. **Stale is_idle flag**: Overridden by actual match start time

## Debugging

Check browser console for:
- `=== Courts Data ===` - Shows court records with idle fields
- `=== Umpires Data ===` - Shows umpire records with idle fields
- `=== Matches Data ===` - Shows matches with start times
- `=== Sample Court Calculation ===` - Shows calculated status for testing

## Verification

To verify the calculation is working:

1. Start a match on Umpire Dashboard
2. Check console logs - should show:
   - `last_assigned_start_time` is set
   - `last_assigned_match_id` is set
   - `is_idle` is false
3. Check Tournament Manage page - should show:
   - Yellow "Busy" badge
   - "Free in Xm" countdown
4. Wait for match to complete - should show:
   - Green "Idle" badge
   - No countdown

## Troubleshooting

**If status not showing:**
1. Check migrations applied (all 3 SQL files)
2. Check console for data logs
3. Verify `actual_start_time` exists in match record
4. Verify `last_assigned_start_time` exists in court/umpire record
5. Check that `duration_minutes` is set on match

**If calculation wrong:**
1. Check timezone issues (all times should be UTC)
2. Verify duration_minutes is correct
3. Check for null/undefined values
4. Verify formula: `(start + duration) - current`

