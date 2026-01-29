// ABOUTME: Shared brand logo component with gradient "N" icon and wordmark.
// ABOUTME: Used across landing, pulse, settings, and sign-in pages for consistent branding.

import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: { icon: 32, fontSize: "1rem", gap: 10 },
  md: { icon: 36, fontSize: "1.2rem", gap: 12 },
  lg: { icon: 40, fontSize: "1.4rem", gap: 12 },
};

export function BrandLogo({ href, size = "md" }: BrandLogoProps) {
  const { icon, fontSize, gap } = sizes[size];

  const content = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: `${gap}px`,
      }}
    >
      <div
        style={{
          width: `${icon}px`,
          height: `${icon}px`,
          borderRadius: "10px",
          background: "linear-gradient(135deg, #6366f1, #10b981)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: `${icon * 0.5}px`,
          color: "white",
          flexShrink: 0,
        }}
      >
        N
      </div>
      <span
        className="brand-wordmark"
        style={{
          fontSize,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        Nasdaq Pulse
      </span>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        {content}
      </Link>
    );
  }

  return content;
}
