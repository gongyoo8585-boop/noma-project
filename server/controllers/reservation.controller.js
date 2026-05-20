"use strict";

/**
 * =====================================================
 * 🔥 RESERVATION CONTROLLER (PATCHED - MINIMAL ADD ONLY)
 * ✔ 기존 코드 100% 유지
 * ✔ 날짜 / 매장 필터 추가 (관리자 목록)
 * ✔ 기존 로직 절대 변경 없음
 * ✔ AUTH_USER_QUERY_ERROR 방지
 * ✔ populate null 안전 처리
 * ✔ mongoose 예외 대응
 * ✔ list/items/reservations 동시 응답 추가
 * ✔ INVALID_USER 최소 방어
 * ✔ 관리자 목록 안정성 강화
 * =====================================================
 */

const Reservation = require("../models/Reservation");
const Shop = require("../models/Shop");

/* ========================= */
const ok = (res, data = {}) =>
  res.json({
    ok: true,
    ...data,
  });

const fail = (
  res,
  msg = "ERROR",
  code = 400
) =>
  res.status(code).json({
    ok: false,
    msg,
  });

const getUserId = (req) =>
  req.user?.id ||
  req.user?._id;

const isAdmin = (req) => {

  const role =
    req.user?.role ||
    req.user?.type ||
    req.user?.userRole;

  return (
    role === "admin" ||
    role === "ADMIN" ||
    role === 1 ||
    req.user?.isAdmin === true ||
    req.isAdmin === true
  );
};

/* ===================================================== */
exports.create = async (
  req,
  res
) => {

  try {

    const userId =
      getUserId(req);

    const {
      shopId,
      date,
      time,
      serviceType,
      memo,
      people,
    } = req.body;

    if (
      !shopId ||
      !date ||
      !time
    ) {
      return fail(
        res,
        "필수값 누락"
      );
    }

    const shop =
      await Shop.findById(
        shopId
      );

    if (!shop) {
      return fail(
        res,
        "매장 없음"
      );
    }

    const exists =
      await Reservation.findOne({
        shop: shopId,
        date,
        time,
        status: {
          $ne: "cancelled",
        },
      });

    if (exists) {
      return fail(
        res,
        "이미 예약된 시간"
      );
    }

    const reservation =
      await Reservation.create({
        user: userId,
        shop: shopId,
        date,
        time,
        serviceType,
        memo,
        people,
        status: "pending",
        price:
          shop.priceDiscount ||
          shop.priceOriginal ||
          shop.price ||
          0,
      });

    ok(res, {
      reservation,
    });

  } catch (e) {

    console.error(
      "RESERVATION CREATE ERROR:",
      e.message
    );

    fail(
      res,
      e.message
    );
  }
};

/* ===================================================== */
exports.getMyList =
  async (
    req,
    res
  ) => {

    try {

      const userId =
        getUserId(req);

      /* 🔥 최소 추가 */
      if (!userId) {
        return ok(res, {
          list: [],
          items: [],
          reservations: [],
        });
      }

      let query =
        Reservation.find({
          user: userId,
        });

      if (
        typeof query.populate ===
        "function"
      ) {
        query =
          query.populate(
            "shop"
          );
      }

      if (
        typeof query.sort ===
        "function"
      ) {
        query =
          query.sort({
            createdAt: -1,
          });
      }

      const list =
        await query;

      ok(res, {
        list:
          Array.isArray(
            list
          )
            ? list
            : [],

        /* 🔥 최소 추가 */
        items:
          Array.isArray(
            list
          )
            ? list
            : [],

        /* 🔥 최소 추가 */
        reservations:
          Array.isArray(
            list
          )
            ? list
            : [],
      });

    } catch (e) {

      console.error(
        "GET MY RESERVATION ERROR:",
        e.message
      );

      fail(
        res,
        e.message
      );
    }
  };

/* ===================================================== */
exports.getDetail =
  async (
    req,
    res
  ) => {

    try {

      const { id } =
        req.params;

      let query =
        Reservation.findById(
          id
        );

      if (
        typeof query.populate ===
        "function"
      ) {
        query =
          query
            .populate(
              "shop"
            )
            .populate(
              "user"
            );
      }

      const item =
        await query;

      if (!item) {
        return fail(
          res,
          "예약 없음",
          404
        );
      }

      ok(res, {
        reservation:
          item,

        /* 🔥 최소 추가 */
        item,
      });

    } catch (e) {

      console.error(
        "GET RESERVATION DETAIL ERROR:",
        e.message
      );

      fail(
        res,
        e.message
      );
    }
  };

/* ===================================================== */
exports.cancel = async (
  req,
  res
) => {

  try {

    const userId =
      getUserId(req);

    const { id } =
      req.params;

    const item =
      await Reservation.findById(
        id
      );

    if (!item) {
      return fail(
        res,
        "예약 없음"
      );
    }

    if (
      !isAdmin(req) &&
      String(item.user) !==
        String(userId)
    ) {
      return fail(
        res,
        "권한 없음",
        403
      );
    }

    item.status =
      "cancelled";

    item.cancelledAt =
      new Date();

    await item.save();

    ok(res);

  } catch (e) {

    console.error(
      "RESERVATION CANCEL ERROR:",
      e.message
    );

    fail(
      res,
      e.message
    );
  }
};

