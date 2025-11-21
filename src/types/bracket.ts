export interface BracketMatch {
  id: string;
  tournament_id: string | null;
  round: string | null;
  match_order: number | null;
  entry1_id: string | null;
  entry2_id: string | null;
  entry1_name: string | null;
  entry2_name: string | null;
  entry1_club_name: string | null;
  entry2_club_name: string | null;
  court_id: string | null;
  court_name: string | null;
  umpire_id: string | null;
  umpire_name: string | null;
  scheduled_time: string | null;
  duration_minutes: number | null;
  status: string | null;
  winner_entry_id: string | null;
  is_completed: boolean | null;
  match_code: string | null;
  code_valid: boolean | null;
  actual_start_time?: string | null;
  awaiting_result?: boolean | null;
}

export interface Round {
  name: string;
  matches: BracketMatch[];
  order: number;
}

export type TournamentFormat = "knockouts" | "round_robin" | "double_elimination";



