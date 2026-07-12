import { useLocation } from "wouter";

const ICE = "hsl(200,85%,55%)";
const BORDER = "rgba(255,255,255,0.07)";

export default function FinalCTA() {
  const [, navigate] = useLocation();

  return (
    <section style={{ padding: "120px 24px", borderTop: `1px solid ${BORDER}`, position: "relative", overflow: "hidden" }}>
      {/* Glow */}
      <div aria-hidden style={{ position: "absolute", bottom: -100, left: "50%", transform: "translateX(-50%)", width: 600, height: 300, borderRadius: "50%", background: `radial-gradient(ellipse, hsla(200,85%,55%,0.06), transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ maxWidth: 1280, margin: "0 auto", textAlign: "center", position: "relative" }}>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)", fontWeight: 700, letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.12 }}>
            Stop crossing the wires manually.
          </div>
        </div>

        <div style={{ fontSize: "clamp(0.95rem, 1.6vw, 1.1rem)", color: "rgba(255,255,255,0.42)", marginBottom: 48, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 48px" }}>
          Caelyn brings the signals together so you can see when the market, the setup and your process start to align.
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
          <button
            onClick={() => navigate("/login")}
            style={{ padding: "14px 36px", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: "#050608", background: ICE, border: "none", borderRadius: 7, cursor: "pointer", transition: "opacity 0.2s, transform 0.2s" }}
            onMouseOver={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseOut={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = ""; }}
          >
            START FREE
          </button>
          <button
            onClick={() => navigate("/login")}
            style={{ padding: "14px 32px", fontSize: 13, fontWeight: 600, letterSpacing: "0.07em", color: "rgba(255,255,255,0.62)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, cursor: "pointer", transition: "all 0.2s" }}
            onMouseOver={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.24)"; }}
            onMouseOut={e => { e.currentTarget.style.color = "rgba(255,255,255,0.62)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
          >
            LOG IN
          </button>
        </div>

        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.24)", letterSpacing: "0.05em" }}>
          No credit card required.
        </div>
      </div>
    </section>
  );
}
