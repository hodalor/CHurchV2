import { createContext, useContext, useEffect, useState } from "react";
import { churchApi } from "../apis/churchApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let active = true;

    async function hydrateUser() {
      const session = churchApi.getStoredSession();
      if (!session?.accessToken) {
        if (active) {
          setAuthLoading(false);
        }
        return;
      }

      try {
        const user = await churchApi.getCurrentUser();
        if (active) {
          setAuthUser(user);
        }
      } catch (error) {
        churchApi.clearStoredSession();
        if (active) {
          setAuthError(error.message || "Your session has expired.");
        }
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }

    hydrateUser();

    return () => {
      active = false;
    };
  }, []);

  const login = async (username, pin) => {
    setAuthError("");
    const session = await churchApi.login(username, pin);
    setAuthUser(session.user);
    return session.user;
  };

  const logout = async () => {
    await churchApi.logout();
    setAuthUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        authUser,
        authLoading,
        authError,
        setAuthError,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
