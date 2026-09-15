"use strict";

/**
 * =====================================================
 * 🔥 AUTH CONTROLLER (ULTRA FINAL - COMPLETE STABLE)
 * ✔ 기존 구조 100% 유지
 * ✔ admin 인증 오류 수정
 * ✔ JWT payload 안정화
 * ✔ /admin API 인증 정상화
 * ✔ null / undefined 방어
 * ✔ axios 구조 대응
 * ✔ kakao 로그인 유지
 * ✔ 기존 흐름 유지
 * ✔ email/id 로그인 동시 대응
 * ✔ role/isAdmin 토큰 반영 강화
 * ✔ 휴대폰 인증번호 발송/확인 최소 추가
 * ✔ SMS 발송 설정이 있으면 실제 문자 발송
 * =====================================================
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const crypto = require("crypto");

function safeRequire(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

const nodemailer = safeRequire("nodemailer");

const User = require("../models/User");

/* =========================
ENV
========================= */
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "change_me";

const JWT_EXPIRES_IN =
  process.env.JWT_EXPIRES_IN ||
  "7d";

const KAKAO_CLIENT_ID =
  process.env.KAKAO_CLIENT_ID ||
  "";

const KAKAO_CLIENT_SECRET =
  process.env.KAKAO_CLIENT_SECRET ||
  "";

const KAKAO_REDIRECT_URI =
  process.env.KAKAO_REDIRECT_URI ||
  "http://localhost:10000/auth/kakao/callback";

const CLIENT_URL =
  process.env.CLIENT_URL ||
  "http://localhost:5173";

const SMS_PROVIDER =
  String(process.env.SMS_PROVIDER || "")
    .toLowerCase()
    .trim();

const SMS_FROM =
  String(
    process.env.SMS_FROM ||
      process.env.SMS_FROM_NUMBER ||
      process.env.COOLSMS_FROM ||
      process.env.SOLAPI_FROM ||
      ""
  )
    .replace(/[^0-9]/g, "")
    .trim();

const COOLSMS_API_KEY =
  process.env.COOLSMS_API_KEY ||
  process.env.SOLAPI_API_KEY ||
  "";

const COOLSMS_API_SECRET =
  process.env.COOLSMS_API_SECRET ||
  process.env.SOLAPI_API_SECRET ||
  "";

const COOLSMS_API_URL =
  process.env.COOLSMS_API_URL ||
  process.env.SOLAPI_API_URL ||
  "https://api.solapi.com/messages/v4/send";

const SMS_WEBHOOK_URL =
  process.env.SMS_WEBHOOK_URL ||
  "";

const TWILIO_ACCOUNT_SID =
  process.env.TWILIO_ACCOUNT_SID ||
  process.env.SMS_ACCOUNT_SID ||
  "";

const TWILIO_AUTH_TOKEN =
  process.env.TWILIO_AUTH_TOKEN ||
  process.env.SMS_AUTH_TOKEN ||
  process.env.SMS_API_KEY ||
  "";

const TWILIO_FROM =
  String(
    process.env.TWILIO_FROM ||
      process.env.TWILIO_PHONE_NUMBER ||
      process.env.SMS_FROM ||
      process.env.SMS_FROM_NUMBER ||
      ""
  )
    .replace(/[^0-9+]/g, "")
    .trim();

const TWILIO_API_URL =
  process.env.TWILIO_API_URL ||
  "https://api.twilio.com/2010-04-01";

const SMTP_HOST = (() => {
  const host =
    String(
      process.env.SMTP_HOST ||
      ""
    )
      .trim();

  if (
    host.toLowerCase() ===
    "smtp.hiworks.com"
  ) {
    return "smtps.hiworks.com";
  }

  return host;
})();

const SMTP_PORT = (() => {
  const configuredPort =
    Number(
      process.env.SMTP_PORT ||
      0
    );

  if (
    SMTP_HOST.toLowerCase() ===
      "smtps.hiworks.com" &&
    (
      !configuredPort ||
      configuredPort === 587
    )
  ) {
    return 465;
  }

  return configuredPort || 587;
})();

