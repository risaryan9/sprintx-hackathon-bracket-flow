# Real-Time Match Start Tracking & Idle Status Implementation

## Overview

This document describes the implementation of real-time match start tracking, idle status monitoring, and idle-until calculations for courts, umpires, and matches in the tournament management system.

## Database Schema Changes

### 1. Courts Table
New columns added to track court idle status:

```sql
- is_idle: BOOLEAN (default: true)
- last_assigned_start_time: TIMESTAMP (nullable)
- last_assigned_match_id: UUID (nullable, foreign key to matches.id)
```

**Purpose**: Track when a court becomes occupied by a match and calculate when it will be free.

### 2. Umpires Table
New columns added to track umpire idle status:

```sql
- is_idle: BOOLEAN (default: true)
- last_assigned_start_time: TIMESTAMP (nullable)
- last_assigned_match_id: UUID (nullable, foreign key to matches.id)
```

**Purpose**: Track when an umpire starts overseeing a match and calculate when they will be free.

### 3. Matches Table
New column to track actual match start time:

```sql
- actual_start_time: TIMESTAMP (nullable)
```

**Purpose**: Record when the umpire actually started the match (vs. scheduled_time which is the planned start).

## Migration Files

Three migration SQL files have been created:

1. **migration_add_idle_tracking_courts.sql** - Adds idle tracking to courts table
2. **migration_add_idle_tracking_umpires.sql** - Adds idle tracking to umpires table
3. **migration_add_actual_start_time_matches.sql** - Adds actual start time to matches table

### How to Apply Migrations

Run these SQL scripts against your Supabase database in order:

```bash
# Via Supabase Dashboard SQL Editor
1. Open Supabase Dashboard > SQL Editor
2. Copy and paste each migration file
3. Execute in order (courts → umpires → matches)

# Or via psql
psql -h your-db-host -U postgres -d your-database -f migration_add_idle_tracking_courts.sql
psql -h your-db-host -U postgres -d your-database -f migration_add_idle_tracking_umpires.sql
psql -h your-db-host -U postgres -d your-database -f migration_add_actual_start_time_matches.sql
```

## Implementation Logic

### When a Match is Started (Umpire Dashboard)

When an umpire clicks "Start Match":

1. **Match Table Updates**:
   - `actual_start_time` is set to current timestamp
   
2. **Umpire Table Updates**:
   - `is_idle` is set to `false`
   - `last_assigned_start_time` is set to current timestamp
   - `last_assigned_match_id` is set to the match ID
   
3. **Court Table Updates**:
   - `is_idle` is set to `false`
   - `last_assigned_start_time` is set to current timestamp
   - `last_assigned_match_id` is set to the match ID

### When a Match is Completed (Umpire Dashboard)

When an umpire submits the match score:

1. **Match Table Updates**:
   - `is_completed` is set to `true`
   - `winner_entry_id` is set
   - `code_valid` is set to `false`
   - Scores are recorded
   
2. **Umpire Table Updates**:
   - `is_idle` is set back to `true`
   - `last_assigned_start_time` is set to `null`
   - `last_assigned_match_id` is set to `null`
   
3. **Court Table Updates**:
   - `is_idle` is set back to `true`
   - `last_assigned_start_time` is set to `null`
   - `last_assigned_match_id` is set to `null`

### Idle Time Calculation (Frontend)

The frontend dynamically calculates "time until idle" using:

```
time_until_idle = (actual_start_time + duration_minutes) - current_time
```

This calculation is performed in the `calculateIdleStatus()` utility function located in `/src/utils/idleCalculations.ts`.

The calculation:
- Updates every 30 seconds automatically
- Shows formatted time like "5m", "1h 30m", etc.
- Displays "Overtime" if the match duration has been exceeded
- Shows "Now" if the time has just expired

## Code Changes

### New Files

1. **src/utils/idleCalculations.ts**
   - `calculateIdleStatus()` - Core calculation logic
   - `calculateIdleStatusWithMatch()` - Helper for matching with match data
   - `formatTimeUntilIdle()` - Human-readable time formatting

### Modified Files

1. **src/types/match.ts**
   - Added `actual_start_time` to `Match` interface
   - Added idle tracking fields to `Court` and `Umpire` interfaces

2. **src/types/bracket.ts**
   - Added `actual_start_time` to `BracketMatch` interface

3. **src/services/tournaments.ts**
   - Updated `Court` and `Umpire` interfaces with idle tracking fields

4. **src/services/matches.ts**
   - **NEW**: `startMatch()` function to handle match start logic
   - Updates match, umpire, and court records when match starts

5. **src/services/umpires.ts**
   - Updated `submitMatchScore()` to reset idle status on match completion
   - Resets both umpire and court to idle when match ends

6. **src/pages/UmpireDashboard.tsx**
   - Added `handleStartMatch()` function
   - Calls `startMatch()` service when "Start Match" button is clicked
   - Invalidates queries to refresh data

