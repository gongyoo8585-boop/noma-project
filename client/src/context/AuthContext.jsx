"use strict";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const AuthContext = createContext(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

export function AuthProvider({ children }) {
  const mountedRef = useRef(false);
  const loadedRef = useRef(false);
  const loadingTimerRef = useRef(null);

  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);

  /**
   * =====================================================
   * TOKEN VALIDATION
   * =====================================================
   */
  const isValidToken = (value) => {
    if (
      !value ||
      value === "undefined" ||
      value === "null"
    ) {
      return false;
    }

    const tokenValue = String(value).trim();

    if (!tokenValue) {
      return false;
    }

    return true;
  };

  const normalizeToken = (value) => {
    return String(value || "")
      .replace(/^Bearer\s+/i, "")
      .trim();
  };

  const normalizeUser = (value = {}) => {
    const nextUser = {
      ...value,
    };

    if (
      nextUser.role === "admin" ||
      nextUser.userRole === "admin" ||
      nextUser.type === "admin" ||
      nextUser.isAdmin === true
    ) {
      return {
        ...nextUser,
        role: nextUser.role || "admin",
        userRole: nextUser.userRole || "admin",
        type: nextUser.type || "admin",
        isAdmin: true,
      };
    }

    return nextUser;
  };

  const readSavedToken = () => {
    try {
      return (
        localStorage.getItem("adminToken") ||
        sessionStorage.getItem("adminToken") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("accessToken") ||
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken") ||
        localStorage.getItem("jwt") ||
        sessionStorage.getItem("jwt") ||
        localStorage.getItem("local-admin-token") ||
        sessionStorage.getItem("local-admin-token") ||
        ""
      );
    } catch (e) {
      console.error("AUTH TOKEN READ ERROR:", e);
      return "";
    }
  };

  const readSavedUser = () => {
    let savedUser = "";

    try {
      savedUser =
        localStorage.getItem("user") ||
        sessionStorage.getItem("user") ||
        "";
    } catch (e) {
      console.error("AUTH USER READ ERROR:", e);
      return null;
    }

    if (!savedUser) {
      return null;
    }

    try {
      return JSON.parse(savedUser);
    } catch (e) {
      console.error("AUTH USER PARSE ERROR:", e);
      return null;
    }
  };

  const saveAuthData = (nextToken, nextUser) => {
    try {
      if (isValidToken(nextToken)) {
        localStorage.setItem("adminToken", nextToken);
        localStorage.setItem("token", nextToken);
        localStorage.setItem("accessToken", nextToken);
        localStorage.setItem("authToken", nextToken);
        localStorage.setItem("jwt", nextToken);
        localStorage.setItem("local-admin-token", nextToken);

        sessionStorage.setItem("adminToken", nextToken);
        sessionStorage.setItem("token", nextToken);
        sessionStorage.setItem("accessToken", nextToken);
        sessionStorage.setItem("authToken", nextToken);
        sessionStorage.setItem("jwt", nextToken);
        sessionStorage.setItem("local-admin-token", nextToken);
      }

      if (nextUser) {
        localStorage.setItem("user", JSON.stringify(nextUser));
        sessionStorage.setItem("user", JSON.stringify(nextUser));
        localStorage.setItem("isAdmin", nextUser?.isAdmin === false ? "false" : "true");
        sessionStorage.setItem("isAdmin", nextUser?.isAdmin === false ? "false" : "true");
      }
    } catch (e) {
      console.error("AUTH SAVE ERROR:", e);
    }
  };

  const clearAuthData = () => {
    try {
      [
        "token",
        "accessToken",
        "authToken",
        "jwt",
        "adminToken",
        "user",
        "local-admin-token",
        "local-admin",
        "isAdmin",
      ].forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    } catch (e) {
      console.error("AUTH CLEAR ERROR:", e);
    }
  };

  const syncAuthFromStorage = () => {
    try {
      const savedToken = normalizeToken(readSavedToken());
      const savedUser = readSavedUser();

      if (isValidToken(savedToken)) {
        const normalizedUser = normalizeUser(
          savedUser || {
            role: "admin",
            userRole: "admin",
            type: "admin",
            isAdmin: true,
          }
        );

        saveAuthData(savedToken, normalizedUser);

        if (mountedRef.current) {
          setToken(savedToken);
          setUser(normalizedUser);
          setLoading(false);
        }

        return true;
      }

      if (mountedRef.current) {
        setToken("");
        setUser(null);
        setLoading(false);
      }

      return false;
    } catch (e) {
      console.error("AUTH STORAGE SYNC ERROR:", e);

      if (mountedRef.current) {
        setToken("");
        setUser(null);
        setLoading(false);
      }

      return false;
    }
  };

  /**
   * =====================================================
   * TOKEN LOAD
   * =====================================================
   */
  useEffect(() => {
    mountedRef.current = true;

    loadingTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        syncAuthFromStorage();
        setLoading(false);
      }
    }, 300);

    if (loadedRef.current) {
      syncAuthFromStorage();
      setLoading(false);

      return () => {
        mountedRef.current = false;

        if (loadingTimerRef.current) {
          clearTimeout(loadingTimerRef.current);
        }
      };
    }

    loadedRef.current = true;

    try {
      const synced = syncAuthFromStorage();

      if (!synced) {
        clearAuthData();

        if (mountedRef.current) {
          setToken("");
          setUser(null);
        }
      }
    } catch (e) {
      console.error("AUTH LOAD ERROR:", e);

      if (mountedRef.current) {
        setToken("");
        setUser(null);
      }
    } finally {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }

      if (mountedRef.current) {
        setLoading(false);
      }
    }

    const handleAuthSync = () => {
      syncAuthFromStorage();
    };

    window.addEventListener("storage", handleAuthSync);
    window.addEventListener("popstate", handleAuthSync);
    window.addEventListener("focus", handleAuthSync);
    window.addEventListener("auth-updated", handleAuthSync);

    return () => {
      mountedRef.current = false;

      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }

      window.removeEventListener("storage", handleAuthSync);
      window.removeEventListener("popstate", handleAuthSync);
      window.removeEventListener("focus", handleAuthSync);
      window.removeEventListener("auth-updated", handleAuthSync);
    };
  }, []);

  /**
   * =====================================================
   * LOGIN
   * =====================================================
   */
  const login = (loginToken, loginUser = {}) => {
    const nextToken = normalizeToken(loginToken);

    if (!isValidToken(nextToken)) {
      console.error("INVALID LOGIN TOKEN");

      return false;
    }

    const normalizedUser = normalizeUser({
      ...loginUser,
      role:
        loginUser?.role ||
        loginUser?.userRole ||
        loginUser?.type ||
        "admin",
      userRole:
        loginUser?.userRole ||
        loginUser?.role ||
        loginUser?.type ||
        "admin",
      type:
        loginUser?.type ||
        loginUser?.role ||
        loginUser?.userRole ||
        "admin",
      isAdmin:
        loginUser?.isAdmin === false
          ? false
          : true,
    });

    clearAuthData();
    saveAuthData(nextToken, normalizedUser);

    setToken(nextToken);
    setUser(normalizedUser);
    setLoading(false);

    try {
      window.dispatchEvent(new Event("auth-updated"));
    } catch (e) {
      console.warn("AUTH EVENT ERROR:", e);
    }

    return true;
  };

  /**
   * =====================================================
   * LOGOUT
   * =====================================================
   */
  const logout = () => {
    clearAuthData();

    setToken("");
    setUser(null);
    setLoading(false);

    if (typeof window !== "undefined") {
      window.location.replace("/admin");
    }
  };

  /**
   * =====================================================
   * AUTH CHECK
   * =====================================================
   */
  const currentToken =
    token ||
    normalizeToken(readSavedToken());

  const currentUser =
    user ||
    normalizeUser(readSavedUser() || {});

  const isAuthenticated =
    !loading &&
    isValidToken(currentToken);

  const value = useMemo(
    () => ({
      user: currentUser,
      token: currentToken,
      loading,
      login,
      logout,
      isAuthenticated,
      setUser,
      setToken,
    }),
    [
      currentUser,
      currentToken,
      loading,
      isAuthenticated,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;