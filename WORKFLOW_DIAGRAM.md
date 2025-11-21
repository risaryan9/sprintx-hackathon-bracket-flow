# Real-Time Match Tracking - Workflow Diagram

## System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    UMPIRE DASHBOARD                              │
│  (Umpire views assigned matches and manages them)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Umpire enters match code                                │
│  • Validates code against database                               │
│  • Unlocks match controls if valid                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Umpire clicks "Start Match"                             │
│                                                                   │
│  startMatch() is called:                                         │
│  ├─ matches.actual_start_time = now()                           │
│  ├─ umpires.is_idle = false                                     │
│  ├─ umpires.last_assigned_start_time = now()                    │
│  ├─ umpires.last_assigned_match_id = match.id                   │
│  ├─ courts.is_idle = false                                      │
│  ├─ courts.last_assigned_start_time = now()                     │
│  └─ courts.last_assigned_match_id = match.id                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  REAL-TIME STATUS (Tournament Manage Page)                       │
│                                                                   │
│  Every 30 seconds, frontend calculates:                          │
│  time_until_idle = (actual_start_time + duration) - now()       │
│                                                                   │
│  Displays:                                                        │
│  • Court: "Busy" badge + "Free in 45m"                          │
│  • Umpire: "Busy" badge + "Free in 45m"                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Match is in progress                                    │
│  • Timer counts down on Umpire Dashboard                         │
│  • Status remains "Busy" on Tournament Manage                    │
│  • Time until idle decreases automatically                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Umpire submits match score                              │
│                                                                   │
│  submitMatchScore() is called:                                   │
│  ├─ matches.is_completed = true                                 │
│  ├─ matches.winner_entry_id = winner                            │
│  ├─ matches.code_valid = false                                  │
│  ├─ umpires.is_idle = true                                      │
│  ├─ umpires.last_assigned_start_time = null                     │
│  ├─ umpires.last_assigned_match_id = null                       │
│  ├─ courts.is_idle = true                                       │
│  ├─ courts.last_assigned_start_time = null                      │
│  └─ courts.last_assigned_match_id = null                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  FINAL STATE (Tournament Manage Page)                            │
│                                                                   │
│  Status updates automatically:                                    │
│  • Court: "Idle" badge (green) + no countdown                   │
│  • Umpire: "Idle" badge (green) + no countdown                  │
│  • Resources ready for next match                                │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### When Match Starts

```
User Action                Database Updates              Frontend Updates
───────────                ─────────────────              ────────────────
                          
Click "Start              matches table:                 ✓ Toast: "Match Started"
Match" button        ┌──▶ actual_start_time = now()    ✓ Query invalidation
                     │                                   ✓ Timer starts
                     │    umpires table:                ✓ UI refreshes
                     ├──▶ is_idle = false               
                     │    last_assigned_start_time      Tournament Manage:
                     │    = now()                       ✓ Umpire shows "Busy"
                     │    last_assigned_match_id        ✓ Court shows "Busy"
                     │    = match_id                    ✓ Countdown appears
                     │                                   
                     │    courts table:                 
                     └──▶ is_idle = false               
                          last_assigned_start_time      
                          = now()                       
                          last_assigned_match_id        
                          = match_id                    
```

### When Match Completes

```
User Action                Database Updates              Frontend Updates
───────────                ─────────────────              ────────────────
                          
Submit match              matches table:                 ✓ Toast: "Match completed"
scores               ┌──▶ is_completed = true          ✓ Query invalidation
                     │    winner_entry_id = winner     ✓ Match removed from list
                     │    code_valid = false           
                     │                                   Tournament Manage:
                     │    umpires table:                ✓ Umpire shows "Idle"
                     ├──▶ is_idle = true               ✓ Court shows "Idle"
                     │    last_assigned_start_time     ✓ Countdown removed
                     │    = null                        
                     │    last_assigned_match_id        
                     │    = null                        
                     │                                   
                     │    courts table:                 
                     └──▶ is_idle = true               
                          last_assigned_start_time      
                          = null                        
                          last_assigned_match_id        
                          = null                        
```

## Idle Calculation Logic

```javascript
function calculateIdleStatus(isIdle, lastStartTime, durationMinutes) {
  // If marked as idle in DB, return idle immediately
  if (isIdle) {
    return { isIdle: true, timeUntilIdle: null };
  }

  // Calculate when match ends
  const endTime = lastStartTime + (durationMinutes * 60 * 1000);
  const now = Date.now();
  const timeRemaining = endTime - now;

  // If time has passed, should be idle
  if (timeRemaining <= 0) {
    return { isIdle: true, timeUntilIdle: 0, display: "Overtime" };
  }

  // Calculate minutes remaining
  const minutes = Math.ceil(timeRemaining / 60000);
  
  return { 
    isIdle: false, 
    minutesUntilIdle: minutes,
    display: formatTime(minutes)  // "5m", "1h 30m", etc.
  };
}
```

