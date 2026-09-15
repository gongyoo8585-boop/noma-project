"use strict";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import authApi from "../services/auth.api";

const AuthContext = createContext(null);
const USER_LOGOUT_MARKER_KEY = "nora_user_logged_out";

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

  const decodeTokenPayload = (value) => {
    try {
      const safeToken =
        normalizeToken(value);

      const payload =
        safeToken.split(".")[1];

      if (!payload) {
        return null;
      }

      const normalized =
        payload
          .replace(/-/g, "+")
          .replace(/_/g, "/");

      const padded =
        normalized +
        "=".repeat(
          (4 - (normalized.length % 4)) % 4
        );

      return JSON.parse(
        decodeURIComponent(
          atob(padded)
            .split("")
            .map(
              (char) =>
                `%${char
                  .charCodeAt(0)
                  .toString(16)
                  .padStart(2, "0")}`
            )
            .join("")
        )
      );
    } catch {
      return null;
    }
  };

  const isAdminToken = (value) => {
    const payload =
      decodeTokenPayload(value);

    const role =
      String(payload?.role || "")
        .trim()
        .toLowerCase();

    return (
      payload?.isAdmin === true ||
      role === "admin" ||
      role === "superadmin" ||
      role === "super_admin"
    );
  };

  const isExpiredToken = (value) => {
    const payload =
      decodeTokenPayload(value);

    if (!payload?.exp) {
      return false;
    }

    return Date.now() >= Number(payload.exp) * 1000;
  };

  const isAdminUser = (value = {}) => {
    if (
      !value ||
      typeof value !== "object"
    ) {
      return false;
    }

    const role =
      String(
        value?.role ||
        value?.userRole ||
        value?.type ||
        ""
      )
        .trim()
        .toLowerCase();

    return (
      value?.isAdmin === true ||
      role === "admin" ||
      role === "superadmin" ||
      role === "super_admin"
    );
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
        userRole: nextUser.userRole || nextUser.role || "admin",
        type: nextUser.type || nextUser.role || "admin",
        isAdmin: true,
      };
    }

    return {
      ...nextUser,
      isAdmin: false,
    };
  };

  const readSavedToken = () => {
    try {
      const explicitlyLoggedOut =
        localStorage.getItem(USER_LOGOUT_MARKER_KEY) === "true" ||
        sessionStorage.getItem(USER_LOGOUT_MARKER_KEY) === "true";

      if (explicitlyLoggedOut) {
        return "";
      }

      const candidates = [
        localStorage.getItem("token"),
        sessionStorage.getItem("token"),
        localStorage.getItem("accessToken"),
        sessionStorage.getItem("accessToken"),
        localStorage.getItem("authToken"),
        sessionStorage.getItem("authToken"),
        localStorage.getItem("jwt"),
        sessionStorage.getItem("jwt"),
      ]
        .filter(
          (value) =>
            isValidToken(value)
        )
        .map(
          (value) =>
            normalizeToken(value)
        );

      const normalToken =
        candidates.find(
          (value) =>
            !isAdminToken(value)
        ) || "";

      return normalToken;
    } catch (e) {
      console.error("AUTH TOKEN READ ERROR:", e);
      return "";
    }
  };

  const readSavedUser = () => {
    let savedUser = "";

    try {
      const explicitlyLoggedOut =
        localStorage.getItem(USER_LOGOUT_MARKER_KEY) === "true" ||
        sessionStorage.getItem(USER_LOGOUT_MARKER_KEY) === "true";

      if (explicitlyLoggedOut) {
        return null;
      }

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
      const parsedUser =
        JSON.parse(savedUser);

      if (
        !parsedUser ||
        isAdminUser(parsedUser)
      ) {
        return null;
      }

      return parsedUser;
    } catch (e) {
      console.error("AUTH USER PARSE ERROR:", e);
      return null;
    }
  };

  const saveAuthData = (nextToken, nextUser) => {
    try {
      const safeToken =
        normalizeToken(nextToken);

      const normalizedUser =
        nextUser
          ? normalizeUser(nextUser)
          : null;

      if (
        !isValidToken(safeToken) ||
        isAdminToken(safeToken) ||
        !normalizedUser ||
        isAdminUser(normalizedUser)
      ) {
        return false;
      }

      localStorage.setItem(
        "token",
        safeToken
      );

      sessionStorage.setItem(
        "token",
        safeToken
      );

      localStorage.removeItem(
        "accessToken"
      );

      sessionStorage.removeItem(
        "accessToken"
      );

      localStorage.removeItem(
        "authToken"
      );

      sessionStorage.removeItem(
        "authToken"
      );

      localStorage.removeItem(
        "jwt"
      );

      sessionStorage.removeItem(
        "jwt"
      );

      localStorage.setItem(
        "user",
        JSON.stringify(normalizedUser)
      );

      sessionStorage.setItem(
        "user",
        JSON.stringify(normalizedUser)
      );

      return true;
    } catch (e) {
      console.error("AUTH SAVE ERROR:", e);
      return false;
    }
  };

  const clearAuthData = () => {
    try {
      [
        "token",
        "accessToken",
        "authToken",
        "jwt",
        "user",
      ].forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    } catch (e) {
      console.error("AUTH CLEAR ERROR:", e);
    }
  };

  const syncAuthFromStorage = async () => {
    try {
      const savedToken =
        normalizeToken(readSavedToken());

      const savedUser =
        readSavedUser();

      if (
        !isValidToken(savedToken) ||
        isAdminToken(savedToken) ||
        isExpiredToken(savedToken) ||
        !savedUser ||
        isAdminUser(savedUser)
      ) {
        clearAuthData();

        if (mountedRef.current) {
          setToken("");
          setUser(null);
          setLoading(false);
        }

        return false;
      }

      const normalizedUser =
        normalizeUser(savedUser);

      const saved =
        saveAuthData(
          savedToken,
          normalizedUser
        );

      if (!saved) {
        clearAuthData();

        if (mountedRef.current) {
          setToken("");
          setUser(null);
          setLoading(false);
        }

        return false;
      }

      if (mountedRef.current) {
        setToken(savedToken);
        setUser(normalizedUser);
        setLoading(false);
      }

      return true;
    } catch (e) {
      console.error(
        "AUTH STORAGE SYNC ERROR:",
        e
      );

      if (mountedRef.current) {
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

    loadingTimerRef.current =
      setTimeout(() => {
        if (mountedRef.current) {
          setLoading(false);
        }
      }, 3000);

    loadedRef.current = true;

    const loadAuth = async () => {
      try {
        await syncAuthFromStorage();
      } catch (e) {
        console.error(
          "AUTH LOAD ERROR:",
          e
        );

        clearAuthData();

        if (mountedRef.current) {
          setToken("");
          setUser(null);
          setLoading(false);
        }
      } finally {
        if (loadingTimerRef.current) {
          clearTimeout(
            loadingTimerRef.current
          );
        }

        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadAuth();

    const handleAuthSync = () => {
      syncAuthFromStorage();
    };

    window.addEventListener(
      "storage",
      handleAuthSync
    );

    window.addEventListener(
      "popstate",
      handleAuthSync
    );

    window.addEventListener(
      "focus",
      handleAuthSync
    );

    window.addEventListener(
      "auth-updated",
      handleAuthSync
    );

    return () => {
      mountedRef.current = false;

      if (loadingTimerRef.current) {
        clearTimeout(
          loadingTimerRef.current
        );
      }

      window.removeEventListener(
        "storage",
        handleAuthSync
      );

      window.removeEventListener(
        "popstate",
        handleAuthSync
      );

      window.removeEventListener(
        "focus",
        handleAuthSync
      );

      window.removeEventListener(
        "auth-updated",
        handleAuthSync
      );
    };
  }, []);

  /**
   * =====================================================
   * LOGIN
   * =====================================================
   */
  const login = (
    loginToken,
    loginUser = {}
  ) => {
    const nextToken =
      normalizeToken(loginToken);

    if (
      !isValidToken(nextToken) ||
      isAdminToken(nextToken)
    ) {
      console.error(
        "INVALID LOGIN TOKEN"
      );

      return false;
    }

    const normalizedUser =
      normalizeUser({
        ...loginUser,
        role:
          loginUser?.role ||
          loginUser?.userRole ||
          loginUser?.type ||
          "user",
        userRole:
          loginUser?.userRole ||
          loginUser?.role ||
          loginUser?.type ||
          "user",
        type:
          loginUser?.type ||
          loginUser?.role ||
          loginUser?.userRole ||
          "user",
        isAdmin: false,
      });

    if (
      isAdminUser(normalizedUser)
    ) {
      console.error(
        "ADMIN USER CANNOT USE USER AUTH CONTEXT"
      );

      return false;
    }

    try {
      localStorage.removeItem(
        USER_LOGOUT_MARKER_KEY
      );
      sessionStorage.removeItem(
        USER_LOGOUT_MARKER_KEY
      );
    } catch (e) {
      console.warn(
        "AUTH LOGOUT MARKER CLEAR ERROR:",
        e?.message || e
      );
    }

    clearAuthData();

    const saved =
      saveAuthData(
        nextToken,
        normalizedUser
      );

    if (!saved) {
      return false;
    }

    setToken(nextToken);
    setUser(normalizedUser);
    setLoading(false);

    try {
      window.dispatchEvent(
        new Event("auth-updated")
      );
    } catch (e) {
      console.warn(
        "AUTH EVENT ERROR:",
        e
      );
    }

    return true;
  };

  /**
   * =====================================================
   * LOGOUT
   * =====================================================
   */
  const logout = () => {
    try {
      localStorage.setItem(
        USER_LOGOUT_MARKER_KEY,
        "true"
      );
      sessionStorage.setItem(
        USER_LOGOUT_MARKER_KEY,
        "true"
      );
    } catch (e) {
      console.warn(
        "AUTH LOGOUT MARKER SAVE ERROR:",
        e?.message || e
      );
    }

    clearAuthData();

    setToken("");
    setUser(null);
    setLoading(false);

    try {
      window.dispatchEvent(
        new Event("auth-updated")
      );
    } catch (e) {
      console.warn(
        "AUTH EVENT ERROR:",
        e
      );
    }

    if (
      typeof window !== "undefined"
    ) {
      const currentPath =
        window.location.pathname;

      const isHomePath =
        currentPath === "/" ||
        currentPath === "/home";

      if (!isHomePath) {
        window.location.replace(
          "/login"
        );
      }
    }
  };

  /**
   * =====================================================
   * AUTH CHECK
   * =====================================================
   */
  const currentToken =
    token ||
    normalizeToken(
      readSavedToken()
    );

  const savedCurrentUser =
    readSavedUser();

  const currentUser =
    user &&
    !isAdminUser(user)
      ? user
      : (
          savedCurrentUser
            ? normalizeUser(
                savedCurrentUser
              )
            : null
        );

  const isAuthenticated =
    !loading &&
    isValidToken(currentToken) &&
    !isAdminToken(currentToken) &&
    !isExpiredToken(currentToken) &&
    !!currentUser &&
    !isAdminUser(currentUser);

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
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
