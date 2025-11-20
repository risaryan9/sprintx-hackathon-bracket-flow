export interface Tournament {
  id: string;
  name: string;
  category: string;
  sport: string;
  format: "knockouts" | "round_robin" | "double_elimination";
  is_team_based: boolean;
  start_date: string;
  end_date: string;
  venue: string;
  city: string;
  organizer_name: string;
  organizer_contact: string;
  organizer_email: string;
  image_url: string;
  prize_pool: number;
  registration_fee: number;
  max_entries: number;
  max_players_per_team: number;
  match_duration_minutes: number;
  rest_time_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTournamentInput {
  name: string;
  category: string;
  sport: string;
  format: "knockouts" | "round_robin" | "double_elimination";
  is_team_based: boolean;
  start_date: string;
  end_date: string;
  venue: string;
  city: string;
  organizer_name: string;
  organizer_contact: string;
  organizer_email: string;
  image_url: string;
  prize_pool: number;
  registration_fee: number;
  max_entries: number;
  max_players_per_team: number;
  match_duration_minutes: number;
  rest_time_minutes: number;
}

