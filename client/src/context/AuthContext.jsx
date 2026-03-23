import { createContext, useContext, useState, useEffect } from "react";
import { refreshToken, logout } from "../services/authService";

// Create context
const AuthContext = createContext();

// Custom hook for easy access
export const useAuth = () => {
  return useContext(AuthContext);
};

function parseJwt(token) {
  try {
    const base64Payload = token.split(".")[1];
    const payload = atob(base64Payload);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // will hold user info (id, role, etc.)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const res = await refreshToken();

      if (res.accessToken) {
        const decoded = parseJwt(res.accessToken);

        if (decoded) {
          setUser(decoded);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const handleLogout = async () => {
    await logout();

    // Clear state
    setUser(null);
    setIsAuthenticated(false);
    setLoading(false);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    logout: handleLogout,

    // controlled setters (temporary bridge)
    setAuthData: ({ user, isAuthenticated }) => {
      setUser(user);
      setIsAuthenticated(isAuthenticated);
    },

    setLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