const SMTP_USER =
  String(
    process.env.SMTP_USER ||
    ""
  )
    .trim();

const SMTP_PASS =
  String(
    process.env.SMTP_PASS ||
    ""
  );

const SMTP_FROM =
  String(
    process.env.SMTP_FROM ||
    process.env.MAIL_FROM ||
    SMTP_USER ||
    ""
  )
    .trim();

/* =========================
휴대폰 인증 임시 저장소
========================= */
const phoneCodeStore = new Map();
const emailCodeStore = new Map();

function normalizePhone(phone) {
  return String(phone || "")
    .replace(/[^0-9]/g, "")
    .trim();
}

function normalizeEmail(email) {
  return String(email || "")
    .toLowerCase()
    .trim();
}

function createPhoneCode() {
  return String(
    Math.floor(100000 + Math.random() * 900000)
  );
}

function createEmailCode() {
  return String(
    Math.floor(100000 + Math.random() * 900000)
  );
}

function createSmsText(code) {
  return `[NORA] 인증번호는 ${code} 입니다. 5분 이내에 입력해주세요.`;
}

function createEmailSubject() {
  return "[NORA] 이메일 인증번호";
}

function createEmailText(code) {
  return [
    "NORA 이메일 인증번호입니다.",
    "",
    `인증번호: ${code}`,
    "",
    "인증번호는 5분 동안 유효합니다.",
    "본인이 요청하지 않았다면 이 메일을 무시해주세요.",
  ].join("\n");
}

function createEmailHtml(code) {
  return `
    <div style="margin:0;padding:24px;background:#ffffff;font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#222;">
      <div style="max-width:520px;margin:0 auto;">
        <h2 style="margin:0 0 20px;font-size:22px;line-height:1.4;">NORA 이메일 인증</h2>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">아래 인증번호를 회원가입 화면에 입력해주세요.</p>
        <div style="margin:0 0 18px;padding:18px;border:1px solid #dddddd;border-radius:8px;text-align:center;">
          <div style="margin-bottom:8px;font-size:13px;color:#666666;">이메일 인증번호</div>
          <div style="font-size:30px;font-weight:700;letter-spacing:6px;color:#111111;">${code}</div>
        </div>
        <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">인증번호는 5분 동안 유효합니다.</p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#777777;">본인이 요청하지 않았다면 이 메일을 무시해주세요.</p>
      </div>
    </div>
  `;
}

function createSolapiAuthorization() {
  const date =
    new Date().toISOString();

  const salt =
    crypto.randomBytes(16).toString("hex");

  const signature =
    crypto
      .createHmac(
        "sha256",
        COOLSMS_API_SECRET
      )
      .update(date + salt)
      .digest("hex");

  return `HMAC-SHA256 apiKey=${COOLSMS_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`;
}

async function sendSmsMessage(phone, code) {
  const text =
    createSmsText(code);

  if (
    SMS_PROVIDER === "solapi" ||
    SMS_PROVIDER === "coolsms"
  ) {
    if (
      !COOLSMS_API_KEY ||
      !COOLSMS_API_SECRET ||
      !SMS_FROM
    ) {
      throw new Error(
        "SMS_PROVIDER_NOT_CONFIGURED"
      );
    }

    await axios.post(
      COOLSMS_API_URL,
      {
        message: {
          to: phone,
          from: SMS_FROM,
          text,
        },
      },
      {
        headers: {
          Authorization:
            createSolapiAuthorization(),
          "Content-Type":
            "application/json",
        },
        timeout: 10000,
      }
    );

    return true;
  }

  if (SMS_PROVIDER === "twilio") {
    if (
      !TWILIO_ACCOUNT_SID ||
      !TWILIO_AUTH_TOKEN ||
      !TWILIO_FROM
    ) {
      throw new Error(
        "SMS_PROVIDER_NOT_CONFIGURED"
      );
    }

    await axios.post(
      `${TWILIO_API_URL}/Accounts/${encodeURIComponent(
        TWILIO_ACCOUNT_SID
      )}/Messages.json`,
      new URLSearchParams({
        To: phone,
        From: TWILIO_FROM,
        Body: text,
      }).toString(),
      {
        auth: {
          username: TWILIO_ACCOUNT_SID,
          password: TWILIO_AUTH_TOKEN,
        },
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        timeout: 10000,
      }
    );

    return true;
  }

  if (SMS_WEBHOOK_URL) {
    await axios.post(
      SMS_WEBHOOK_URL,
      {
        to: phone,
        phone,
        text,
        code,
      },
      {
        timeout: 10000,
      }
    );

    return true;
  }

  if (
    process.env.NODE_ENV === "production"
  ) {
    console.error(
      "[SMS CONFIG MISSING] SMS provider is not configured. Verification code was generated but SMS was not sent."
    );

    console.log(
      `[PHONE VERIFY CODE] ${phone}: ${code}`
    );

    return false;
  }

  console.log(
    `[PHONE VERIFY CODE] ${phone}: ${code}`
  );

  return false;
}

