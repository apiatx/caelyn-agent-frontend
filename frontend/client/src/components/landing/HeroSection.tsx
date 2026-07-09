import { useLocation } from "wouter";
import ProductPreview from "./ProductPreview";

export default function HeroSection() {
  const [, navigate] = useLocation();

  const scrollToSignal = () => {
    document.getElementById("signal")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section style={{ position: "relative", paddingTop: 140, paddingBottom: 100, overflow: "hidden" }}>
      {/* Subtle grid texture */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 100%)",
      }} />
      {/* Glow orb */}
      <div aria-hidden style={{
        position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)",
        width: 700, height: 400, borderRadius: "50%",
        background: "radial-gradient(ellipse, hsla(200,85%,55%,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", position: "relative" }}>
        {/* Label */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", color: "hsl(200,85%,55%)", textTransform: "uppercase", border: "1px solid rgba(41,189,232,0.22)", borderRadius: 4, padding: "4px 10px", background: "rgba(41,189,232,0.06)" }}>
            Market Intelligence Platform
          </span>
        </div>

        {/* Headline — div, not h1, to avoid global mobile font-size override */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: "clamp(2.6rem, 5.5vw, 4.6rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.02em", color: "#fff" }}>
            See the market
          </div>
          <div style={{ fontSize: "clamp(2.6rem, 5.5vw, 4.6rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.02em", color: "#fff" }}>
            as a system.
          </div>
        </div>

        {/* Supporting copy */}
        <div style={{ textAlign: "center", maxWidth: 580, margin: "0 auto 14px" }}>
          <div style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)", color: "rgba(255,255,255,0.55)", fontWeight: 400, letterSpacing: "0.01em" }}>
            Themes. Flows. Catalysts. Fundamentals. Social intelligence. Your portfolio.
          </div>
        </div>
        <div style={{ textAlign: "center", maxWidth: 520, margin: "0 auto 40px" }}>
          <div style={{ fontSize: "clamp(0.875rem, 1.5vw, 1rem)", color: "rgba(255,255,255,0.38)", lineHeight: 1.65 }}>
            Caelyn connects the signals investors normally analyze in isolation — and helps you understand what actually matters now.
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
          <button
            onClick={() => navigate("/login")}
            style={{ padding: "13px 28px", fontSize: 13, fontWeight: 700, letterSpacing: "0.07em", color: "#050608", background: "hsl(200,85%,55%)", border: "none", borderRadius: 7, cursor: "pointer", transition: "opacity 0.2s, transform 0.2s" }}
            onMouseOver={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseOut={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = ""; }}
          >
            START FREE
          </button>
          <button
            onClick={scrollToSignal}
            style={{ padding: "13px 28px", fontSize: 13, fontWeight: 600, letterSpacing: "0.07em", color: "rgba(255,255,255,0.72)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, cursor: "pointer", transition: "all 0.2s" }}
            onMouseOver={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.24)"; e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
            onMouseOut={e => { e.currentTarget.style.color = "rgba(255,255,255,0.72)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          >
            EXPLORE THE PLATFORM
          </button>
        </div>

        {/* Microcopy */}
        <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 72, letterSpacing: "0.04em" }}>
          Built for investors who want more than another stock screener.
        </div>

        {/* Product preview */}
        <ProductPreview />
      </div>
    </section>
  );
}
