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
  full_name: string;
  contact: string | null;
  license_no: string | null;
  created_at: string;
  is_idle: boolean;
  last_assigned_start_time: string | null;
  last_assigned_match_id: string | null;
}

export const getTournamentUmpires = async (tournamentId: string): Promise<Umpire[]> => {
  // First, get all matches for this tournament to find assigned umpires
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("umpire_id")
    .eq("tournament_id", tournamentId)
    .not("umpire_id", "is", null);

  if (matchesError) {
    throw new Error(`Failed to fetch matches: ${matchesError.message}`);
  }

  if (!matches || matches.length === 0) {
    return [];
  }

  // Extract unique umpire IDs
  const umpireIds = Array.from(new Set(matches.map((m: any) => m.umpire_id).filter(Boolean)));

  if (umpireIds.length === 0) {
    return [];
  }

  // Fetch umpire details
  const { data: umpires, error: umpiresError } = await supabase
    .from("umpires")
    .select("*")
    .in("id", umpireIds)
    .order("full_name", { ascending: true });

  if (umpiresError) {
    throw new Error(`Failed to fetch umpires: ${umpiresError.message}`);
  }

  return (umpires as Umpire[] | null) ?? [];
};