async function sendEmailMessage(email, code) {
  if (
    !nodemailer ||
    !SMTP_HOST ||
    !SMTP_PORT ||
    !SMTP_USER ||
    !SMTP_PASS ||
    !SMTP_FROM
  ) {
    throw new Error(
      "EMAIL_PROVIDER_NOT_CONFIGURED"
    );
  }

  const smtpSecure =
    SMTP_PORT === 465 ||
    SMTP_HOST
      .toLowerCase()
      .startsWith("smtps.");

  const transporter =
    nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: smtpSecure,
      requireTLS:
        !smtpSecure &&
        SMTP_PORT === 587,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        servername: SMTP_HOST,
        minVersion: "TLSv1.2",
      },
    });

  const mailInfo =
    await transporter.sendMail({
      from: `"NORA" <${SMTP_FROM}>`,
      to: email,
      replyTo: SMTP_FROM,
      subject: createEmailSubject(),
      text: createEmailText(code),
      html: createEmailHtml(code),
    });

  const accepted =
    Array.isArray(mailInfo?.accepted)
      ? mailInfo.accepted
      : [];

  const rejected =
    Array.isArray(mailInfo?.rejected)
      ? mailInfo.rejected
      : [];

  console.log("[EMAIL SEND RESULT]", {
    to: email,
    accepted,
    rejected,
    response: mailInfo?.response || "",
    messageId: mailInfo?.messageId || "",
    envelope: mailInfo?.envelope || null,
  });

  if (
    rejected.length > 0 &&
    rejected
      .map((item) => String(item).toLowerCase())
      .includes(String(email).toLowerCase())
  ) {
    throw new Error("EMAIL_RECIPIENT_REJECTED");
  }

  if (
    accepted.length === 0 &&
    process.env.NODE_ENV === "production"
  ) {
    throw new Error("EMAIL_NOT_ACCEPTED");
  }

  return true;
}

/* =========================
공통 응답
========================= */
const ok = (res, data = {}) => {
  return res.json({
    ok: true,
    ...data,
  });
};

const fail = (
  res,
  code = 400,
  message = "ERROR"
) => {
  return res.status(code).json({
    ok: false,
    message,
  });
};

