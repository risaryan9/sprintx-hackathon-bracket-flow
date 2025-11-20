import { Activity, Calendar, Command, Trophy, Users } from "lucide-react";

export const features = [
  {
    title: "Unified Control Booth",
    description: "Monitor brackets, venues, assignments, and contingencies from a single command console.",
    icon: <Command className="w-6 h-6" />,
    image: "/assets/images/football-academy.png"
  },
  {
    title: "Automated Scheduling",
    description: "Auto-build brackets and match grids that respect rest rules, surfaces, and travel blocks.",
    icon: <Calendar className="w-6 h-6" />,
    image: "/assets/images/control-room.png"
  },
  {
    title: "Crew & Team Management",
    description: "Centralize rosters, officials, volunteers, and communications with instant status tracking.",
    icon: <Users className="w-6 h-6" />,
    image: "/assets/images/crew-management.png"
  },
  {
    title: "Live Scoring & Standings",
    description: "Publish verified scores, rankings, and tie-break logic in real time across every division.",
    icon: <Trophy className="w-6 h-6" />,
    image: "/assets/images/volleyball-duo.png"
  },
  {
    title: "Event Health Insights",
    description: "Surface workload, fatigue, and weather alerts so directors can adapt before issues arise.",
    icon: <Activity className="w-6 h-6" />,
    image: "/assets/images/tennis-stadium.png"
  }
];