## Component Hierarchy

```
TournamentManage.tsx
│
├─ Courts Section
│  └─ For each court:
│     ├─ Court name & location
│     ├─ Idle/Busy badge ◄── calculateIdleStatus()
│     └─ "Free in Xm" countdown (if busy)
│
└─ Umpires Section
   └─ For each umpire:
      ├─ Umpire name & license
      ├─ Idle/Busy badge ◄── calculateIdleStatus()
      └─ "Free in Xm" countdown (if busy)

UmpireDashboard.tsx
│
└─ For each assigned match:
   ├─ Match details
   ├─ Match code validation
   ├─ "Start Match" button ◄── calls startMatch()
   ├─ Match timer (if started)
   └─ Score submission form
```

## State Management

### Umpire Dashboard
```javascript
const [startedMatches, setStartedMatches] = useState<Set<string>>(new Set());

// When data loads, check actual_start_time
useEffect(() => {
  if (data?.matches) {
    const started = new Set();
    data.matches.forEach(match => {
      if (match.actual_start_time) {
        started.add(match.id);
      }
    });
    setStartedMatches(started);
  }
}, [data]);

// When starting a match
const handleStartMatch = async (matchId) => {
  await startMatch(matchId);
  setStartedMatches(prev => new Set(prev).add(matchId));
  queryClient.invalidateQueries(['umpire-matches']);
};
```

### Tournament Manage
```javascript
const [currentTime, setCurrentTime] = useState(new Date());

// Update every 30 seconds for real-time countdown
useEffect(() => {
  const interval = setInterval(() => {
    setCurrentTime(new Date());
  }, 30000);
  return () => clearInterval(interval);
}, []);

// Calculate idle status for each resource
courts.map(court => {
  const idleStatus = calculateIdleStatusWithMatch(
    court.is_idle,
    court.last_assigned_start_time,
    court.last_assigned_match_id,
    matches
  );
  
  return (
    <div>
      <Badge>{idleStatus.isIdle ? 'Idle' : 'Busy'}</Badge>
      {!idleStatus.isIdle && (
        <span>Free in {idleStatus.timeUntilIdleFormatted}</span>
      )}
    </div>
  );
});
```

## Key Design Decisions

### ✅ Why Frontend Calculations?
- **Performance**: No constant DB updates
- **Accuracy**: Always current time
- **Scalability**: Reduces server load
- **Simplicity**: Just store timestamps

### ✅ Why 30-Second Updates?
- **Balance**: Frequent enough to be useful
- **Efficiency**: Not excessive for server
- **UX**: Smooth countdown experience
- **Battery**: Mobile-friendly interval

### ✅ Why Not WebSockets?
- **Simplicity**: Polling is simpler to implement
- **Reliability**: Works with existing infrastructure
- **Scale**: Good enough for most tournaments
- **Future**: Can add WebSockets later if needed

### ✅ Why Automatic Reset?
- **Convenience**: No manual intervention
- **Accuracy**: Immediate status update
- **UX**: Seamless workflow
- **Safety**: Prevents forgotten resets

## Edge Cases Handled

| Scenario | Handling |
|----------|----------|
| Match already started | Error: "Match has already been started" |
| Match already completed | Error: "Match has already been completed" |
| Missing duration | Assume idle, show no countdown |
| Null start time | Assume idle, show no countdown |
| Overtime match | Display "Overtime", still show as busy |
| Concurrent start attempts | Database constraints prevent conflicts |
| Lost connection | Local state preserved, re-syncs on reconnect |
| Multiple umpires | Each tracked independently |
| Court reassignment | Updates when new match starts |

## Performance Characteristics

| Operation | Time Complexity | Database Queries |
|-----------|----------------|------------------|
| Start match | O(1) | 3 updates (match, umpire, court) |
| Complete match | O(1) | 3 updates (match, umpire, court) |
| Calculate idle | O(1) | 0 (frontend only) |
| Display status | O(n) | 0 (uses cached data) |
| Refresh page | O(n) | 3 queries (courts, umpires, matches) |

**Notes:**
- n = number of courts/umpires (typically < 50)
- All DB operations use indexes
- Frontend calculations are instant
- No polling on write operations

---

This workflow ensures smooth, real-time tracking of tournament resources with minimal overhead and maximum user experience.

