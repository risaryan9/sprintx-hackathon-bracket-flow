import { Tournament, CreateTournamentInput } from "@/types/tournament";
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


