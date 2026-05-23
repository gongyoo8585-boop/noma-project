import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";

import reservationApi from "../services/reservation.api";
import userApi from "../services/user.api";

import Loading from "../components/common/Loading";
import ErrorMessage from "../components/common/ErrorMessage";
import EmptyState from "../components/common/EmptyState";

/**
 * =====================================================
 * /client/src/pages/MyPage.jsx
 * =====================================================
 * 🔥 NORA PREMIUM MYPAGE FINAL
 * ✔ 블랙 + 골드 + 핑크 프리미엄 UI
 * ✔ 기존 기능 100% 유지
 * ✔ 예약 목록
 * ✔ 예약 취소
 * ✔ 결제 이동
 * ✔ 로그아웃
 * ✔ 통계
 * ✔ 상태 필터
 * ✔ 런타임 안정성 강화
 * ✔ 기존 API 구조 유지
 * ✔ 기존 navigate 유지
 * ✔ Loading/Error/EmptyState 적용
 * =====================================================
 */

function MyPage({ navigate }) {
  const [user, setUser] =
    useState(null);

  const [reservations, setReservations] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  /**
   * =====================================================
   * USER LOAD
   * =====================================================
   */

  const loadUser =
    useCallback(async () => {
      try {
        const res =
          await userApi.getMe();

        setUser(
          res?.user ||
            res?.data ||
            res ||
            null
        );
      } catch (e) {
        console.error(
          "USER LOAD FAIL",
          e
        );
      }
    }, []);

  /**
   * =====================================================
   * RESERVATION LOAD
   * =====================================================
   */

  const loadReservations =
    useCallback(async () => {
      try {
        setLoading(true);

        const res =
          await reservationApi.getMyList();

        const list =
          res?.list ||
          res?.items ||
          res?.data ||
          [];

        setReservations(
          Array.isArray(list)
            ? list
            : []
        );
      } catch (e) {
        console.error(
          "RESERVATION LOAD FAIL",
          e
        );

        setError(
          "예약 목록 불러오기 실패"
        );
      } finally {
        setLoading(false);
      }
    }, []);

  /**
   * =====================================================
   * INITIAL
   * =====================================================
   */

  useEffect(() => {
    loadUser();
    loadReservations();
  }, [
    loadUser,
    loadReservations,
  ]);

  /**
   * =====================================================
   * FILTER
   * =====================================================
   */

  const filtered =
    useMemo(() => {
      if (
        filter === "all"
      ) {
        return reservations;
      }

      return reservations.filter(
        (item) =>
          item?.status ===
          filter
      );
    }, [
      filter,
      reservations,
    ]);

  /**
   * =====================================================
   * STATS
   * =====================================================
   */

  const stats =
    useMemo(() => {
      return {
        total:
          reservations.length,

        pending:
          reservations.filter(
            (r) =>
              r?.status ===
              "pending"
          ).length,

        completed:
          reservations.filter(
            (r) =>
              r?.status ===
              "completed"
          ).length,

        cancelled:
          reservations.filter(
            (r) =>
              r?.status ===
              "cancelled"
          ).length,
      };
    }, [reservations]);

  /**
   * =====================================================
   * CANCEL
   * =====================================================
   */

  const cancelReservation =
    async (id) => {
      try {
        const ok =
          window.confirm(
            "예약을 취소하시겠습니까?"
          );

        if (!ok) {
          return;
        }

        await reservationApi.cancel(
          id
        );

        alert(
          "예약 취소 완료"
        );

        loadReservations();
      } catch (e) {
        console.error(
          "CANCEL FAIL",
          e
        );

        alert(
          "예약 취소 실패"
        );
      }
    };

  /**
   * =====================================================
   * LOGOUT
   * =====================================================
   */

  const logout = () => {
    try {
      [
        "token",
        "accessToken",
        "authToken",
        "adminToken",
        "jwt",
        "user",
      ].forEach((key) => {
        localStorage.removeItem(
          key
        );

        sessionStorage.removeItem(
          key
        );
      });

      alert(
        "로그아웃 완료"
      );

      navigate("/login");
    } catch (e) {
      console.error(
        "LOGOUT FAIL",
        e
      );
    }
  };

  /**
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return <Loading />;
  }

  /**
   * =====================================================
   * ERROR
   * =====================================================
   */

  if (error) {
    return (
      <ErrorMessage
        message={error}
      />
    );
  }

  /**
   * =====================================================
   * FINAL
   * =====================================================
   */

  return (
    <div style={styles.page}>
      {/* =====================================================
      HEADER
      ===================================================== */}

      <div style={styles.header}>
        <div style={styles.logo}>
          노라
        </div>

        <div
          style={
            styles.headerButtons
          }
        >
          <button
            style={
              styles.topButton
            }
            onClick={() =>
              navigate("/")
            }
          >
            홈
          </button>

          <button
            style={
              styles.topButton
            }
            onClick={logout}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* =====================================================
      TITLE
      ===================================================== */}

      <div style={styles.titleWrap}>
        <h1 style={styles.title}>
          마이페이지
        </h1>

        <div
          style={
            styles.titleLine
          }
        />
      </div>

      {/* =====================================================
      USER INFO
      ===================================================== */}

      <section style={styles.card}>
        <div
          style={
            styles.cardHeader
          }
        >
          내 정보
        </div>

        <div
          style={
            styles.userGrid
          }
        >
          <div
            style={
              styles.userItem
            }
          >
            <span
              style={
                styles.userLabel
              }
            >
              ID
            </span>

            <span
              style={
                styles.userValue
              }
            >
              {user?.id ||
                user?._id ||
                "-"}
            </span>
          </div>

          <div
            style={
              styles.userItem
            }
          >
            <span
              style={
                styles.userLabel
              }
            >
              닉네임
            </span>

            <span
              style={
                styles.userValue
              }
            >
              {user?.nickname ||
                "-"}
            </span>
          </div>

          <div
            style={
              styles.userItem
            }
          >
            <span
              style={
                styles.userLabel
              }
            >
              권한
            </span>

            <span
              style={
                styles.userValue
              }
            >
              {user?.role ||
                "-"}
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================
      STATS
      ===================================================== */}

      <section style={styles.statsWrap}>
        <div style={styles.statCard}>
          <div
            style={
              styles.statLabel
            }
          >
            전체 예약
          </div>

          <div
            style={
              styles.statValue
            }
          >
            {stats.total}
          </div>
        </div>

        <div style={styles.statCard}>
          <div
            style={
              styles.statLabel
            }
          >
            대기
          </div>

          <div
            style={
              styles.statValue
            }
          >
            {stats.pending}
          </div>
        </div>

        <div style={styles.statCard}>
          <div
            style={
              styles.statLabel
            }
          >
            완료
          </div>

          <div
            style={
              styles.statValue
            }
          >
            {stats.completed}
          </div>
        </div>

        <div style={styles.statCard}>
          <div
            style={
              styles.statLabel
            }
          >
            취소
          </div>

          <div
            style={
              styles.statValue
            }
          >
            {stats.cancelled}
          </div>
        </div>
      </section>

      {/* =====================================================
      FILTER
      ===================================================== */}

      <div style={styles.filterWrap}>
        {[
          "all",
          "pending",
          "completed",
          "cancelled",
        ].map((item) => (
          <button
            key={item}
            onClick={() =>
              setFilter(item)
            }
            style={{
              ...styles.filterButton,

              ...(filter ===
              item
                ? styles.filterButtonActive
                : {}),
            }}
          >
            {item}
          </button>
        ))}
      </div>

      {/* =====================================================
      RESERVATION LIST
      ===================================================== */}

      <section style={styles.card}>
        <div
          style={
            styles.cardHeader
          }
        >
          내 예약
        </div>

        {filtered.length ===
          0 && (
          <EmptyState
            title="예약 없음"
            description="현재 예약 내역이 없습니다."
          />
        )}

        {filtered.map((r) => (
          <div
            key={
              r?._id ||
              Math.random()
            }
            style={
              styles.reservationCard
            }
          >
            {/* LEFT */}

            <div
              style={
                styles.leftArea
              }
            >
              <div
                style={
                  styles.shopName
                }
              >
                {r?.shop
                  ?.name ||
                  r?.shopName ||
                  "매장명"}
              </div>

              <div
                style={
                  styles.meta
                }
              >
                {r?.date ||
                  "-"}{" "}
                /{" "}
                {r?.time ||
                  "-"}
              </div>

              <div
                style={
                  styles.meta
                }
              >
                {r?.serviceType ||
                  "-"}
              </div>

              <div
                style={{
                  ...styles.status,

                  color:
                    r?.status ===
                    "completed"
                      ? "#00ff99"
                      : r?.status ===
                        "cancelled"
                      ? "#ff4d8d"
                      : "#d4af37",
                }}
              >
                상태 :{" "}
                {r?.status ||
                  "-"}
              </div>
            </div>

            {/* RIGHT */}

            <div
              style={
                styles.rightArea
              }
            >
              <button
                style={
                  styles.payButton
                }
                onClick={() =>
                  navigate(
                    `/payment?reservationId=${r?._id}`
                  )
                }
              >
                결제
              </button>

              {r?.status !==
                "cancelled" && (
                <button
                  style={
                    styles.cancelButton
                  }
                  onClick={() =>
                    cancelReservation(
                      r?._id
                    )
                  }
                >
                  취소
                </button>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

/* =====================================================
🔥 PREMIUM STYLE
===================================================== */

const styles = {
  page: {
    minHeight: "100vh",

    background:
      "#000000",

    padding:
      "32px 20px 80px",

    color: "#ffffff",
  },

  header: {
    display: "flex",

    alignItems:
      "center",

    justifyContent:
      "space-between",

    marginBottom: 40,
  },

  logo: {
    fontSize: 52,

    fontWeight: 900,

    color: "#ff2a8b",

    letterSpacing: "-2px",

    textShadow:
      `
      0 0 8px rgba(255,42,139,.9),
      0 0 18px rgba(255,42,139,.5)
    `,
  },

  headerButtons: {
    display: "flex",

    gap: 14,
  },

  topButton: {
    height: 50,

    padding:
      "0 26px",

    borderRadius: 12,

    border:
      "1px solid rgba(212,175,55,.75)",

    background:
      "#050505",

    color: "#ffffff",

    fontSize: 16,

    fontWeight: 700,

    cursor: "pointer",

    boxShadow:
      `
      0 0 12px rgba(212,175,55,.22)
    `,

    transition:
      "all .2s ease",
  },

  titleWrap: {
    marginBottom: 30,
  },

  title: {
    margin: 0,

    fontSize: 36,

    fontWeight: 900,

    color: "#ffffff",
  },

  titleLine: {
    width: 120,

    height: 2,

    background:
      "linear-gradient(90deg,#ff2a8b,#d4af37)",

    marginTop: 14,
  },

  card: {
    border:
      "1px solid rgba(212,175,55,.42)",

    borderRadius: 24,

    background:
      "rgba(5,5,5,.96)",

    padding: 26,

    marginBottom: 26,

    boxShadow:
      `
      0 0 20px rgba(212,175,55,.08)
    `,
  },

  cardHeader: {
    fontSize: 24,

    fontWeight: 800,

    color: "#d4af37",

    marginBottom: 24,
  },

  userGrid: {
    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",

    gap: 18,
  },

  userItem: {
    padding: 18,

    borderRadius: 16,

    border:
      "1px solid rgba(212,175,55,.18)",

    background:
      "rgba(255,255,255,.02)",
  },

  userLabel: {
    display: "block",

    fontSize: 13,

    color:
      "rgba(255,255,255,.55)",

    marginBottom: 8,
  },

  userValue: {
    fontSize: 18,

    fontWeight: 700,

    color: "#ffffff",
  },

  statsWrap: {
    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit,minmax(180px,1fr))",

    gap: 18,

    marginBottom: 28,
  },

  statCard: {
    borderRadius: 22,

    border:
      "1px solid rgba(212,175,55,.35)",

    background:
      "#050505",

    padding:
      "24px 18px",

    textAlign: "center",

    boxShadow:
      `
      0 0 16px rgba(212,175,55,.08)
    `,
  },

  statLabel: {
    fontSize: 14,

    color:
      "rgba(255,255,255,.65)",

    marginBottom: 12,
  },

  statValue: {
    fontSize: 34,

    fontWeight: 900,

    color: "#d4af37",
  },

  filterWrap: {
    display: "flex",

    gap: 12,

    flexWrap: "wrap",

    marginBottom: 24,
  },

  filterButton: {
    height: 46,

    padding:
      "0 22px",

    borderRadius: 12,

    border:
      "1px solid rgba(212,175,55,.25)",

    background:
      "#050505",

    color:
      "rgba(255,255,255,.75)",

    fontSize: 15,

    fontWeight: 700,

    cursor: "pointer",

    transition:
      "all .2s ease",
  },

  filterButtonActive: {
    background:
      "linear-gradient(135deg,#ff2a8b,#ff005d)",

    border:
      "1px solid rgba(255,42,139,.9)",

    color: "#ffffff",

    boxShadow:
      `
      0 0 16px rgba(255,42,139,.35)
    `,
  },

  reservationCard: {
    display: "flex",

    justifyContent:
      "space-between",

    alignItems: "center",

    gap: 20,

    padding: 22,

    borderRadius: 22,

    marginBottom: 18,

    border:
      "1px solid rgba(212,175,55,.22)",

    background:
      "rgba(255,255,255,.02)",

    boxShadow:
      `
      0 0 10px rgba(212,175,55,.05)
    `,
  },

  leftArea: {
    flex: 1,
  },

  shopName: {
    fontSize: 24,

    fontWeight: 900,

    color: "#ffffff",

    marginBottom: 12,
  },

  meta: {
    fontSize: 15,

    color:
      "rgba(255,255,255,.72)",

    marginBottom: 6,
  },

  status: {
    marginTop: 10,

    fontSize: 15,

    fontWeight: 700,
  },

  rightArea: {
    display: "flex",

    gap: 10,

    flexWrap: "wrap",
  },

  payButton: {
    minWidth: 110,

    height: 48,

    borderRadius: 12,

    border: "none",

    background:
      "linear-gradient(135deg,#ff2a8b,#ff005d)",

    color: "#ffffff",

    fontSize: 15,

    fontWeight: 800,

    cursor: "pointer",

    boxShadow:
      `
      0 0 18px rgba(255,42,139,.35)
    `,
  },

  cancelButton: {
    minWidth: 110,

    height: 48,

    borderRadius: 12,

    border:
      "1px solid rgba(212,175,55,.35)",

    background:
      "#111111",

    color: "#ffffff",

    fontSize: 15,

    fontWeight: 700,

    cursor: "pointer",
  },
};

export default MyPage;