7. **src/pages/TournamentManage.tsx**
   - Displays idle status badges for courts and umpires
   - Shows "time until idle" countdown
   - Updates every 30 seconds for real-time display
   - Color-coded badges:
     - Green = Idle
     - Yellow = Busy

## UI/UX Features

### Umpire Dashboard
- "Start Match" button triggers the idle tracking system
- Match timer starts after clicking "Start Match"
- Toast notifications for success/error feedback
- Data refreshes automatically after starting match

### Tournament Manage Page

#### Court Display
Each court shows:
- Court name and location
- **Idle/Busy badge** (green for idle, yellow for busy)
- **Time until free** (e.g., "Free in 1h 30m")
- Automatically updates every 30 seconds

#### Umpire Display
Each umpire shows:
- Umpire name and license
- **Idle/Busy badge** (green for idle, yellow for busy)
- **Time until free** (e.g., "Free in 45m")
- Automatically updates every 30 seconds

## Important Notes

### Frontend vs Database Calculations

**Why time-until-idle is NOT stored in the database:**
- The "time until idle" is a dynamic, time-dependent calculation
- Storing it would require constant database updates
- Frontend calculation is more efficient and always accurate
- Only timestamps and durations are stored in the database

### Automatic Idle Reset

The system automatically resets idle status when:
- A match is marked as completed
- An umpire submits match scores

### Edge Cases Handled

1. **Match already started**: Prevents starting a match twice
2. **Match already completed**: Prevents starting a completed match
3. **Missing match data**: Gracefully handles null values
4. **Overtime matches**: Shows "Overtime" when duration exceeded
5. **Concurrent updates**: Uses match ID checks to prevent conflicts

### Real-Time Updates

The Tournament Manage page uses:
- React `useEffect` hook with 30-second interval
- Query invalidation on match start/completion
- State updates trigger UI re-renders with fresh calculations

## Testing Checklist

- [ ] Apply all three migration files to database
- [ ] Verify new columns exist in courts, umpires, and matches tables
- [ ] Test "Start Match" button on Umpire Dashboard
- [ ] Verify umpire shows as "Busy" on Tournament Manage page
- [ ] Verify court shows as "Busy" on Tournament Manage page
- [ ] Check "time until idle" countdown is accurate
- [ ] Submit match score and verify idle status resets
- [ ] Test with multiple simultaneous matches
- [ ] Verify real-time updates every 30 seconds
- [ ] Test edge cases (null values, completed matches, etc.)

## Future Enhancements

Potential improvements for future development:

1. **Conflict Prevention**: Warn when trying to assign busy umpires/courts
2. **Notification System**: Alert when umpires/courts become free
3. **Historical Tracking**: Store idle time history for analytics
4. **Load Balancing**: Auto-assign matches to idle resources
5. **Mobile Responsiveness**: Optimize idle status display for mobile
6. **WebSocket Integration**: Real-time updates without polling

## Troubleshooting

### Issue: Idle status not updating
**Solution**: Check that migrations have been applied correctly and verify the query is fetching the new columns.

### Issue: Time calculation is incorrect
**Solution**: Verify that `actual_start_time` and `duration_minutes` are properly set when match starts.

### Issue: Status doesn't reset after match completion
**Solution**: Check that `submitMatchScore()` is successfully updating the umpire and court tables.

### Issue: UI not refreshing
**Solution**: Verify that the 30-second interval is running and query invalidation is working.

## API Reference

### Service Functions

#### `startMatch(matchId: string): Promise<void>`
**Location**: `src/services/matches.ts`
**Purpose**: Start a match and mark umpire/court as busy
**Throws**: Error if match not found, already started, or already completed

#### `submitMatchScore(matchId, entry1Id, entry2Id, scoreInput): Promise<void>`
**Location**: `src/services/umpires.ts`
**Purpose**: Submit match score and reset idle status
**Side Effects**: Resets umpire and court to idle

### Utility Functions

#### `calculateIdleStatus(isIdle, lastAssignedStartTime, matchDurationMinutes): IdleStatus`
**Location**: `src/utils/idleCalculations.ts`
**Returns**: Object with `isIdle`, `minutesUntilIdle`, `timeUntilIdleFormatted`

#### `calculateIdleStatusWithMatch(isIdle, lastAssignedStartTime, lastAssignedMatchId, matches): IdleStatus`
**Location**: `src/utils/idleCalculations.ts`
**Purpose**: Calculate idle status by looking up match data

#### `formatTimeUntilIdle(minutes: number): string`
**Location**: `src/utils/idleCalculations.ts`
**Returns**: Human-readable time string (e.g., "1h 30m", "45m")

## Database Indexes

The migrations create indexes for performance:

```sql
-- Courts
idx_courts_is_idle
idx_courts_last_assigned_match

-- Umpires
idx_umpires_is_idle
idx_umpires_last_assigned_match

-- Matches
idx_matches_actual_start_time
```

These indexes optimize queries that filter by idle status or look up matches by ID.

## Conclusion

This implementation provides a robust, real-time system for tracking court and umpire availability during tournaments. The system prevents conflicts, provides accurate timing information, and automatically manages resource allocation throughout the tournament lifecycle.

