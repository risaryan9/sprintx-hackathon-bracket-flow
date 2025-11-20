import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Tournaments from "./pages/Tournaments";
import HostLogin from "./pages/HostLogin";
import HostDashboard from "./pages/HostDashboard";
import TournamentManage from "./pages/TournamentManage";
import AddTournament from "./pages/AddTournament";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  
  // Since auth state is initialized synchronously from localStorage,
  // we can check immediately without a loading state
  if (!isAuthenticated) {
    return <Navigate to="/host/login" replace />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/host/login" element={<HostLogin />} />
              <Route
                path="/host"
                element={
                  <ProtectedRoute>
                    <HostDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/host/tournaments/new"
                element={
                  <ProtectedRoute>
                    <AddTournament />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/host/tournaments/:tournamentId"
                element={
                  <ProtectedRoute>
                    <TournamentManage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </div>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;