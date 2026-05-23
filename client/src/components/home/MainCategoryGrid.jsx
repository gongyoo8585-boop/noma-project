import React from "react";

const CATEGORY_LIST = [
  {
    id: "massage",
    title: "마사지",
    subtitle: "프리미엄 힐링 & 케어",
    image:
      "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?q=80&w=1600&auto=format&fit=crop",
    fallbackImage:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1600&auto=format&fit=crop",
  },
  {
    id: "karaoke",
    title: "가라오케",
    subtitle: "럭셔리 프라이빗 룸",
    image:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1600&auto=format&fit=crop",
    fallbackImage:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1600&auto=format&fit=crop",
  },
];

function MainCategoryCard({ category }) {
  return (
    <div
      className="relative overflow-hidden rounded-[28px] cursor-pointer group"
      style={{
        height: "240px",
        minHeight: "240px",
        background: "#111111",
        border: "1px solid rgba(212,175,55,0.22)",
      }}
    >
      <img
        src={category.image}
        alt={category.title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        style={{
          objectFit: "cover",
          objectPosition: "center center",
        }}
        loading="lazy"
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = category.fallbackImage;
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.78) 100%)",
        }}
      />

      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <div
          className="inline-flex items-center w-fit px-3 py-1 rounded-full text-[11px] font-semibold mb-3"
          style={{
            background: "rgba(212,175,55,0.15)",
            color: "#f5d97b",
            border: "1px solid rgba(212,175,55,0.28)",
            backdropFilter: "blur(10px)",
          }}
        >
          NORA
        </div>

        <h2
          className="text-white text-2xl font-bold leading-tight"
          style={{
            textShadow: "0 3px 12px rgba(0,0,0,0.35)",
          }}
        >
          {category.title}
        </h2>

        <p
          className="mt-2 text-sm"
          style={{
            color: "rgba(255,255,255,0.82)",
          }}
        >
          {category.subtitle}
        </p>
      </div>
    </div>
  );
}

export default function MainCategoryGrid() {
  return (
    <section className="w-full px-4 md:px-6 mt-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CATEGORY_LIST.map((category) => (
          <MainCategoryCard key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}