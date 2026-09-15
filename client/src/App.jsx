"use strict";

import React, {
  useEffect,
  useState,
} from "react";

import {
  BrowserRouter,
} from "react-router-dom";

import AppRouter from "./router/AppRouter";
import { AuthProvider } from "./context/AuthContext";

import Loading from "./components/common/Loading";
import ErrorMessage from "./components/common/ErrorMessage";

function App() {
  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    try {
      setLoading(false);
    } catch (e) {
      console.error(
        "INITIAL APP LOAD FAIL:",
        e
      );

      setError(
        "시스템 오류 발생"
      );

      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onError = (e) => {
      console.error(
        "GLOBAL ERROR:",
        e.message
      );

      setError(
        "시스템 오류 발생"
      );
    };

    const onUnhandledRejection =
      (e) => {
        console.error(
          "GLOBAL PROMISE ERROR:",
          e.reason
        );
      };

    window.addEventListener(
      "error",
      onError
    );

    window.addEventListener(
      "unhandledrejection",
      onUnhandledRejection
    );

    return () => {
      window.removeEventListener(
        "error",
        onError
      );

      window.removeEventListener(
        "unhandledrejection",
        onUnhandledRejection
      );
    };
  }, []);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
      />
    );
  }

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <div
          style={{
            width: "100%",
            minWidth: "320px",
            minHeight: "100vh",
            background:
              "radial-gradient(circle at 50% 0%, rgba(255,212,0,0.06) 0%, rgba(0,0,0,0) 28%), #000000",
            color: "#d4af37",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily:
              '"Pretendard", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          <main
            style={{
              flex: 1,
              width: "100%",
              minWidth: 0,
              minHeight: 0,
              overflow: "hidden",
              background: "#000000",
            }}
          >
            <AppRouter />
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
