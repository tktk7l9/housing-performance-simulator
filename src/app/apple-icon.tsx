import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)",
          borderRadius: "40px",
        }}
      >
        <svg viewBox="0 0 180 180" width="180" height="180">
          <path
            d="M40 92 L90 38 L140 92 L140 142 L40 142 Z"
            fill="none"
            stroke="#ffffff"
            strokeWidth="9"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <polyline
            points="58,128 74,110 90,120 106,92 122,108 134,98"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
