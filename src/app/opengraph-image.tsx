import { ImageResponse } from "next/og";

export const alt = "住宅性能シミュレーター — 30年でどちらが得か、数字で確かめる。";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "linear-gradient(135deg, #f8fafc 0%, #e0e7ff 60%, #c7d2fe 100%)",
          position: "relative",
        }}
      >
        {/* Soft blob */}
        <div
          style={{
            position: "absolute",
            top: "-160px",
            right: "-160px",
            width: "640px",
            height: "640px",
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(37,99,235,0.25) 0%, rgba(37,99,235,0) 70%)",
            display: "flex",
          }}
        />

        {/* Pill + icon row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {/* Icon mark */}
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #1d4ed8, #1e3a8a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg viewBox="0 0 32 32" width="44" height="44">
              <path
                d="M6 15.5 L16 6 L26 15.5 L26 26 H6 Z"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.4"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <polyline
                points="10,22 13,19 16,20.5 19,17 22,18.5"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div
            style={{
              display: "flex",
              padding: "10px 18px",
              borderRadius: "9999px",
              background: "rgba(30,58,138,0.08)",
              color: "#1e3a8a",
              fontSize: "20px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              fontFamily: "monospace",
            }}
          >
            HOUSING PERFORMANCE / SIMULATOR
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "92px",
            fontWeight: 800,
            color: "#0f172a",
            letterSpacing: "-2px",
            lineHeight: 1.08,
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            marginBottom: "32px",
          }}
        >
          <span>30年でどちらが得か、</span>
          <span style={{ color: "#1d4ed8", display: "flex" }}>数字で確かめる。</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "26px",
            color: "rgba(15,23,42,0.6)",
            lineHeight: 1.5,
            maxWidth: "900px",
            display: "flex",
          }}
        >
          断熱・気密・太陽光・蓄電池の選択を、初期費用と長期ランニングコストの両面から中立的に比較。
        </div>

        {/* Badges */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginTop: "40px",
          }}
        >
          {["登録不要", "計算根拠を全公開", "PDF / URL 共有"].map((b) => (
            <div
              key={b}
              style={{
                display: "flex",
                background: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(30,58,138,0.18)",
                borderRadius: "100px",
                padding: "10px 22px",
                color: "#1e3a8a",
                fontSize: "20px",
                fontWeight: 600,
              }}
            >
              {b}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
