export interface Match {
  id: string;
  tournament_id: string | null;
  round: string | null;
  match_order: number | null;
  entry1_id: string | null;
  entry2_id: string | null;
  court_id: string | null;
  umpire_id: string | null;
  scheduled_time: string | null;
  duration_minutes: number | null;
  rest_enforced: boolean | null;
  match_code: string | null;
  code_valid: boolean | null;
  winner_entry_id: string | null;
  is_completed: boolean | null;
  actual_start_time: string | null;
  awaiting_result: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Entry {
  id: string;
  tournament_id: string;
  player_id: string | null;
  team_id: string | null;
  status: string;
  created_at: string;
}

export interface Player {
  id: string;
  name: string;
  club_id: string | null;
  contact: string | null;
  seed: number | null;
}

export interface Court {
  id: string;
  tournament_id: string;
  name: string;
  venue: string | null;
  is_idle: boolean;
  last_assigned_start_time: string | null;
  last_assigned_match_id: string | null;
}

export interface Umpire {
  id: string;
  name: string;
  club_id: string | null;
  contact: string | null;
  is_idle: boolean;
  last_assigned_start_time: string | null;
  last_assigned_match_id: string | null;
}

export interface GenerateFixturesOptions {
  seeded?: boolean;
  force?: boolean;
  start_time_override?: string;
  max_parallel_matches_override?: number;
  respect_club_neutrality?: boolean;
  preview_sql?: boolean;
  dry_run?: boolean;
}

export interface GenerateFixturesResult {
  status: "ok" | "error";
  created: number;
  matches: Match[];
  warnings: string[];
  error?: string;
}

