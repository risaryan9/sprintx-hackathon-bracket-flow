# Complete List of SQL Migrations

## Required Migrations for Auto-Idle and Awaiting Result Feature

Run these SQL files in your **Supabase SQL Editor** in this **exact order**:

### Migration 1: Add idle tracking to Courts
**File**: `migration_add_idle_tracking_courts.sql`

```sql
-- Copy the entire contents of migration_add_idle_tracking_courts.sql
```

### Migration 2: Add idle tracking to Umpires  
**File**: `migration_add_idle_tracking_umpires.sql`

```sql
-- Copy the entire contents of migration_add_idle_tracking_umpires.sql
```

### Migration 3: Add actual_start_time to Matches
**File**: `migration_add_actual_start_time_matches.sql`

```sql
-- Copy the entire contents of migration_add_actual_start_time_matches.sql
```

### Migration 4: Add awaiting_result to Matches (NEW)
**File**: `migration_add_awaiting_result_matches.sql`

```sql
-- Copy the entire contents of migration_add_awaiting_result_matches.sql
```

## Quick Copy-Paste Guide

1. Open Supabase Dashboard → SQL Editor
2. For each migration file above:
   - Open the file in your project
   - Copy ALL the SQL content
   - Paste into Supabase SQL Editor
   - Click "Run"
   - Wait for "Success" message
3. Move to next migration

## Verification

After running all migrations, verify with:

```sql
-- Check courts table has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'courts' 
AND column_name IN ('is_idle', 'last_assigned_start_time', 'last_assigned_match_id');

-- Check umpires table has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'umpires' 
AND column_name IN ('is_idle', 'last_assigned_start_time', 'last_assigned_match_id');

-- Check matches table has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'matches' 
AND column_name IN ('actual_start_time', 'awaiting_result');
```

All queries should return 2 rows for courts, 2 rows for umpires, and 2 rows for matches.

