# Auto-Idle and Awaiting Result Feature - Migration Guide

## Overview

This feature automatically resets umpires and courts to idle status when match duration ends, and tracks matches that are awaiting result submission.

## Required SQL Migrations

Run these migrations in **Supabase SQL Editor** in this exact order:

### 1. Add awaiting_result column to matches table

**File: `migration_add_awaiting_result_matches.sql`**

```sql
-- Migration: Add awaiting_result column to matches table
-- This tracks when a match has finished its duration but is waiting for the umpire to submit results

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS awaiting_result BOOLEAN DEFAULT false;

-- Create index for faster queries on awaiting_result status
CREATE INDEX IF NOT EXISTS idx_matches_awaiting_result ON matches(awaiting_result);

-- Update existing completed matches to not be awaiting result
UPDATE matches
SET awaiting_result = false
WHERE is_completed = true;

COMMENT ON COLUMN matches.awaiting_result IS 'Indicates the match duration has ended but umpire has not yet submitted the final result';
```

## How It Works

### Auto-Idle Logic

1. **Periodic Check**: Every 30 seconds, the system checks all active matches
2. **Duration Calculation**: For each match with `actual_start_time`, calculates: `end_time = start_time + duration_minutes`
3. **Auto-Reset**: If current time > end_time + 1 minute:
   - Sets match `awaiting_result = true`
   - Resets umpire to idle (`is_idle = true`, clears assigned match)
   - Resets court to idle (`is_idle = true`, clears assigned match)

### Awaiting Result Status

- When match duration ends, `awaiting_result` is set to `true`
- Umpire dashboard shows "Awaiting Result" alert
- Once umpire submits scores, `awaiting_result` is set to `false`

### Umpire Dashboard Features

1. **Remaining Time Display**: Shows countdown timer (e.g., "Time remaining: 25m")
2. **Awaiting Result Alert**: Yellow alert when duration has ended
3. **Auto-Refresh**: Updates every 30 seconds
4. **Start Match Button**: Only shows if match hasn't started yet (checks `actual_start_time`)

## Database Schema Changes

### Matches Table
- New column: `awaiting_result` (boolean, default: false)
- Index: `idx_matches_awaiting_result`

## Frontend Changes

### New Files
- `src/services/matchStatus.ts` - Auto-update idle status service

### Updated Files
- `src/services/umpires.ts` - Clears awaiting_result on match completion
- `src/services/bracket.ts` - Includes awaiting_result in match data
- `src/types/match.ts` - Added awaiting_result field
- `src/types/bracket.ts` - Added awaiting_result field
- `src/pages/UmpireDashboard.tsx` - Shows remaining time and awaiting result status

## Testing Checklist

- [ ] Run migration: `migration_add_awaiting_result_matches.sql`
- [ ] Start a match on Umpire Dashboard
- [ ] Verify remaining time countdown appears
- [ ] Wait for match duration to end (or manually update database)
- [ ] Verify "Awaiting Result" alert appears
- [ ] Verify umpire and court return to idle automatically
- [ ] Submit match result and verify awaiting_result clears
- [ ] Refresh page - "Start Match" button should not appear if match already started

## Verification Queries

### Check matches awaiting result:
```sql
SELECT id, match_code, actual_start_time, duration_minutes, awaiting_result, is_completed
FROM matches
WHERE awaiting_result = true;
```

### Check umpire idle status:
```sql
SELECT id, full_name, is_idle, last_assigned_match_id, last_assigned_start_time
FROM umpires
WHERE is_idle = false;
```

### Check court idle status:
```sql
SELECT id, court_name, is_idle, last_assigned_match_id, last_assigned_start_time
FROM courts
WHERE is_idle = false;
```

## Troubleshooting

**Issue**: Umpires/Courts not auto-resetting to idle
- **Solution**: Check that `autoUpdateIdleStatus()` is being called (every 30 seconds)
- Verify match has `actual_start_time` and `duration_minutes` set
- Check browser console for errors

**Issue**: "Awaiting Result" not showing
- **Solution**: Verify `awaiting_result` column exists in matches table
- Check that migration was applied successfully

**Issue**: "Start Match" button shows after refresh
- **Solution**: Ensure match query includes `actual_start_time` field
- Check that startedMatches state is updated from database data

