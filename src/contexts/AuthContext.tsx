import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  organizerName: string | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ORGANIZER_USERNAME = "Xthlete";
const ORGANIZER_PASSWORD = "pass123";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [organizerName, setOrganizerName] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("organizer_auth");
    if (stored === ORGANIZER_USERNAME) {
      setIsAuthenticated(true);
      setOrganizerName(ORGANIZER_USERNAME);
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    if (username === ORGANIZER_USERNAME && password === ORGANIZER_PASSWORD) {
      setIsAuthenticated(true);
      setOrganizerName(ORGANIZER_USERNAME);
      localStorage.setItem("organizer_auth", ORGANIZER_USERNAME);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setOrganizerName(null);
    localStorage.removeItem("organizer_auth");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, organizerName, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

