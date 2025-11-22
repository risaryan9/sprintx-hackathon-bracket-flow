import { supabase } from "@/lib/supabaseClient";
import { Tournament } from "@/types/tournament";
import { getTournamentEntriesCount } from "./tournaments";

export interface IndividualRegistrationPayload {
  playerName: string;
  dob: string;
  gender: string;
  contactNumber: string;
  email: string;
  collegeOrClub?: string;
  age?: string;
}

export interface TeamRegistrationPayload {
  teamName: string;
  captainName: string;
  captainDob: string;
  captainGender: string;
  contactNumber: string;
  email: string;
  playerNames: string[];
  numberOfPlayers: number;
}

export interface RegistrationResult {
  entryId: string;
  totalEntries: number;
}

const sanitizeName = (value: string) => value.replace(/\s+/g, " ").trim();

const buildContactString = (parts: Array<string | null | undefined>) =>
  parts.filter((part) => part && part.trim().length > 0).join(" | ");

const ensureCapacity = async (tournament: Tournament) => {
  const currentEntries = await getTournamentEntriesCount(tournament.id);

  if (
    tournament.max_entries &&
    tournament.max_entries > 0 &&
    currentEntries >= tournament.max_entries
  ) {
    throw new Error("This tournament is already full.");
  }

  return currentEntries;
};

const refreshTotalEntries = async (tournamentId: string) => {
  return getTournamentEntriesCount(tournamentId);
};

export const registerIndividualEntry = async (
  tournament: Tournament,
  payload: IndividualRegistrationPayload
): Promise<RegistrationResult> => {
  await ensureCapacity(tournament);

  const playerInput = {
    full_name: sanitizeName(payload.playerName),
    contact: payload.contactNumber || null,
    club_id: null,
    dob: payload.dob ? payload.dob : null,
    gender: payload.gender || null,
  };

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert(playerInput)
    .select()
    .single();

  if (playerError || !player) {
    throw new Error(playerError?.message ?? "Failed to create player record.");
  }

  const { data: entry, error: entryError } = await supabase
    .from("entries")
    .insert({
      tournament_id: tournament.id,
      player_id: player.id,
      team_id: null,
      entry_type: "solo",
    })
    .select()
    .single();

  if (entryError || !entry) {
    await supabase.from("players").delete().eq("id", player.id).catch(() => null);
    throw new Error(entryError?.message ?? "Failed to create tournament entry.");
  }

  const totalEntries = await refreshTotalEntries(tournament.id);

  return {
    entryId: entry.id,
    totalEntries,
  };
};

export const registerTeamEntry = async (
  tournament: Tournament,
  payload: TeamRegistrationPayload
): Promise<RegistrationResult> => {
  await ensureCapacity(tournament);

  const maxPlayersAllowed = tournament.max_players_per_team || payload.numberOfPlayers;
  if (payload.numberOfPlayers > maxPlayersAllowed) {
    throw new Error(
      `Number of players exceeds the allowed limit (${maxPlayersAllowed}).`
    );
  }

  const trimmedNames = payload.playerNames
    .slice(0, payload.numberOfPlayers)
    .map((name) => sanitizeName(name))
    .filter((name) => name.length > 0);

  if (trimmedNames.length !== payload.numberOfPlayers) {
    throw new Error("Please provide names for all players.");
  }

  const contactString = payload.contactNumber || null;

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      team_name: sanitizeName(payload.teamName),
      club_id: null,
    })
    .select()
    .single();

  if (teamError || !team) {
    throw new Error(teamError?.message ?? "Failed to create team.");
  }

  const playerRows = trimmedNames.map((name, index) => ({
    full_name: name,
    contact: index === 0 ? contactString : null,
    club_id: null,
    dob: index === 0 && payload.captainDob ? payload.captainDob : null,
    gender: index === 0 ? payload.captainGender || null : null,
  }));

  const { data: players, error: playersError } = await supabase
    .from("players")
    .insert(playerRows)
    .select();

  if (playersError || !players || players.length === 0) {
    await supabase.from("teams").delete().eq("id", team.id).catch(() => null);
    throw new Error(playersError?.message ?? "Failed to register players.");
  }

  const insertedPlayers = players as Array<{ id: string }>;
  const playerIds = insertedPlayers.map((player) => player.id);

  const { error: teamPlayersError } = await supabase
    .from("team_players")
    .insert(
      playerIds.map((playerId) => ({
        team_id: team.id,
        player_id: playerId,
      }))
    );

  if (teamPlayersError) {
    await supabase.from("team_players").delete().eq("team_id", team.id).catch(() => null);
    await supabase.from("players").delete().in("id", playerIds).catch(() => null);
    await supabase.from("teams").delete().eq("id", team.id).catch(() => null);
    throw new Error(teamPlayersError.message);
  }

  const { data: entry, error: entryError } = await supabase
    .from("entries")
    .insert({
      tournament_id: tournament.id,
      team_id: team.id,
      entry_type: "team",
    })
    .select()
    .single();

  if (entryError || !entry) {
    await supabase.from("team_players").delete().eq("team_id", team.id).catch(() => null);
    await supabase.from("players").delete().in("id", playerIds).catch(() => null);
    await supabase.from("teams").delete().eq("id", team.id).catch(() => null);
    throw new Error(entryError?.message ?? "Failed to create tournament entry.");
  }

  const totalEntries = await refreshTotalEntries(tournament.id);

  return {
    entryId: entry.id,
    totalEntries,
  };
};


