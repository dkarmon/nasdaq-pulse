// ABOUTME: Client-side Remotion Player wrapper for the hero video.
// ABOUTME: Shows static card on mobile for better performance.

"use client";

import { Player } from "@remotion/player";
import { HeroVideo, heroVideoConfig } from "./HeroVideo";
import { useEffect, useState } from "react";

// Static fallback for mobile - no heavy animations
const StaticHeroCard = () => {
  const stocks = [
    { symbol: "NVDA", price: "$142.56", change: "+24.3%", color: "#10b981" },
    { symbol: "META", price: "$612.89", change: "+18.7%", color: "#10b981" },
    { symbol: "SMCI", price: "$89.34", change: "+31.2%", color: "#10b981" },
    { symbol: "AVGO", price: "$234.12", change: "+15.8%", color: "#10b981" },
  ];

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "500px",
        background: "linear-gradient(145deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
        borderRadius: "24px",
        padding: "32px",
        boxShadow: "0 40px 80px rgba(0, 0, 0, 0.5), 0 0 80px rgba(99, 102, 241, 0.1)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <div
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: "#10b981",
            boxShadow: "0 0 12px #10b981",
          }}
        />
        <span style={{ color: "#10b981", fontWeight: 600, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Live Market Data
        </span>
      </div>

      <h3 style={{ fontSize: "20px", fontWeight: 700, color: "white", marginBottom: "6px" }}>
        Top Performers Today
      </h3>
      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "20px" }}>
        NASDAQ 100 • Sorted by monthly growth
      </p>

      {/* Stock list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {stocks.map((stock) => (
          <div
            key={stock.symbol}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: `linear-gradient(135deg, ${stock.color}, #059669)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "11px",
                  color: "white",
                }}
              >
                {stock.symbol.slice(0, 2)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "white" }}>{stock.symbol}</div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{stock.price}</div>
              </div>
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "15px",
                color: stock.color,
                fontFamily: "monospace",
              }}
            >
              {stock.change}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const HeroVideoPlayer = () => {
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!isClient) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          aspectRatio: "1",
          background: "linear-gradient(145deg, #0f172a, #1e1b4b)",
          borderRadius: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.3)",
        }}
      >
        Loading...
      </div>
    );
  }

  // Show static card on mobile for better performance
  if (isMobile) {
    return <StaticHeroCard />;
  }

  // Full Remotion player on desktop
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "500px",
        borderRadius: "24px",
        overflow: "hidden",
        boxShadow: "0 40px 80px rgba(0, 0, 0, 0.5), 0 0 120px rgba(99, 102, 241, 0.1)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <Player
        component={HeroVideo}
        durationInFrames={heroVideoConfig.durationInFrames}
        fps={heroVideoConfig.fps}
        compositionWidth={heroVideoConfig.width}
        compositionHeight={heroVideoConfig.height}
        style={{
          width: "100%",
          aspectRatio: "1",
        }}
        autoPlay
        loop
        controls={false}
      />
    </div>
  );
};
