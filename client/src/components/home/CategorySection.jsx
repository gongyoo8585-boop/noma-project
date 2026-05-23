import React from "react";

const CATEGORY_ITEMS = [
  {
    id: "massage",
    title: "마사지",
    subtitle: "프리미엄 힐링 케어",
    image:
      "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?q=80&w=1600&auto=format&fit=crop",
    fallbackImage:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1600&auto=format&fit=crop",
    overlay:
      "linear-gradient(180deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.82) 100%)",
  },
  {
    id: "karaoke",
    title: "가라오케",
    subtitle: "럭셔리 프라이빗 룸",
    image:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1600&auto=format&fit=crop",
    fallbackImage:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1600&auto=format&fit=crop",
    overlay:
      "linear-gradient(180deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.82) 100%)",
  },
];

function CategoryCard({ item }) {
  return (
    <button
      type="button"
      className="relative overflow-hidden rounded-3xl w-full group transition-all duration-300"
      style={{
        height: "260px",
        minHeight: "260px",
        backgroundColor: "#0f0f0f",
        border: "1px solid rgba(212,175,55,0.22)",
      }}
    >
      <div className="absolute inset-0">
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          style={{
            objectFit: "cover",
            objectPosition: "center center",
          }}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = item.fallbackImage;
          }}
        />
      </div>

      <div
        className="absolute inset-0"
        style={{
          background: item.overlay,
        }}
      />

      <div className="absolute inset-0 flex flex-col justify-end p-6 text-left">
        <div
          className="inline-flex items-center justify-center w-fit px-3 py-1 rounded-full text-xs font-semibold mb-3"
          style={{
            background: "rgba(212,175,55,0.18)",
            color: "#f5d97b",
            border: "1px solid rgba(212,175,55,0.35)",
            backdropFilter: "blur(6px)",
          }}
        >
          NORA
        </div>

        <h2
          className="text-2xl font-bold leading-tight"
          style={{
            color: "#ffffff",
            textShadow: "0 2px 10px rgba(0,0,0,0.45)",
          }}
        >
          {item.title}
        </h2>

        <p
          className="mt-2 text-sm"
          style={{
            color: "rgba(255,255,255,0.82)",
          }}
        >
          {item.subtitle}
        </p>
      </div>
    </button>
  );
}

export default function CategorySection() {
  return (
    <section className="w-full px-4 md:px-6 mt-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CATEGORY_ITEMS.map((item) => (
          <CategoryCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}