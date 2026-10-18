import { ImageResponse } from "next/og";

export const alt = "MemeMe: turn your pet into a sticker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function Blob({ x, y, s, r, fill, label }: { x: number; y: number; s: number; r: number; fill: string; label: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: s,
        height: s,
        transform: `rotate(${r}deg)`,
        background: "#fff",
        borderRadius: "46% 54% 48% 52% / 52% 46% 54% 48%",
        boxShadow: "0 10px 0 rgba(28,26,58,.12), 0 18px 36px rgba(28,26,58,.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: fill,
          borderRadius: "46% 54% 48% 52% / 52% 46% 54% 48%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#1C1A3A",
          fontSize: s / 5.5,
          fontWeight: 800,
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#EEF0FF",
          backgroundImage: "radial-gradient(rgba(28,26,58,.07) 2px, transparent 2px)",
          backgroundSize: "28px 28px",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 80px", width: 640 }}>
          <div style={{ fontSize: 120, fontWeight: 800, color: "#1C1A3A", letterSpacing: -4, lineHeight: 1 }}>MemeMe</div>
          <div style={{ fontSize: 40, color: "#1C1A3A", marginTop: 24, lineHeight: 1.2 }}>Turn your pet into a sticker.</div>
          <div style={{ fontSize: 26, color: "#5F5C8A", marginTop: 20 }}>AI meme stickers in about 20 seconds. No photos stored.</div>
        </div>
        <Blob x={700} y={60} s={250} r={-6} fill="#FF4F9A" label="LOL" />
        <Blob x={930} y={150} s={210} r={8} fill="#FFD23F" label="hi bestie" />
        <Blob x={740} y={330} s={230} r={4} fill="#2ED3A1" label="this is fine" />
      </div>
    ),
    size,
  );
}
