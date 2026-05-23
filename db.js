const mongoose = require("mongoose");

let isConnecting = false;
let isConnected = false;
let connectPromise = null;

/* ========================= */
/* 🔥 PATCH: close 콜백 호환 */
/* ========================= */
const __originalClose =
  mongoose.connection.close.bind(
    mongoose.connection
  );

mongoose.connection.close = function (...args) {
  if (typeof args[0] === "function") {
    return __originalClose().then(args[0]);
  }

  if (typeof args[1] === "function") {
    return __originalClose(args[0]).then(args[1]);
  }

  return __originalClose(...args);
};

/* ========================= */
/* 🔥 SAFE REQUIRE */
/* ========================= */
function safeRequire(path) {
  try {
    return require(path);
  } catch (e) {
    console.warn(
      "[DB SAFE REQUIRE FAIL]",
      path
    );

    return null;
  }
}

/* ========================= */
/* 🔥 DEFAULT SHOPS */
/* ========================= */
const DEFAULT_SHOPS = [
  {
    name: "노마 김해 본점",
    address: "경상남도 김해시 가야로",
    region: "경남",
    district: "김해시",
    phone: "010-0000-0001",
    virtualPhone: "0507-0000-0001",
    fakePhone: "0507-0000-0001",
    callNumber: "0507-0000-0001",
    businessHours: "24시간",
    openingHours: "24시간",
    hours: "24시간",
    description: "노마 마사지 플랫폼 등록 업체",
    category: "massage",
    lat: 35.2613,
    lng: 128.871,
    location: {
      lat: 35.2613,
      lng: 128.871,
    },
    geo: {
      type: "Point",
      coordinates: [128.871, 35.2613],
    },
    courses: ["스웨디시 60분", "아로마 90분"],
    price: [80000, 120000],
    priceOriginal: 120000,
    priceDiscount: 80000,
    status: "active",
    visible: true,
    approved: true,
    premium: true,
    isReservable: true,
    tags: ["노마", "마사지", "김해"],
    serviceTypes: ["스웨디시", "아로마"],
    images: [],
    photos: [],
    imageUrls: [],
  },
  {
    name: "노마 장유점",
    address: "경상남도 김해시 장유동",
    region: "경남",
    district: "김해시",
    phone: "010-0000-0002",
    virtualPhone: "0507-0000-0002",
    fakePhone: "0507-0000-0002",
    callNumber: "0507-0000-0002",
    businessHours: "10:00 - 03:00",
    openingHours: "10:00 - 03:00",
    hours: "10:00 - 03:00",
    description: "노마 마사지 플랫폼 등록 업체",
    category: "massage",
    lat: 35.2468,
    lng: 128.9021,
    location: {
      lat: 35.2468,
      lng: 128.9021,
    },
    geo: {
      type: "Point",
      coordinates: [128.9021, 35.2468],
    },
    courses: ["힐링 60분", "프리미엄 90분"],
    price: [70000, 110000],
    priceOriginal: 110000,
    priceDiscount: 70000,
    status: "active",
    visible: true,
    approved: true,
    premium: false,
    isReservable: true,
    tags: ["노마", "마사지", "장유"],
    serviceTypes: ["힐링", "프리미엄"],
    images: [],
    photos: [],
    imageUrls: [],
  },
];

/* ========================= */
/* 🔥 SHOP MODEL LOAD */
/* ========================= */
function getShopModel() {
  return (
    safeRequire("./server/models/Shop") ||
    safeRequire("../server/models/Shop") ||
    safeRequire("./models/Shop") ||
    safeRequire("../models/Shop")
  );
}

/* ========================= */
/* 🔥 SHOP SEED */
/* ========================= */
async function ensureDefaultShops() {
  try {
    if (
      mongoose.connection.readyState !== 1
    ) {
      console.warn(
        "⚠️ DB 연결 전 shops seed 차단"
      );

      return;
    }

    const Shop = getShopModel();

    if (
      !Shop ||
      typeof Shop.countDocuments !== "function"
    ) {
      console.warn("⚠️ Shop 모델 유효하지 않음");
      return;
    }

    const count = await Shop.countDocuments({});

    console.log("🟢 Shop documents:", count);

    if (count === 0) {
      await Shop.insertMany(DEFAULT_SHOPS, {
        ordered: false,
      });

      console.log("✅ 기본 업체 자동 생성 완료");
    }
  } catch (e) {
    console.error(
      "❌ 기본 업체 확인/생성 실패:",
      e.message
    );
  }
}

