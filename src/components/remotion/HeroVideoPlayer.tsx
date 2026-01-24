// ABOUTME: Client-side Remotion Player wrapper for the hero video.
// ABOUTME: Handles dynamic import and player sizing.

"use client";

import { Player } from "@remotion/player";
import { HeroVideo, heroVideoConfig } from "./HeroVideo";
import { useEffect, useState } from "react";

export const HeroVideoPlayer = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // SSR placeholder
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
