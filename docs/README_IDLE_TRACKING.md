# Real-Time Match Start Tracking & Idle Status System

## 🎯 Overview

This implementation adds real-time tracking of court and umpire availability during tournament matches. When an umpire starts a match, the system automatically marks the umpire and court as busy and calculates when they will become idle again.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Features](#features)
3. [Database Changes](#database-changes)
4. [How It Works](#how-it-works)
5. [UI Screenshots](#ui-screenshots)
6. [Files Changed](#files-changed)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Additional Documentation](#additional-documentation)

## 🚀 Quick Start

### Step 1: Apply Database Migrations

Run these SQL scripts in your Supabase SQL Editor **in this exact order**:

1. `migration_add_idle_tracking_courts.sql`
2. `migration_add_idle_tracking_umpires.sql`
3. `migration_add_actual_start_time_matches.sql`

**Via Supabase Dashboard:**
- Navigate to SQL Editor
- Copy and paste each file
- Click "Run" for each one

### Step 2: Deploy Frontend Changes

All frontend code is already updated. Simply deploy:

```bash
npm run build
# or
bun run build
```

### Step 3: Test the System

1. **Umpire Dashboard** (`/umpire`):
   - Enter an umpire license number
   - Validate a match code
   - Click "Start Match"
   - Watch the timer count down

2. **Tournament Manage** (`/host/manage/:tournamentId`):
   - View assigned courts and umpires
   - See "Idle" or "Busy" status badges
   - Watch "Free in X minutes" countdown
   - Status updates every 30 seconds

## ✨ Features

### 1. Match Start Tracking
- ✅ Umpires click "Start Match" to begin
- ✅ System records exact start timestamp
- ✅ Prevents duplicate match starts
- ✅ Validates match hasn't been completed

### 2. Real-Time Idle Status
- ✅ **Idle** (green badge) - Resource is available
- ✅ **Busy** (yellow badge) - Resource is occupied
- ✅ Automatic status updates every 30 seconds
- ✅ Visible on Tournament Manage page

### 3. Time Until Idle Display
- ✅ Shows countdown: "Free in 45m"
- ✅ Formatted for readability: "1h 30m"
- ✅ Displays "Overtime" if duration exceeded
- ✅ Calculated in real-time on frontend

### 4. Automatic Reset
- ✅ When umpire submits match scores
- ✅ Court returns to idle automatically
- ✅ Umpire returns to idle automatically
- ✅ No manual intervention required

## 🗄️ Database Changes

### New Columns

#### Courts Table
```sql
is_idle                  BOOLEAN      DEFAULT true
last_assigned_start_time TIMESTAMP    NULL
last_assigned_match_id   UUID         NULL (FK → matches.id)
```

#### Umpires Table
```sql
is_idle                  BOOLEAN      DEFAULT true
last_assigned_start_time TIMESTAMP    NULL
last_assigned_match_id   UUID         NULL (FK → matches.id)
```

#### Matches Table
```sql
actual_start_time        TIMESTAMP    NULL
```

### Indexes Created
- `idx_courts_is_idle` - Fast queries on court status
- `idx_courts_last_assigned_match` - Fast match lookups
- `idx_umpires_is_idle` - Fast queries on umpire status
- `idx_umpires_last_assigned_match` - Fast match lookups
- `idx_matches_actual_start_time` - Fast match start queries

## 🔄 How It Works

### When a Match Starts

```
1. Umpire clicks "Start Match" button
   ↓
2. startMatch() service function is called
   ↓
3. Database updates:
   • matches.actual_start_time = NOW()
   • umpires.is_idle = false
   • umpires.last_assigned_start_time = NOW()
   • umpires.last_assigned_match_id = match.id
   • courts.is_idle = false
   • courts.last_assigned_start_time = NOW()
   • courts.last_assigned_match_id = match.id
   ↓
4. Frontend updates:
   • Toast notification shown
   • Match timer starts
   • Query cache invalidated
   • Tournament Manage page shows "Busy"
```

### Idle Time Calculation

**Formula:**
```javascript
time_until_idle = (actual_start_time + duration_minutes) - current_time
```

**Example:**
- Match started: 2:00 PM
- Duration: 60 minutes
- Current time: 2:30 PM
- Time until idle: 30 minutes → "Free in 30m"

### When a Match Completes

```
1. Umpire submits match scores
   ↓
2. submitMatchScore() service function is called
   ↓
3. Database updates:
   • matches.is_completed = true
   • matches.winner_entry_id = winner
   • umpires.is_idle = true
   • umpires.last_assigned_start_time = NULL
   • umpires.last_assigned_match_id = NULL
   • courts.is_idle = true
   • courts.last_assigned_start_time = NULL
   • courts.last_assigned_match_id = NULL
   ↓
4. Frontend updates:
   • Toast notification shown
   • Match removed from umpire list
   • Tournament Manage page shows "Idle"
```

## 🎨 UI Screenshots

### Umpire Dashboard - Start Match
```
┌─────────────────────────────────────────────────┐
│ Match: Player A vs Player B                     │
│ Court: Court 1 | Scheduled: 2:00 PM            │
│                                                 │
│ [✓] Match code verified                         │
│                                                 │
│ ┌───────────────────────────────────┐          │
│ │    [▶ Start Match]                 │          │
│ └───────────────────────────────────┘          │
└─────────────────────────────────────────────────┘
```

### Tournament Manage - Courts Section
```
┌─────────────────────────────────────────────────┐
│ ASSIGNED COURTS                                 │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ 📍 Court 1              [● Busy]        │   │
│ │    Location: Main Hall                  │   │
│ │    🕐 Free in 45m                       │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ 📍 Court 2              [✓ Idle]        │   │
│ │    Location: Side Hall                  │   │
│ └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Tournament Manage - Umpires Section
```
┌─────────────────────────────────────────────────┐
│ ASSIGNED UMPIRES                                │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ ⚖️ John Smith           [● Busy]        │   │
│ │    License: UMP-001                     │   │
│ │    🕐 Free in 1h 15m                    │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ ⚖️ Jane Doe             [✓ Idle]        │   │
│ │    License: UMP-002                     │   │
│ └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## 📁 Files Changed

### New Files Created
- ✅ `src/utils/idleCalculations.ts` - Idle status calculation utilities
- ✅ `migration_add_idle_tracking_courts.sql` - Courts table migration
- ✅ `migration_add_idle_tracking_umpires.sql` - Umpires table migration
- ✅ `migration_add_actual_start_time_matches.sql` - Matches table migration
- ✅ `IDLE_TRACKING_IMPLEMENTATION.md` - Full technical documentation
- ✅ `IMPLEMENTATION_SUMMARY.md` - Quick reference guide
- ✅ `WORKFLOW_DIAGRAM.md` - Visual workflow documentation
- ✅ `README_IDLE_TRACKING.md` - This file

### Files Modified
- ✅ `src/types/match.ts` - Added idle tracking fields to interfaces
- ✅ `src/types/bracket.ts` - Added actual_start_time to BracketMatch
- ✅ `src/services/matches.ts` - Added startMatch() function
- ✅ `src/services/umpires.ts` - Updated submitMatchScore() to reset idle status
- ✅ `src/services/tournaments.ts` - Updated Court and Umpire interfaces
- ✅ `src/pages/UmpireDashboard.tsx` - Added Start Match functionality
- ✅ `src/pages/TournamentManage.tsx` - Added idle status display

### Lines of Code
- **New code**: ~400 lines
- **Modified code**: ~200 lines
- **Documentation**: ~1500 lines

## 🧪 Testing

### Manual Testing Checklist

#### Database Migrations
- [ ] All three migrations applied successfully
- [ ] New columns exist in courts table
- [ ] New columns exist in umpires table
- [ ] New column exists in matches table
- [ ] Indexes created successfully
- [ ] Foreign key constraints working

#### Umpire Dashboard
- [ ] Can view assigned matches
- [ ] Can validate match code
- [ ] "Start Match" button appears after validation
- [ ] Clicking "Start Match" shows success toast
- [ ] Match timer starts after clicking
- [ ] Can submit match scores
- [ ] Match disappears after completion

#### Tournament Manage Page
- [ ] Courts section displays correctly
- [ ] Umpires section displays correctly
- [ ] Idle badges show as green
- [ ] Busy badges show as yellow
- [ ] "Free in Xm" countdown appears for busy resources
- [ ] Status updates after starting a match
- [ ] Status resets after completing a match
- [ ] Page updates every 30 seconds

#### Edge Cases
- [ ] Cannot start a match twice
- [ ] Cannot start a completed match
- [ ] Overtime matches show "Overtime"
- [ ] Missing duration handled gracefully
- [ ] Null values don't cause errors
- [ ] Multiple simultaneous matches work
- [ ] Browser refresh preserves state

### Automated Testing (Optional)

```typescript
// Example test cases
describe('Idle Status Calculation', () => {
  it('should return idle if is_idle is true', () => {
    const status = calculateIdleStatus(true, null, null);
    expect(status.isIdle).toBe(true);
  });

  it('should calculate time until idle correctly', () => {
    const startTime = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
    const status = calculateIdleStatus(false, startTime.toISOString(), 60);
    expect(status.minutesUntilIdle).toBe(30);
  });

  it('should show overtime if duration exceeded', () => {
    const startTime = new Date(Date.now() - 90 * 60 * 1000); // 90 min ago
    const status = calculateIdleStatus(false, startTime.toISOString(), 60);
    expect(status.timeUntilIdleFormatted).toBe('Overtime');
  });
});
```

## 🔧 Troubleshooting

### Issue: "Column does not exist" error
**Cause**: Database migrations not applied
**Solution**: Run all three migration SQL files in order

### Issue: Idle status not showing
**Cause**: Query not fetching new columns
**Solution**: Check that getTournamentCourts() and getTournamentUmpires() are fetching all columns with `SELECT *`

### Issue: Time calculation incorrect
**Cause**: Timezone mismatch or incorrect timestamp format
**Solution**: Ensure all timestamps are stored as UTC and parsed correctly

### Issue: Status not resetting after match completion
**Cause**: submitMatchScore() not updating idle fields
**Solution**: Verify the updated submitMatchScore() function is deployed

### Issue: UI not updating in real-time
**Cause**: 30-second interval not running
**Solution**: Check useEffect in TournamentManage.tsx is setting up the interval

### Issue: "Free in Xm" showing wrong time
**Cause**: Match duration not set correctly
**Solution**: Ensure duration_minutes is set when creating fixtures

## 📚 Additional Documentation

For more detailed information, see:

1. **IDLE_TRACKING_IMPLEMENTATION.md** - Complete technical documentation
   - Detailed API reference
   - Database schema details
   - Error handling strategies
   - Performance optimizations

2. **IMPLEMENTATION_SUMMARY.md** - Quick reference guide
   - Quick start instructions
   - Key features overview
   - User flow diagrams

3. **WORKFLOW_DIAGRAM.md** - Visual workflow documentation
   - System flow diagrams
   - State management details
   - Component hierarchy
   - Performance characteristics

## 🎓 Key Concepts

### Why Frontend Calculations?
The "time until idle" is calculated on the frontend rather than stored in the database because:
- ✅ Always accurate (uses current time)
- ✅ No constant database updates needed
- ✅ Reduces server load
- ✅ Scales better with many resources

### Why 30-Second Updates?
- ✅ Balance between accuracy and performance
- ✅ Good enough for tournament management
- ✅ Doesn't drain mobile battery
- ✅ Reduces unnecessary re-renders

### Why Automatic Reset?
- ✅ Prevents human error
- ✅ Ensures accurate status
- ✅ Improves user experience
- ✅ No manual intervention needed

## 🚦 Status Indicators

| Badge Color | Status | Meaning |
|------------|--------|---------|
| 🟢 Green | Idle | Resource available for assignment |
| 🟡 Yellow | Busy | Resource currently occupied |
| ⏱️ Countdown | Time | Minutes until resource becomes idle |
| 🔴 Overtime | Warning | Match exceeded planned duration |

## 📊 Performance Impact

| Metric | Impact | Notes |
|--------|--------|-------|
| Database writes | +6 per match | 3 on start, 3 on completion |
| Database reads | No change | Uses existing queries with new columns |
| Frontend CPU | Minimal | Simple calculations every 30s |
| Network traffic | No change | Uses existing polling |
| User experience | Improved | Real-time status visibility |

## 🔐 Security Considerations

- ✅ Match codes still required to start matches
- ✅ Foreign key constraints prevent invalid references
- ✅ Only assigned umpires can start their matches
- ✅ Completed matches cannot be restarted
- ✅ Database indexes don't expose sensitive data

## 🌟 Future Enhancements

Potential improvements for future development:

1. **Conflict Prevention**
   - Warn when trying to assign busy resources
   - Suggest available alternatives

2. **Notification System**
   - Email/SMS when resources become free
   - Push notifications for tournament organizers

3. **Analytics Dashboard**
   - Average match durations
   - Resource utilization rates
   - Peak usage times

4. **Smart Scheduling**
   - Auto-assign matches to idle resources
   - Load balancing across courts/umpires
   - Optimal tournament scheduling

5. **Mobile App Integration**
   - Native mobile app support
   - Offline mode with sync
   - Push notifications

## 💡 Best Practices

### For Tournament Organizers
1. ✅ Set realistic match durations
2. ✅ Monitor idle status regularly
3. ✅ Ensure umpires start matches on time
4. ✅ Have backup umpires available

### For Umpires
1. ✅ Start matches promptly when ready
2. ✅ Submit scores immediately after completion
3. ✅ Contact organizer if match goes overtime
4. ✅ Keep device connected to internet

### For Developers
1. ✅ Apply migrations before deploying frontend
2. ✅ Test with realistic data
3. ✅ Monitor database performance
4. ✅ Keep documentation updated

## 📞 Support

For questions, issues, or feature requests:
- Review the documentation files
- Check the troubleshooting section
- Verify migrations are applied correctly
- Test with a single match first

---

**Implementation Status**: ✅ Complete and Ready for Production

**Last Updated**: November 21, 2025

**Version**: 1.0.0

**License**: Same as main project

