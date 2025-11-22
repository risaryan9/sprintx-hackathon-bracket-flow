import { Tournament, CreateTournamentInput } from "@/types/tournament";
import { Entry } from "@/types/match";
import { supabase } from "@/lib/supabaseClient";

export const getTournaments = async (): Promise<Tournament[]> => {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("is_active", true)
    .order("start_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as Tournament[] | null) ?? [];
};

export const getOrganizerTournaments = async (organizerName: string): Promise<Tournament[]> => {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("organizer_name", organizerName)
    .order("start_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as Tournament[] | null) ?? [];
};

export const createTournament = async (input: CreateTournamentInput): Promise<Tournament> => {
  const { data, error } = await supabase
    .from("tournaments")
    .insert([input])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Tournament;
};

export const getTournamentById = async (id: string): Promise<Tournament | null> => {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(error.message);
  }

  return data as Tournament;
};

export const getTournamentEntriesCount = async (tournamentId: string): Promise<number> => {
  const { count, error } = await supabase
    .from("entries")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
};

export const getTournamentEntries = async (tournamentId: string): Promise<Entry[]> => {
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as Entry[] | null) ?? [];
};

export interface Court {
  id: string;
  tournament_id: string | null;
  court_name: string;
  location: string | null;
  created_at: string;
  is_idle: boolean;
  last_assigned_start_time: string | null;
  last_assigned_match_id: string | null;
}

export const getTournamentCourts = async (tournamentId: string): Promise<Court[]> => {
  const { data, error } = await supabase
    .from("courts")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("court_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as Court[] | null) ?? [];
};

export interface Umpire {
  id: string;
  tournament_id: string | null;
  full_name: string;
  contact: string | null;
  license_no: string | null;
  email: string | null;
  gender: "male" | "female" | "other" | null;
  age: number | null;
  experience_years: number | null;
  certification_level: "national" | "state" | "international" | null;
  association: string | null;
  bio: string | null;
  sports_expertise: string | null; // JSON array or comma-separated string
  created_at: string;
  is_idle: boolean;
  last_assigned_start_time: string | null;
  last_assigned_match_id: string | null;
}

export const getTournamentUmpires = async (tournamentId: string): Promise<Umpire[]> => {
  // Fetch umpires directly by tournament_id (similar to how courts are fetched)
  const { data: umpires, error: umpiresError } = await supabase
    .from("umpires")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("full_name", { ascending: true });

  if (umpiresError) {
    throw new Error(`Failed to fetch umpires: ${umpiresError.message}`);
  }

  return (umpires as Umpire[] | null) ?? [];
};