/* ===================================================== */
exports.getSlots = async (
  req,
  res
) => {

  try {

    const {
      shopId,
      date,
    } = req.query;

    if (
      !shopId ||
      !date
    ) {
      return fail(
        res,
        "파라미터 필요"
      );
    }

    const baseSlots = [
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
      "18:00",
      "19:00",
      "20:00",
    ];

    const reservations =
      await Reservation.find({
        shop: shopId,
        date,
        status: {
          $ne:
            "cancelled",
        },
      });

    const bookedTimes =
      new Set(
        reservations.map(
          (r) => r.time
        )
      );

    const slots =
      baseSlots.map(
        (time) => ({
          time,
          available:
            !bookedTimes.has(
              time
            ),
        })
      );

    ok(res, {
      slots,
    });

  } catch (e) {

    console.error(
      "GET SLOT ERROR:",
      e.message
    );

    fail(
      res,
      e.message
    );
  }
};

/* ===================================================== */
exports.getAdminList =
  async (
    req,
    res
  ) => {

    try {

      if (
        !isAdmin(req)
      ) {
        return fail(
          res,
          "권한 없음",
          403
        );
      }

      const {
        keyword,
        status,
        limit = 50,
        date,
        shopId,
      } = req.query;

      const query = {};

      if (status) {
        query.status =
          status;
      }

      /* 🔥 최소 추가: 날짜 필터 */
      if (date) {
        query.date =
          date;
      }

      /* 🔥 최소 추가: 매장 필터 */
      if (shopId) {
        query.shop =
          shopId;
      }

      if (keyword) {
        query.$or = [
          {
            memo: {
              $regex:
                keyword,
              $options:
                "i",
            },
          },
        ];
      }

      let finder =
        Reservation.find(
          query
        );

      /* 🔥 최소 수정: populate 안전 처리 */
      if (
        typeof finder.populate ===
        "function"
      ) {

        try {

          finder =
            finder
              .populate(
                "shop"
              )
              .populate(
                "user"
              );

        } catch (e) {

          console.error(
            "POPULATE ERROR:",
            e.message
          );
        }
      }

      if (
        typeof finder.sort ===
        "function"
      ) {
        finder =
          finder.sort({
            createdAt: -1,
          });
      }

      if (
        typeof finder.limit ===
        "function"
      ) {
        finder =
          finder.limit(
            Number(
              limit
            )
          );
      }

      const list =
        await finder;

      ok(res, {
        list:
          Array.isArray(
            list
          )
            ? list
            : [],

        /* 🔥 최소 추가 */
        items:
          Array.isArray(
            list
          )
            ? list
            : [],

        /* 🔥 최소 추가 */
        reservations:
          Array.isArray(
            list
          )
            ? list
            : [],
      });

    } catch (e) {

      console.error(
        "ADMIN RESERVATION ERROR:",
        e.message
      );

      fail(
        res,
        e.message ||
          "ADMIN_RESERVATION_ERROR",
        500
      );
    }
  };

/* ===================================================== */
exports.getList =
  exports.getAdminList;

/* ===================================================== */
exports.updateStatus =
  async (
    req,
    res
  ) => {

    try {

      if (
        !isAdmin(req)
      ) {
        return fail(
          res,
          "권한 없음",
          403
        );
      }

      const { id } =
        req.params;

      const {
        status,
      } = req.body;

      const allowed =
        [
          "pending",
          "approved",
          "confirmed",
          "completed",
          "cancelled",
        ];

      if (
        !allowed.includes(
          status
        )
      ) {
        return fail(
          res,
          "잘못된 상태값"
        );
      }

      const item =
        await Reservation.findById(
          id
        );

      if (!item) {
        return fail(
          res,
          "예약 없음"
        );
      }

      item.status =
        status;

      if (
        status ===
        "completed"
      ) {
        item.completedAt =
          new Date();
      }

      if (
        status ===
        "cancelled"
      ) {
        item.cancelledAt =
          new Date();
      }

      await item.save();

      ok(res);

    } catch (e) {

      console.error(
        "UPDATE RESERVATION STATUS ERROR:",
        e.message
      );

      fail(
        res,
        e.message
      );
    }
  };

/* ===================================================== */
exports.remove = async (
  req,
  res
) => {

  try {

    if (
      !isAdmin(req)
    ) {
      return fail(
        res,
        "권한 없음",
        403
      );
    }

    const { id } =
      req.params;

    const item =
      await Reservation.findById(
        id
      );

    if (!item) {
      return fail(
        res,
        "예약 없음"
      );
    }

    await item.deleteOne();

    ok(res);

  } catch (e) {

    console.error(
      "REMOVE RESERVATION ERROR:",
      e.message
    );

    fail(
      res,
      e.message
    );
  }
};

/* ===================================================== */
exports.getStats =
  async (
    req,
    res
  ) => {

    try {

      if (
        !isAdmin(req)
      ) {
        return fail(
          res,
          "권한 없음",
          403
        );
      }

      const total =
        await Reservation.countDocuments();

      const completed =
        await Reservation.countDocuments(
          {
            status:
              "completed",
          }
        );

      let revenue =
        0;

      try {

        const revenueAgg =
          await Reservation.aggregate(
            [
              {
                $match:
                  {
                    status:
                      "completed",
                  },
              },
              {
                $group:
                  {
                    _id: null,
                    total:
                      {
                        $sum:
                          "$price",
                      },
                  },
              },
            ]
          );

        revenue =
          revenueAgg?.[0]
            ?.total || 0;

      } catch (e) {

        console.error(
          "REVENUE AGG ERROR:",
          e.message
        );
      }

      ok(res, {
        total,
        completed,
        revenue,
      });

    } catch (e) {

      console.error(
        "RESERVATION STATS ERROR:",
        e.message
      );

      fail(
        res,
        e.message,
        500
      );
    }
  };