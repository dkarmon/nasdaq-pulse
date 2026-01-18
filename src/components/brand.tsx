type BrandProps = {
  tagline?: string;
};

export function Brand({ tagline }: BrandProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: "12px",
          background:
            "linear-gradient(135deg, rgba(16,185,129,0.9), rgba(125,211,252,0.9))",
          display: "grid",
          placeItems: "center",
          boxShadow: "0 10px 30px rgba(16,185,129,0.35)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
        aria-hidden
      >
        <span
          className="numeric"
          style={{ color: "#0f172a", fontWeight: 800, fontSize: "1.1rem" }}
        >
          NP
        </span>
      </div>
      <div>
        <div
          className="numeric"
          style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "0.04em" }}
        >
          Nasdaq Pulse
        </div>
        {tagline ? (
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {tagline}
          </div>
        ) : null}
      </div>
    </div>
  );
}
