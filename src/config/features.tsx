import { Activity, Calendar, Command, Trophy, Users } from "lucide-react";

export const features = [
  {
    title: "Unified Control Booth",
    description: "Monitor brackets, venues, assignments, and contingencies from a single command console.",
    icon: <Command className="w-6 h-6" />,
    image: "/assets/images/unified_controll_booth.png"
  },
  {
    title: "AI supported Automated Scheduling",
    description: "Auto-build brackets and match grids that respect rest rules, surfaces, and travel blocks.",
    icon: <Calendar className="w-6 h-6" />,
    image: "/assets/images/Automated Scheduling.png"
  },
  {
    title: "Live Scoring & Standings",
    description: "Publish verified scores, rankings, and tie-break logic in real time across every division.",
    icon: <Trophy className="w-6 h-6" />,
    image: "/assets/images/live_scoring_and_standigns.png"
  },
  {
    title: "Event Health Insights",
    description: "Surface workload, fatigue, and weather alerts so directors can adapt before issues arise.",
    icon: <Activity className="w-6 h-6" />,
    image: "/assets/images/event_health.png"
  },
  {
    title: "Player Tournament Discovery & Registration",
    description: "Players can easily search for tournaments, view details, and complete registration with a quick, intuitive process.",
    icon: <Users className="w-6 h-6" />,
    image: "/assets/images/player_tournament_discover.png"
  }
];