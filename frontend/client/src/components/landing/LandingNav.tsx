import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const goLogin = () => navigate("/login");

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
      background: scrolled ? "rgba(5,6,8,0.94)" : "transparent",
      backdropFilter: scrolled ? "blur(16px)" : "none",
      WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
      transition: "background 0.3s, border-color 0.3s, backdrop-filter 0.3s",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Wordmark */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "0.12em", color: "#fff" }}
        >
          CAELYN
        </button>

        {/* Center nav — desktop */}
        <div style={{ display: "flex", gap: 36, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em" }} className="hidden md:flex">
          {(["about", "strategy", "pricing"] as const).map(id => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.52)", padding: "4px 0", transition: "color 0.2s", textTransform: "uppercase" }}
              onMouseOver={e => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
              onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.52)")}
            >
              {id}
            </button>
          ))}
        </div>

        {/* Right CTAs */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={goLogin}
            className="hidden sm:block"
            style={{ padding: "7px 16px", fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", color: "rgba(255,255,255,0.65)", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, cursor: "pointer", transition: "all 0.2s" }}
            onMouseOver={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)"; }}
            onMouseOut={e => { e.currentTarget.style.color = "rgba(255,255,255,0.65)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
          >
            LOG IN
          </button>
          <button
            onClick={goLogin}
            style={{ padding: "7px 18px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", color: "#050608", background: "hsl(200,85%,55%)", border: "none", borderRadius: 6, cursor: "pointer", transition: "opacity 0.2s" }}
            onMouseOver={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseOut={e => (e.currentTarget.style.opacity = "1")}
          >
            START FREE
          </button>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="md:hidden"
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer", padding: "6px 4px", fontSize: 18, lineHeight: 1 }}
            aria-label="Menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{ background: "rgba(5,6,8,0.98)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {(["about", "strategy", "pricing"] as const).map(id => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", textAlign: "left", fontSize: 14, letterSpacing: "0.08em", fontWeight: 500, textTransform: "uppercase", padding: 0 }}
            >
              {id}
            </button>
          ))}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
          <button onClick={goLogin} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", textAlign: "left", fontSize: 14, fontWeight: 600, letterSpacing: "0.06em", padding: 0 }}>LOG IN</button>
          <button onClick={goLogin} style={{ padding: "10px 20px", fontSize: 13, fontWeight: 700, letterSpacing: "0.07em", color: "#050608", background: "hsl(200,85%,55%)", border: "none", borderRadius: 6, cursor: "pointer" }}>START FREE</button>
        </div>
      )}
    </nav>
  );
}
