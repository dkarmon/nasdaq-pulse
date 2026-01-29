// ABOUTME: Client component for the landing page with Framer Motion animations.
// ABOUTME: Stripe-inspired design with bold gradients and modern aesthetics.

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LogIn, TrendingUp, Zap, Target } from "lucide-react";
import { HeroVideoPlayer } from "@/components/remotion/HeroVideoPlayer";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { BrandLogo } from "@/components/brand-logo";
import type { Locale } from "@/lib/i18n";

type LandingClientProps = {
  locale: Locale;
  dict: Record<string, any>;
  rtl: boolean;
};

// Animation variants - optimized for performance
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

export function LandingClient({ locale, dict, rtl }: LandingClientProps) {
  return (
    <div
      className="landing-page"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0a0a0f 0%, #0f172a 50%, #0a0a0f 100%)",
        color: "white",
        overflowX: "hidden",
      }}
      dir={rtl ? "rtl" : "ltr"}
    >
      {/* Static background gradients - CSS animations for better performance */}
      <div className="bg-gradients" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div
          className="bg-orb bg-orb-1"
          style={{
            position: "absolute",
            top: "-30%",
            right: "-20%",
            width: "80%",
            height: "80%",
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 60%)",
            filter: "blur(80px)",
            willChange: "transform",
          }}
        />
        <div
          className="bg-orb bg-orb-2"
          style={{
            position: "absolute",
            bottom: "-20%",
            left: "-20%",
            width: "70%",
            height: "70%",
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 60%)",
            filter: "blur(80px)",
            willChange: "transform",
          }}
        />
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "rgba(10, 10, 15, 0.8)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <motion.div whileHover={{ scale: 1.02 }}>
            <BrandLogo />
          </motion.div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <LocaleSwitcher locale={locale} />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Link
                href={`/${locale}/signin`}
                className="nav-signin"
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  color: "white",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  transition: "all 200ms",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span className="nav-signin-text">{dict.nav?.signIn || "Sign In"}</span>
                <LogIn className="nav-signin-icon" size={20} style={{ display: "none" }} />
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section
        style={{
          minHeight: "auto",
          display: "flex",
          alignItems: "center",
          padding: "140px 24px 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          className="hero-grid"
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            width: "100%",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "80px",
            alignItems: "center",
          }}
        >
          {/* Hero Content */}
          <motion.div
            className="hero-content"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            style={{ display: "flex", flexDirection: "column", gap: "24px" }}
          >
            <motion.div
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 16px",
                background: "rgba(16, 185, 129, 0.1)",
                borderRadius: "100px",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                width: "fit-content",
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 12px #10b981",
                }}
              />
              <span style={{ color: "#10b981", fontWeight: 600, fontSize: "14px" }}>
                {dict.landing?.liveMarketData || "Live Market Data"}
              </span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
              style={{
                fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                margin: 0,
              }}
            >
              {dict.landing?.heroTitle1 || "Spot the winners"}
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #6366f1 0%, #10b981 50%, #6366f1 100%)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {dict.landing?.heroTitle2 || "before the crowd"}
              </span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
              style={{
                fontSize: "1.25rem",
                lineHeight: 1.7,
                color: "rgba(255, 255, 255, 0.6)",
                maxWidth: "500px",
                margin: 0,
              }}
            >
              {dict.landing?.heroSubtitle || "Track NASDAQ's fastest-growing stocks in real-time. Sort by 1-month, 6-month, or yearly growth. Simple, fast, no fluff."}
            </motion.p>

            <motion.div
              className="cta-buttons"
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
              style={{ paddingTop: "16px", display: "flex", gap: "16px", flexWrap: "wrap" }}
            >
              <motion.div
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href={`/${locale}/signin`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "18px 36px",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "white",
                    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                    borderRadius: "14px",
                    boxShadow: "0 8px 32px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                    transition: "all 200ms",
                  }}
                >
                  {dict.landing?.startTracking || "Start Tracking"}
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="#features"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "18px 32px",
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "rgba(255, 255, 255, 0.8)",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "14px",
                    transition: "all 200ms",
                  }}
                >
                  {dict.landing?.learnMore || "Learn More"}
                </Link>
              </motion.div>
            </motion.div>

            {/* Social proof */}
            <motion.div
              className="stats-row"
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "24px",
                paddingTop: "24px",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                marginTop: "16px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#10b981" }}>100+</div>
                <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)" }}>{dict.landing?.stocksTracked || "Stocks tracked"}</div>
              </div>
              <div style={{ width: "1px", height: "40px", background: "rgba(255,255,255,0.1)" }} />
              <div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#6366f1" }}>60s</div>
                <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)" }}>{dict.landing?.refreshRate || "Refresh rate"}</div>
              </div>
              <div style={{ width: "1px", height: "40px", background: "rgba(255,255,255,0.1)" }} />
              <div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#f59e0b" }}>Free</div>
                <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)" }}>{dict.landing?.alwaysFree || "Always"}</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Hero Visual - Remotion Video */}
          <motion.div
            className="hero-video-wrapper"
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <HeroVideoPlayer />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        style={{
          padding: "80px 24px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: "center", marginBottom: "48px" }}
          >
            <h2
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 800,
                marginBottom: "16px",
                letterSpacing: "-0.02em",
              }}
            >
              {dict.landing?.everythingYouNeed || "Everything you need."}
              <br />
              <span style={{ color: "rgba(255,255,255,0.5)" }}>{dict.landing?.nothingYouDont || "Nothing you don't."}</span>
            </h2>
            <p style={{ fontSize: "1.2rem", color: "rgba(255,255,255,0.5)", maxWidth: "600px", margin: "0 auto" }}>
              {dict.landing?.featuresSubtitle || "No complicated charts. No paid tiers. Just the data that matters."}
            </p>
          </motion.div>

          <motion.div
            className="features-grid"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "24px",
            }}
          >
            {[
              {
                icon: <TrendingUp size={48} className="text-emerald-500" />,
                title: dict.landing?.growthRankings || "Growth Rankings",
                description: dict.landing?.growthRankingsDesc || "See which stocks are actually growing. Sort by 1-month, 6-month, or 12-month performance instantly.",
                gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.02))",
                borderColor: "rgba(16, 185, 129, 0.2)",
              },
              {
                icon: <Zap size={48} className="text-indigo-500" />,
                title: dict.landing?.realTimeUpdates || "Real-Time Updates",
                description: dict.landing?.realTimeUpdatesDesc || "Fresh data every 60 seconds. Know what's moving right now, not what moved yesterday.",
                gradient: "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.02))",
                borderColor: "rgba(99, 102, 241, 0.2)",
              },
              {
                icon: <Target size={48} className="text-amber-500" />,
                title: dict.landing?.zeroNoise || "Zero Noise",
                description: dict.landing?.zeroNoiseDesc || "No ads. No premium upsells. No \"analysts picks\". Just clean data and fast loading.",
                gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.02))",
                borderColor: "rgba(245, 158, 11, 0.2)",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                transition={{ duration: 0.5 }}
                whileHover={{ y: -8, scale: 1.02 }}
                style={{
                  padding: "40px 32px",
                  background: feature.gradient,
                  border: `1px solid ${feature.borderColor}`,
                  borderRadius: "20px",
                  transition: "all 300ms ease",
                }}
              >
                <motion.div
                  initial={{ scale: 1 }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  style={{ fontSize: "3rem", marginBottom: "20px" }}
                >
                  {feature.icon}
                </motion.div>
                <h3 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: "1rem", lineHeight: 1.7, color: "rgba(255,255,255,0.6)", margin: 0 }}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: "80px 24px", position: "relative", zIndex: 2 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            textAlign: "center",
            padding: "80px 48px",
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(16, 185, 129, 0.05))",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "32px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Glow effect */}
          <div
            style={{
              position: "absolute",
              top: "-50%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "200%",
              height: "200%",
              background: "radial-gradient(circle at center, rgba(99, 102, 241, 0.15) 0%, transparent 50%)",
              pointerEvents: "none",
            }}
          />

          <motion.h2
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 800,
              marginBottom: "16px",
              position: "relative",
            }}
          >
            {dict.landing?.ctaTitle || "Ready to find your next winner?"}
          </motion.h2>
          <p
            style={{
              fontSize: "1.2rem",
              color: "rgba(255,255,255,0.6)",
              marginBottom: "32px",
              position: "relative",
            }}
          >
            {dict.landing?.ctaSubtitle || "Join now. It takes 10 seconds with Google."}
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={`/${locale}/signin`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "12px",
                padding: "20px 48px",
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "white",
                background: "linear-gradient(135deg, #10b981, #059669)",
                borderRadius: "16px",
                boxShadow: "0 12px 40px rgba(16, 185, 129, 0.4)",
                position: "relative",
              }}
            >
              {dict.landing?.getStartedFree || "Get Started Free"}
              <span>→</span>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "32px 24px",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <p style={{ color: "rgba(255, 255, 255, 0.4)", margin: 0 }}>
          © 2026 Nasdaq Pulse
        </p>
      </footer>

      {/* Responsive styles */}
      <style jsx global>{`
        /* GPU-accelerated background animations */
        @keyframes float1 {
          0%, 100% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.1) translate(2%, 2%); }
        }
        @keyframes float2 {
          0%, 100% { transform: scale(1.1) translate(0, 0); }
          50% { transform: scale(1) translate(-2%, -2%); }
        }
        .bg-orb {
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        .bg-orb-1 {
          animation: float1 12s infinite;
        }
        .bg-orb-2 {
          animation: float2 15s infinite;
        }
        
        /* Disable animations for users who prefer reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .bg-orb {
            animation: none !important;
          }
          * {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
        
        @media (max-width: 900px) {
          .landing-page .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
          .landing-page .hero-video-wrapper {
            order: -1;
          }
          .landing-page .hero-content {
            text-align: center;
            align-items: center;
          }
          .landing-page .features-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .landing-page .stats-row {
            justify-content: center;
          }
          /* Simpler background on mobile */
          .bg-orb {
            filter: blur(60px) !important;
            animation: none !important;
            opacity: 0.5;
          }
        }
        @media (max-width: 480px) {
          .landing-page .hero-content h1 {
            font-size: 2rem !important;
          }
          .landing-page .cta-buttons {
            flex-direction: column;
            width: 100%;
          }
          .landing-page .cta-buttons a {
            width: 100%;
            justify-content: center;
          }
          .nav-signin-text {
            display: none !important;
          }
          .nav-signin-icon {
            display: block !important;
          }
          .nav-signin {
            padding: 10px 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
