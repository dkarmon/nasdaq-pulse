// ABOUTME: Remotion composition for the landing page hero video.
// ABOUTME: Animated stock ticker and chart visualization.

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring, Easing } from "remotion";

// Animated stock row component
const StockRow = ({ 
  symbol, 
  price, 
  change, 
  delay 
}: { 
  symbol: string; 
  price: string; 
  change: string; 
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const slideIn = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 80 },
  });
  
  const opacity = interpolate(frame - delay, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isPositive = change.startsWith("+");
  
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 24px",
        marginBottom: "8px",
        background: "rgba(255, 255, 255, 0.03)",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        transform: `translateX(${interpolate(slideIn, [0, 1], [100, 0])}px)`,
        opacity,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: `linear-gradient(135deg, ${isPositive ? "#10b981" : "#ef4444"}, ${isPositive ? "#059669" : "#dc2626"})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "14px",
            color: "white",
          }}
        >
          {symbol.slice(0, 2)}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "18px", color: "white" }}>{symbol}</div>
          <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>${price}</div>
        </div>
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: "20px",
          color: isPositive ? "#10b981" : "#ef4444",
          fontFamily: "monospace",
        }}
      >
        {change}
      </div>
    </div>
  );
};

// Animated line chart
const MiniChart = ({ delay, color }: { delay: number; color: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 40 },
  });
  
  // Generate a rising chart path
  const points = [
    { x: 0, y: 70 },
    { x: 20, y: 60 },
    { x: 40, y: 65 },
    { x: 60, y: 45 },
    { x: 80, y: 50 },
    { x: 100, y: 35 },
    { x: 120, y: 40 },
    { x: 140, y: 25 },
    { x: 160, y: 30 },
    { x: 180, y: 15 },
    { x: 200, y: 20 },
  ];
  
  const pathData = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
    
  const pathLength = 400; // Approximate
  const dashOffset = interpolate(progress, [0, 1], [pathLength, 0]);
  
  return (
    <svg width="200" height="80" viewBox="0 0 200 80">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path
        d={`${pathData} L 200 80 L 0 80 Z`}
        fill={`url(#gradient-${color})`}
        opacity={progress}
      />
      {/* Line */}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={pathLength}
        strokeDashoffset={dashOffset}
      />
      {/* Glowing dot at end */}
      <circle
        cx="200"
        cy="20"
        r={interpolate(progress, [0.8, 1], [0, 6], { extrapolateLeft: "clamp" })}
        fill={color}
      />
      <circle
        cx="200"
        cy="20"
        r={interpolate(progress, [0.8, 1], [0, 12], { extrapolateLeft: "clamp" })}
        fill={color}
        opacity="0.3"
      />
    </svg>
  );
};

// Main composition
export const HeroVideo = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  
  const headerSlide = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 60 },
  });
  
  const stocks = [
    { symbol: "NVDA", price: "142.56", change: "+24.3%" },
    { symbol: "META", price: "612.89", change: "+18.7%" },
    { symbol: "SMCI", price: "89.34", change: "+31.2%" },
    { symbol: "AVGO", price: "234.12", change: "+15.8%" },
  ];

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(145deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "40px",
        overflow: "hidden",
      }}
    >
      {/* Animated gradient orbs */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "60%",
          height: "60%",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
          transform: `scale(${interpolate(frame, [0, 60], [0.8, 1.2])})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          left: "-10%",
          width: "50%",
          height: "50%",
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
          transform: `scale(${interpolate(frame, [0, 60], [1.2, 0.9])})`,
        }}
      />
      
      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, opacity: fadeIn }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "32px",
            transform: `translateY(${interpolate(headerSlide, [0, 1], [-30, 0])}px)`,
          }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 20px #10b981",
            }}
          />
          <span style={{ color: "#10b981", fontWeight: 600, fontSize: "14px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Live Market Data
          </span>
        </div>
        
        {/* Title */}
        <h2
          style={{
            fontSize: "28px",
            fontWeight: 800,
            color: "white",
            marginBottom: "8px",
            transform: `translateY(${interpolate(headerSlide, [0, 1], [-20, 0])}px)`,
          }}
        >
          Top Performers Today
        </h2>
        <p
          style={{
            fontSize: "16px",
            color: "rgba(255,255,255,0.5)",
            marginBottom: "24px",
          }}
        >
          NASDAQ 100 • Sorted by monthly growth
        </p>
        
        {/* Stock list */}
        <div style={{ marginBottom: "32px" }}>
          {stocks.map((stock, i) => (
            <StockRow
              key={stock.symbol}
              symbol={stock.symbol}
              price={stock.price}
              change={stock.change}
              delay={20 + i * 8}
            />
          ))}
        </div>
        
        {/* Charts row */}
        <div style={{ display: "flex", gap: "24px", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <MiniChart delay={60} color="#10b981" />
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginTop: "8px" }}>1M Growth</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <MiniChart delay={70} color="#6366f1" />
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginTop: "8px" }}>6M Growth</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <MiniChart delay={80} color="#f59e0b" />
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginTop: "8px" }}>12M Growth</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Remotion config
export const heroVideoConfig = {
  id: "HeroVideo",
  component: HeroVideo,
  durationInFrames: 150,
  fps: 30,
  width: 500,
  height: 500,
};
