# Quick Start Guide - Real-Time Idle Tracking

## ⚡ 3-Minute Setup

### Step 1: Database (2 minutes)

Open **Supabase Dashboard → SQL Editor** and run these three files:

```sql
-- 1. Run this first:
migration_add_idle_tracking_courts.sql

-- 2. Run this second:
migration_add_idle_tracking_umpires.sql

-- 3. Run this last:
migration_add_actual_start_time_matches.sql
```

✅ Done! Your database is ready.

### Step 2: Verify (1 minute)

Check that these columns exist:

**Courts table:**
- `is_idle`
- `last_assigned_start_time`
- `last_assigned_match_id`

**Umpires table:**
- `is_idle`
- `last_assigned_start_time`
- `last_assigned_match_id`

**Matches table:**
- `actual_start_time`

### Step 3: Test

No code changes needed - everything is already updated!

#### Test as Umpire:
1. Go to `/umpire`
2. Enter license number
3. Enter match code
4. Click **"Start Match"**

#### Test as Organizer:
1. Go to `/host/manage/:tournamentId`
2. See courts with **"Busy"** badge
3. See umpires with **"Busy"** badge
4. Watch **"Free in Xm"** countdown

## 📖 Features at a Glance

| Feature | What It Does | Where to See It |
|---------|-------------|-----------------|
| **Start Match** | Marks court & umpire as busy | Umpire Dashboard |
| **Idle Status** | Green = available, Yellow = busy | Tournament Manage |
| **Time Countdown** | "Free in 45m" | Tournament Manage |
| **Auto Reset** | Returns to idle when match ends | Automatic |

## 🎯 What Each User Sees

### Umpire (on Umpire Dashboard)
```
┌──────────────────────────────────┐
│ Match: Player A vs Player B      │
│ Court: Court 1                   │
│                                  │
│ ✓ Match code verified            │
│                                  │
│ [▶ Start Match]                  │
└──────────────────────────────────┘
```

### Organizer (on Tournament Manage)
```
COURTS
┌────────────────────────────────┐
│ 📍 Court 1      [● Busy]       │
│    🕐 Free in 45m              │
└────────────────────────────────┘

UMPIRES
┌────────────────────────────────┐
│ ⚖️ John Smith   [● Busy]       │
│    🕐 Free in 45m              │
└────────────────────────────────┘
```

## 🔄 Complete Workflow

```
1. Organizer creates tournament with matches
2. Umpire logs in → sees assigned matches
3. Umpire enters match code
4. Umpire clicks "Start Match"
   → Court marked as Busy
   → Umpire marked as Busy
5. Organizer sees real-time status
6. Umpire submits match score
   → Court marked as Idle
   → Umpire marked as Idle
7. Resources ready for next match
```

## ✅ Verification Checklist

After setup, verify these work:

- [ ] Migrations applied successfully
- [ ] No database errors in console
- [ ] "Start Match" button appears on Umpire Dashboard
- [ ] Clicking "Start Match" shows success message
- [ ] Court shows "Busy" on Tournament Manage
- [ ] Umpire shows "Busy" on Tournament Manage
- [ ] "Free in Xm" countdown visible
- [ ] Submitting scores returns status to "Idle"
- [ ] No linting errors in code

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't find migration files | They're in the project root directory |
| "Column doesn't exist" error | Run migrations in order: courts → umpires → matches |
| Status not showing | Refresh page, check migrations applied |
| Countdown not updating | Wait 30 seconds for auto-update |
| Wrong time displayed | Check match duration is set correctly |

## 📚 More Documentation

- **README_IDLE_TRACKING.md** - Complete user guide with screenshots
- **IDLE_TRACKING_IMPLEMENTATION.md** - Full technical documentation
- **WORKFLOW_DIAGRAM.md** - Visual diagrams and flowcharts
- **IMPLEMENTATION_SUMMARY.md** - Quick technical reference

## 💡 Pro Tips

1. **Set Realistic Durations**: Make sure match durations are accurate
2. **Start Matches Promptly**: Umpires should click "Start" when ready
3. **Monitor Status**: Check Tournament Manage regularly
4. **Mobile Friendly**: Works on phones and tablets
5. **Auto-Updates**: Status refreshes every 30 seconds automatically

## 🎉 You're Done!

The system is now tracking:
- ✅ When matches start
- ✅ Which courts are busy
- ✅ Which umpires are busy
- ✅ When resources will be free
- ✅ Automatic status updates

Everything happens automatically - just start matches and the system handles the rest!

---

**Questions?** Check the full documentation in `README_IDLE_TRACKING.md`

**Issues?** See troubleshooting section above or in detailed docs

**Ready?** Start a test match and watch it work! 🚀

