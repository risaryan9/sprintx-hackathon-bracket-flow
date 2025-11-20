import { tournaments } from "@/data/tournaments";
import { Tournament } from "@/types/tournament";

export const getTournaments = async (): Promise<Tournament[]> => {
  await new Promise((resolve) => setTimeout(resolve, 350));
  return tournaments.filter((tournament) => tournament.is_active);
};