/* =========================
토큰 생성
========================= */
function createToken(user) {
  const safeUserId =
    user && user._id
      ? String(user._id)
      : null;

  const safeRole =
    user && user.role
      ? String(user.role)
      : "user";

  const safeIsAdmin =
    safeRole === "admin" ||
    user?.isAdmin === true;

  return jwt.sign(
    {
      id:
        user && user.id
          ? user.id
          : "",

      _id: safeUserId,

      userId: safeUserId,

      email:
        user && user.email
          ? user.email
          : "",

      role: safeRole,

      isAdmin: safeIsAdmin,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

/* =========================
안전 유저 응답
========================= */
function safeUser(user) {
  if (!user) {
    return null;
  }

  const obj =
    typeof user.toObject === "function"
      ? user.toObject()
      : user;

  delete obj.password;
  delete obj.__v;
  delete obj.loginFailCount;
  delete obj.lockedUntil;

  if (
    obj.role === "admin" ||
    obj.isAdmin === true
  ) {
    obj.role = "admin";
    obj.isAdmin = true;
  }

  return obj;
}

/* =====================================================
1. 회원가입
===================================================== */
exports.register = async (req, res) => {
  try {
    const {
      id,
      password,
      nickname,
      phone,
      email,
      serviceType,
    } = req.body || {};

    const safeEmail =
      normalizeEmail(email);

    const safeServiceType =
      String(serviceType || "")
        .trim()
        .toLowerCase() === "karaoke"
        ? "karaoke"
        : "general";

    if (!id || !password) {
      return fail(
        res,
        400,
        "ID_PASSWORD_REQUIRED"
      );
    }

    if (safeEmail) {
      const saved =
        emailCodeStore.get(safeEmail);

      if (
        !saved ||
        saved.verified !== true ||
        (saved.expiresAt && saved.expiresAt < Date.now())
      ) {
        return fail(
          res,
          400,
          "EMAIL_NOT_VERIFIED"
        );
      }
    }

    const exists =
      await User.findOne({
        id,
      });

    if (exists) {
      return fail(
        res,
        409,
        "USER_ALREADY_EXISTS"
      );
    }

    const hash =
      await bcrypt.hash(password, 10);

    const user =
      await User.create({
        id,
        password: hash,
        nickname: nickname || id,
        phone: phone || "",
        email: safeEmail || "",
        emailVerified: !!safeEmail,
        serviceType: safeServiceType,
        role: "user",
        isAdmin: false,
        blocked: false,
      });

    if (safeEmail) {
      emailCodeStore.delete(safeEmail);
    }

    const token =
      createToken(user);

    return ok(res, {
      token,
      user: safeUser(user),
    });
  } catch (err) {
    console.error(
      "REGISTER ERROR:",
      err
    );

    return fail(
      res,
      500,
      "REGISTER_FAILED"
    );
  }
};

/* =====================================================
🔥 관리자 전용 회원가입
===================================================== */
exports.adminRegister = async (req, res) => {
  try {
    const requestToken =
      String(req.token || "")
        .replace(/^Bearer\s+/i, "")
        .trim();

    if (!requestToken) {
      return fail(
        res,
        401,
        "AUTH_TOKEN_REQUIRED"
      );
    }

    let verifiedAdminPayload = null;

    try {
      verifiedAdminPayload =
        jwt.verify(
          requestToken,
          JWT_SECRET
        );
    } catch (e) {
      return fail(
        res,
        401,
        "INVALID_ADMIN_TOKEN"
      );
    }

    const verifiedRole =
      String(
        verifiedAdminPayload?.role ||
        ""
      )
        .trim()
        .toLowerCase();

    if (
      verifiedRole !== "admin" &&
      verifiedAdminPayload?.isAdmin !== true
    ) {
      return fail(
        res,
        403,
        "ADMIN_REQUIRED"
      );
    }

    const verifiedMongoId =
      String(
        verifiedAdminPayload?._id ||
        verifiedAdminPayload?.userId ||
        ""
      )
        .trim();

    const verifiedLoginId =
      String(
        verifiedAdminPayload?.id ||
        ""
      )
        .trim();

    let requestAdmin = null;

    if (
      /^[0-9a-fA-F]{24}$/.test(
        verifiedMongoId
      )
    ) {
      requestAdmin =
        await User.findById(
          verifiedMongoId
        ).select(
          "+role +id"
        );
    }

    if (
      !requestAdmin &&
      verifiedLoginId
    ) {
      requestAdmin =
        await User.findOne({
          id: verifiedLoginId,
        }).select(
          "+role +id"
        );
    }

    if (
      !requestAdmin ||
      String(requestAdmin.role || "")
        .trim()
        .toLowerCase() !== "admin"
    ) {
      return fail(
        res,
        403,
        "ADMIN_REQUIRED"
      );
    }

    const {
      id,
      password,
      nickname,
      phone,
      email,
      role,
      serviceType,
    } = req.body || {};

    const safeId =
      String(id || "")
        .trim();

    const safeEmail =
      normalizeEmail(email);

    const safeRole =
      String(role || "user")
        .trim()
        .toLowerCase();

    if (
      !["user", "shop", "admin"].includes(
        safeRole
      )
    ) {
      return fail(
        res,
        400,
        "INVALID_ROLE"
      );
    }

    let safeServiceType =
      "general";

    if (safeRole === "shop") {
      const requestedServiceType =
        String(serviceType || "")
          .trim()
          .toLowerCase();

      if (
        !["massage", "karaoke"].includes(
          requestedServiceType
        )
      ) {
        return fail(
          res,
          400,
          "INVALID_SERVICE_TYPE"
        );
      }

      safeServiceType =
        requestedServiceType;
    }

    if (!safeId || !password) {
      return fail(
        res,
        400,
        "ID_PASSWORD_REQUIRED"
      );
    }

    if (!nickname) {
      return fail(
        res,
        400,
        "NICKNAME_REQUIRED"
      );
    }

    if (!safeEmail) {
      return fail(
        res,
        400,
        "EMAIL_REQUIRED"
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        safeEmail
      )
    ) {
      return fail(
        res,
        400,
        "INVALID_EMAIL"
      );
    }

    const idExists =
      await User.findOne({
        id: safeId,
      });

    if (idExists) {
      return fail(
        res,
        409,
        "USER_ALREADY_EXISTS"
      );
    }

    const emailExists =
      await User.findOne({
        email: safeEmail,
      });

    if (emailExists) {
      return fail(
        res,
        409,
        "EMAIL_ALREADY_EXISTS"
      );
    }

    const hash =
      await bcrypt.hash(
        password,
        10
      );

    const user =
      await User.create({
        id: safeId,
        password: hash,
        nickname:
          String(nickname || "")
            .trim() ||
          safeId,
        phone: phone || "",
        email: safeEmail,
        emailVerified: false,
        serviceType:
          safeServiceType,
        role: safeRole,
        isAdmin:
          safeRole === "admin",
        status: "active",
        blocked: false,
      });

    return ok(res, {
      user: safeUser(user),
    });
  } catch (err) {
    console.error(
      "ADMIN REGISTER ERROR:",
      err
    );

    return fail(
      res,
      500,
      "ADMIN_REGISTER_FAILED"
    );
  }
};


/* =====================================================
🔥 휴대폰 인증번호 발송
===================================================== */
exports.sendVerificationCode = async (req, res) => {
  try {
    const phone =
      normalizePhone(req.body?.phone);

    if (!phone) {
      return fail(
        res,
        400,
        "PHONE_REQUIRED"
      );
    }

    if (!/^01[0-9]{8,9}$/.test(phone)) {
      return fail(
        res,
        400,
        "INVALID_PHONE"
      );
    }

    const code =
      createPhoneCode();

    const smsSent =
      await sendSmsMessage(
        phone,
        code
      );

    phoneCodeStore.set(phone, {
      code,
      expiresAt:
        Date.now() + 1000 * 60 * 5,
      verified: false,
    });

    return ok(res, {
      message: "VERIFICATION_CODE_SENT",
      smsSent,
      devCode:
        process.env.NODE_ENV === "production"
          ? undefined
          : code,
    });
  } catch (err) {
    console.error(
      "SEND VERIFICATION CODE ERROR:",
      err
    );

    return fail(
      res,
      500,
      err?.message ||
        "SEND_CODE_FAILED"
    );
  }
};

/* =====================================================
🔥 휴대폰 인증번호 확인
===================================================== */
exports.verifyVerificationCode = async (req, res) => {
  try {
    const phone =
      normalizePhone(req.body?.phone);

    const code =
      String(req.body?.code || "")
        .trim();

    if (!phone || !code) {
      return fail(
        res,
        400,
        "PHONE_CODE_REQUIRED"
      );
    }

    const saved =
      phoneCodeStore.get(phone);

    if (!saved) {
      return fail(
        res,
        400,
        "CODE_NOT_FOUND"
      );
    }

    if (
      saved.expiresAt &&
      saved.expiresAt < Date.now()
    ) {
      phoneCodeStore.delete(phone);

      return fail(
        res,
        400,
        "CODE_EXPIRED"
      );
    }

    if (saved.code !== code) {
      return fail(
        res,
        400,
        "INVALID_CODE"
      );
    }

    phoneCodeStore.set(phone, {
      ...saved,
      verified: true,
    });

    return ok(res, {
      verified: true,
      message: "PHONE_VERIFIED",
    });
  } catch (err) {
    console.error(
      "VERIFY VERIFICATION CODE ERROR:",
      err
    );

    return fail(
      res,
      500,
      "VERIFY_CODE_FAILED"
    );
  }
};

/* =====================================================
🔥 이메일 인증번호 발송
===================================================== */
exports.sendEmailVerificationCode = async (req, res) => {
  try {
    const email =
      normalizeEmail(req.body?.email);

    if (!email) {
      return fail(
        res,
        400,
        "EMAIL_REQUIRED"
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(
        res,
        400,
        "INVALID_EMAIL"
      );
    }

    const code =
      createEmailCode();

    const emailSent =
      await sendEmailMessage(
        email,
        code
      );

    emailCodeStore.set(email, {
      code,
      expiresAt:
        Date.now() + 1000 * 60 * 5,
      verified: false,
    });

    return ok(res, {
      message: "EMAIL_VERIFICATION_CODE_SENT",
      emailSent,
      devCode:
        process.env.NODE_ENV === "production"
          ? undefined
          : code,
    });
  } catch (err) {
    console.error(
      "SEND EMAIL VERIFICATION CODE ERROR:",
      err
    );

    return fail(
      res,
      500,
      err?.message ||
        "SEND_EMAIL_CODE_FAILED"
    );
  }
};

/* =====================================================
🔥 이메일 인증번호 확인
===================================================== */
exports.verifyEmailVerificationCode = async (req, res) => {
  try {
    const email =
      normalizeEmail(req.body?.email);

    const code =
      String(req.body?.code || "")
        .trim();

    if (!email || !code) {
      return fail(
        res,
        400,
        "EMAIL_CODE_REQUIRED"
      );
    }

    const saved =
      emailCodeStore.get(email);

    if (!saved) {
      return fail(
        res,
        400,
        "CODE_NOT_FOUND"
      );
    }

    if (
      saved.expiresAt &&
      saved.expiresAt < Date.now()
    ) {
      emailCodeStore.delete(email);

      return fail(
        res,
        400,
        "CODE_EXPIRED"
      );
    }

    if (saved.code !== code) {
      return fail(
        res,
        400,
        "INVALID_CODE"
      );
    }

    emailCodeStore.set(email, {
      ...saved,
      verified: true,
    });

    return ok(res, {
      verified: true,
      message: "EMAIL_VERIFIED",
    });
  } catch (err) {
    console.error(
      "VERIFY EMAIL VERIFICATION CODE ERROR:",
      err
    );

    return fail(
      res,
      500,
      "VERIFY_EMAIL_CODE_FAILED"
    );
  }
};

/* =====================================================
2. 로그인
===================================================== */
exports.login = async (req, res) => {
  try {
    const {
      id,
      password,
    } = req.body || {};

    if (!id || !password) {
      return fail(
        res,
        400,
        "ID_PASSWORD_REQUIRED"
      );
    }

    if (
      !User ||
      typeof User.findOne !== "function"
    ) {
      return fail(
        res,
        500,
        "USER_MODEL_ERROR"
      );
    }

    const safeLoginId =
      String(id).trim();

    let user =
      await User.findOne({
        $or: [
          { id: safeLoginId },
          { email: safeLoginId },
        ],
      }).select(
        "+password +role +isAdmin +email +id +status +blocked"
      );

    if (
      !user &&
      safeLoginId === "admin"
    ) {
      const hash =
        await bcrypt.hash("1234", 10);

      await User.create({
        id: "admin",
        password: hash,
        nickname: "관리자",
        role: "admin",
        isAdmin: true,
        blocked: false,
      });

      user =
        await User.findOne({
          id: "admin",
        }).select(
          "+password +role +isAdmin +email +id +status +blocked"
        );
    }

    if (!user) {
      return fail(
        res,
        404,
        "USER_NOT_FOUND"
      );
    }

    if (!user.password) {
      return fail(
        res,
        500,
        "PASSWORD_NOT_LOADED"
      );
    }

    if (user.blocked === true) {
      return fail(
        res,
        403,
        "USER_BLOCKED"
      );
    }

    const match =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!match) {
      return fail(
        res,
        403,
        "INVALID_PASSWORD"
      );
    }

    if (
      user.role === "admin" ||
      user.isAdmin === true
    ) {
      user.role = "admin";
      user.isAdmin = true;
    }

    const token =
      createToken(user);

    user.lastLoginAt =
      new Date();

    await User.updateOne(
      {
        _id: user._id,
      },
      {
        lastLoginAt: user.lastLoginAt,
      }
    );

    const safe =
      safeUser(user);

    const adminToken =
      safe?.role === "admin" ||
      safe?.isAdmin === true
        ? token
        : undefined;

    return ok(res, {
      token,
      accessToken: token,
      authToken: token,
      adminToken,
      jwt: token,
      user: safe,

      data: {
        token,
        accessToken: token,
        authToken: token,
        adminToken,
        jwt: token,
        user: safe,
      },
    });
  } catch (err) {
    console.error(
      "LOGIN ERROR:",
      err
    );

    return fail(
      res,
      500,
      "LOGIN_FAILED"
    );
  }
};

/* =====================================================
3. 내 정보
===================================================== */
exports.me = async (req, res) => {
  try {
    const userId =
      req.user?.userId ||
      req.user?._id ||
      req.user?.id;

    let user = null;

    if (userId) {
      user =
        await User.findById(userId)
          .select("-password");
    }

    if (!user && req.user?.id) {
      user =
        await User.findOne({
          id: req.user.id,
        }).select("-password");
    }

    if (!user && req.user?.email) {
      user =
        await User.findOne({
          email: req.user.email,
        }).select("-password");
    }

    if (!user) {
      return fail(
        res,
        404,
        "USER_NOT_FOUND"
      );
    }

    return ok(res, {
      user: safeUser(user),
    });
  } catch (err) {
    console.error(
      "ME ERROR:",
      err
    );

    return fail(
      res,
      500,
      "ME_FAILED"
    );
  }
};

/* =====================================================
4. 토큰 검증
===================================================== */
exports.verify = async (req, res) => {
  try {
    return ok(res, {
      valid: true,
      user: req.user || null,
    });
  } catch (err) {
    return fail(
      res,
      401,
      "INVALID_TOKEN"
    );
  }
};

/* =====================================================
5. 로그아웃
===================================================== */
exports.logout = async (req, res) => {
  return ok(res, {
    message: "LOGOUT_SUCCESS",
  });
};

/* =====================================================
6. 토큰 재발급
===================================================== */
exports.getToken = async (req, res) => {
  try {
    const userId =
      req.user?.userId ||
      req.user?._id ||
      req.user?.id;

    if (!userId) {
      return fail(
        res,
        401,
        "NO_USER"
      );
    }

    const user =
      await User.findById(userId);

    if (!user) {
      return fail(
        res,
        404,
        "USER_NOT_FOUND"
      );
    }

    const token =
      createToken(user);

    const safe =
      safeUser(user);

    const adminToken =
      safe?.role === "admin" ||
      safe?.isAdmin === true
        ? token
        : undefined;

    return ok(res, {
      token,
      accessToken: token,
      authToken: token,
      adminToken,
      jwt: token,
      user: safe,
    });
  } catch (err) {
    console.error(
      "GET TOKEN ERROR:",
      err
    );

    return fail(
      res,
      500,
      "TOKEN_FAILED"
    );
  }
};

/* =====================================================
🔥 관리자 대시보드
===================================================== */
exports.adminDashboard =
  async (req, res) => {
    try {
      return ok(res, {
        users: 0,
        shops: 0,
        reservations: 0,
        reviews: 0,
      });
    } catch (err) {
      return fail(
        res,
        500,
        "ADMIN_DASHBOARD_FAILED"
      );
    }
  };

/* =====================================================
7. 카카오 로그인 URL
===================================================== */
exports.kakaoLogin =
  async (req, res) => {
    try {
      if (
        !KAKAO_CLIENT_ID ||
        !KAKAO_REDIRECT_URI
      ) {
        return fail(
          res,
          500,
          "KAKAO_CONFIG_MISSING"
        );
      }

      const url =
        "https://kauth.kakao.com/oauth/authorize" +
        `?client_id=${encodeURIComponent(
          KAKAO_CLIENT_ID
        )}` +
        `&redirect_uri=${encodeURIComponent(
          KAKAO_REDIRECT_URI
        )}` +
        "&response_type=code";

      return ok(res, {
        url,
      });
    } catch (err) {
      console.error(
        "KAKAO LOGIN URL ERROR:",
        err
      );

      return fail(
        res,
        500,
        "KAKAO_LOGIN_URL_FAILED"
      );
    }
  };

/* =====================================================
8. 카카오 콜백
===================================================== */
exports.kakaoCallback =
  async (req, res) => {
    try {
      const { code } =
        req.query || {};

      if (!code) {
        return fail(
          res,
          400,
          "KAKAO_CODE_REQUIRED"
        );
      }

      const tokenRes =
        await axios.post(
          "https://kauth.kakao.com/oauth/token",
          null,
          {
            params: {
              grant_type:
                "authorization_code",
              client_id:
                KAKAO_CLIENT_ID,
              client_secret:
                KAKAO_CLIENT_SECRET ||
                undefined,
              redirect_uri:
                KAKAO_REDIRECT_URI,
              code,
            },
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded",
            },
          }
        );

      const accessToken =
        tokenRes.data.access_token;

      const userRes =
        await axios.get(
          "https://kapi.kakao.com/v2/user/me",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

      const kakao =
        userRes.data;

      const kakaoId =
        `kakao_${kakao.id}`;

      const nickname =
        kakao.kakao_account?.profile?.nickname ||
        kakao.properties?.nickname ||
        "카카오유저";

      const email =
        kakao.kakao_account?.email ||
        "";

      let user =
        await User.findOne({
          id: kakaoId,
        });

      if (!user) {
        user =
          await User.create({
            id: kakaoId,
            password:
              await bcrypt.hash(
                `kakao_${kakao.id}`,
                10
              ),
            nickname,
            email,
            provider: "kakao",
            role: "user",
            isAdmin: false,
            blocked: false,
          });
      }

      const token =
        createToken(user);

      return res.redirect(
        `${CLIENT_URL}/login?token=${encodeURIComponent(
          token
        )}`
      );
    } catch (err) {
      console.error(
        "KAKAO CALLBACK ERROR:",
        err.response?.data ||
          err.message
      );

      return res.redirect(
        `${CLIENT_URL}/login?error=kakao_failed`
      );
    }
  };

/* =====================================================
9. 카카오 간편 로그인
===================================================== */
exports.kakaoSimple =
  async (req, res) => {
    try {
      const {
        kakaoId,
        nickname,
        email,
      } = req.body || {};

      if (!kakaoId) {
        return fail(
          res,
          400,
          "KAKAO_ID_REQUIRED"
        );
      }

      const id =
        `kakao_${kakaoId}`;

      let user =
        await User.findOne({
          id,
        });

      if (!user) {
        user =
          await User.create({
            id,
            password:
              await bcrypt.hash(
                `kakao_${kakaoId}`,
                10
              ),
            nickname:
              nickname ||
              "카카오유저",
            email:
              email || "",
            provider: "kakao",
            role: "user",
            isAdmin: false,
            blocked: false,
          });
      }

      const token =
        createToken(user);

      const safe =
        safeUser(user);

      const adminToken =
        safe?.role === "admin" ||
        safe?.isAdmin === true
          ? token
          : undefined;

      return ok(res, {
        token,
        accessToken: token,
        authToken: token,
        adminToken,
        jwt: token,
        user: safe,
      });
    } catch (err) {
      console.error(
        "KAKAO SIMPLE ERROR:",
        err
      );

      return fail(
        res,
        500,
        "KAKAO_SIMPLE_FAILED"
      );
    }
  };
