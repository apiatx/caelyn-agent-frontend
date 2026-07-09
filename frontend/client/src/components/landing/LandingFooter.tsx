const BORDER = "rgba(255,255,255,0.07)";

export default function LandingFooter() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer style={{ borderTop: `1px solid ${BORDER}`, padding: "56px 24px 40px", background: "rgba(4,5,8,0.6)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* Top row */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 32, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.12em", color: "#fff", marginBottom: 8 }}>CAELYN</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em", maxWidth: 280, lineHeight: 1.5 }}>
              Intelligence infrastructure for self-directed investors.
            </div>
          </div>

          {/* Nav links */}
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            {[
              { label: "About", id: "about" },
              { label: "Strategy", id: "strategy" },
              { label: "Pricing", id: "pricing" },
            ].map(({ label, id }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.38)", fontSize: 12, letterSpacing: "0.07em", fontWeight: 500, padding: 0, transition: "color 0.2s" }}
                onMouseOver={e => (e.currentTarget.style.color = "rgba(255,255,255,0.72)")}
                onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.38)")}
              >
                {label.toUpperCase()}
              </button>
            ))}
            <button
              onClick={() => window.location.href = "/login"}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.38)", fontSize: 12, letterSpacing: "0.07em", fontWeight: 500, padding: 0, transition: "color 0.2s" }}
              onMouseOver={e => (e.currentTarget.style.color = "rgba(255,255,255,0.72)")}
              onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.38)")}
            >
              LOG IN
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: BORDER, marginBottom: 28 }} />

        {/* Disclaimer */}
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", lineHeight: 1.7, maxWidth: 680, marginBottom: 20 }}>
          Caelyn provides market data, research tools and analytical software for informational purposes. It does not provide personalized investment advice. Past performance of any market, sector or signal is not indicative of future results. Users are responsible for their own investment decisions.
        </div>

        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", letterSpacing: "0.04em" }}>
          © {new Date().getFullYear()} Caelyn. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