/* ========================= */
/* 🔥 CONNECT DB */
/* ========================= */
const connectDB = async () => {
  if (
    mongoose.connection.readyState === 1
  ) {
    isConnected = true;
    isConnecting = false;
    connectPromise = null;

    return mongoose.connection;
  }

  if (
    connectPromise
  ) {
    console.log(
      "🟡 MongoDB 기존 연결 대기중..."
    );

    await connectPromise;

    return mongoose.connection;
  }

  if (
    mongoose.connection.readyState === 2
  ) {
    console.log(
      "🟡 MongoDB 연결 진행중..."
    );

    connectPromise =
      mongoose.connection.asPromise();

    await connectPromise;

    connectPromise = null;

    return mongoose.connection;
  }

  if (isConnected) {
    return mongoose.connection;
  }

  try {
    isConnecting = true;

    let MONGO_URI =
      process.env.NODE_ENV === "production"
        ? process.env.MONGO_URI
        : process.env.MONGO_URI_DEV ||
          process.env.MONGO_URI;

    if (
      !MONGO_URI &&
      process.env.DATABASE_URL
    ) {
      MONGO_URI =
        process.env.DATABASE_URL;
    }

    if (
      !MONGO_URI &&
      process.env.MONGO_URL
    ) {
      MONGO_URI =
        process.env.MONGO_URL;
    }

    if (!MONGO_URI) {
      throw new Error(
        "MONGO_URI 환경변수 없음"
      );
    }

    MONGO_URI =
      String(MONGO_URI).trim();

    console.log(
      "🟡 Mongo URI Loaded:",
      MONGO_URI.includes(
        "mongodb+srv"
      )
        ? "mongodb+srv"
        : MONGO_URI
    );

    mongoose.set(
      "bufferCommands",
      false
    );

    mongoose.set(
      "strictQuery",
      false
    );

    connectPromise =
      mongoose.connect(
        MONGO_URI,
        {
          dbName:
            process.env.DB_NAME ||
            "mazzang",

          autoIndex: true,

          serverSelectionTimeoutMS: 10000,

          socketTimeoutMS: 45000,

          connectTimeoutMS: 10000,

          maxPoolSize: 10,

          minPoolSize: 1,

          retryWrites: true,

          bufferCommands: false,
        }
      );

    const conn =
      await connectPromise;

    connectPromise = null;

    isConnected = true;
    isConnecting = false;

    console.log(
      "✅ MongoDB 연결 성공:",
      conn.connection.host
    );

    try {
      const collections =
        await mongoose.connection.db
          .listCollections()
          .toArray();

      const hasShop = collections.some(
        (c) => c.name === "shops"
      );

      if (!hasShop) {
        console.warn(
          "⚠️ shops 컬렉션 없음 → 자동 생성 예정"
        );
      } else {
        console.log(
          "🟢 shops 컬렉션 확인됨"
        );
      }
    } catch (e) {
      console.warn(
        "⚠️ 컬렉션 확인 실패:",
        e.message
      );
    }

    if (
      mongoose.connection.readyState === 1
    ) {
      await ensureDefaultShops();
    }

    return conn;
  } catch (err) {
    connectPromise = null;
    isConnecting = false;
    isConnected = false;

    console.error(
      "❌ MongoDB 연결 실패:",
      err.message
    );

    /* 🔥 최소 수정: 재귀 폭주 방지 */
    setTimeout(async () => {
      try {
        if (
          !isConnected &&
          mongoose.connection.readyState !== 1 &&
          !connectPromise
        ) {
          await connectDB();
        }
      } catch (e) {
        console.error(
          "❌ RECONNECT ERROR:",
          e.message
        );
      }
    }, 5000);

    return null;
  }
};

/* ========================= */
/* 🔥 DB 연결 보장 */
/* ========================= */
async function ensureDBConnection() {
  if (
    mongoose.connection.readyState === 1
  ) {
    isConnected = true;
    isConnecting = false;

    return true;
  }

  await connectDB();

  const startedAt =
    Date.now();

  while (
    mongoose.connection.readyState !== 1
  ) {
    if (
      Date.now() - startedAt > 15000
    ) {
      return false;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 300)
    );
  }

  isConnected = true;
  isConnecting = false;

  return true;
}

/* ========================= */
/* 이벤트 */
/* ========================= */
mongoose.connection.on(
  "connected",
  () => {
    isConnected = true;
    isConnecting = false;
    connectPromise = null;

    console.log("📡 DB connected");
  }
);

mongoose.connection.on(
  "error",
  (err) => {
    isConnecting = false;
    connectPromise = null;

    console.error(
      "❌ DB error:",
      err.message
    );
  }
);

mongoose.connection.on(
  "disconnected",
  () => {
    console.warn(
      "⚠️ DB disconnected"
    );

    isConnected = false;
    isConnecting = false;
    connectPromise = null;
  }
);

/* ========================= */
/* 유틸 유지 */
/* ========================= */
function isDBConnected() {
  return (
    mongoose.connection
      .readyState === 1
  );
}

function getDBStatus() {
  const states = [
    "disconnected",
    "connected",
    "connecting",
    "disconnecting",
  ];

  return (
    states[
      mongoose.connection
        .readyState
    ] || "unknown"
  );
}

let connectedAt = null;

mongoose.connection.on(
  "connected",
  () => {
    connectedAt = Date.now();
  }
);

function getDBUptime() {
  if (!connectedAt) {
    return 0;
  }

  return (
    Date.now() - connectedAt
  );
}

/* 🔥 최소 추가: health util */
function getDBHealth() {
  return {
    ok:
      mongoose.connection.readyState === 1,
    state:
      mongoose.connection.readyState,
    status: getDBStatus(),
    uptime: getDBUptime(),
  };
}

/* ========================= */
/* graceful shutdown */
/* ========================= */
process.on(
  "SIGINT",
  async () => {
    console.log(
      "🛑 서버 종료 중..."
    );

    try {
      await mongoose.connection.close();
    } catch (e) {
      console.error(
        "❌ DB CLOSE ERROR:",
        e.message
      );
    }

    process.exit(0);
  }
);

/* ========================= */
/* debug */
/* ========================= */
if (
  process.env.NODE_ENV !==
  "production"
) {
  mongoose.set("debug", true);
}

/* ========================= */
/* export */
/* ========================= */
module.exports = {
  connectDB,
  ensureDBConnection,
  isDBConnected,
  getDBStatus,
  getDBUptime,
  getDBHealth,
};