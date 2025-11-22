import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  organizerName: string | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ORGANIZER_USERNAME = "Xthlete";
const ORGANIZER_PASSWORD = import.meta.env.VITE_ORGANIZER_PASSKEY || "";

if (!ORGANIZER_PASSWORD) {
  console.warn("VITE_ORGANIZER_PASSKEY is not set in environment variables");
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Initialize from localStorage synchronously to avoid race conditions
  const getStoredAuth = () => {
    if (typeof window === "undefined") return { isAuth: false, name: null };
    const stored = localStorage.getItem("organizer_auth");
    if (stored === ORGANIZER_USERNAME) {
      return { isAuth: true, name: ORGANIZER_USERNAME };
    }
    return { isAuth: false, name: null };
  };

  const initialAuth = getStoredAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth.isAuth);
  const [organizerName, setOrganizerName] = useState<string | null>(initialAuth.name);

  // Sync with localStorage on mount and when it changes
  useEffect(() => {
    const handleStorageChange = () => {
      const auth = getStoredAuth();
      setIsAuthenticated(auth.isAuth);
      setOrganizerName(auth.name);
    };

    // Check on mount
    handleStorageChange();

    // Listen for storage changes (e.g., from other tabs)
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
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

