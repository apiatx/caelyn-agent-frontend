import type { ReactNode, CSSProperties } from "react";

const ICE = "hsl(200,85%,55%)";
const DIM = "rgba(255,255,255,0.38)";
const SURFACE = "rgba(8,10,16,0.85)";
const BORDER = "rgba(255,255,255,0.08)";

function MiniCard({ label, children, style }: { label: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      background: SURFACE,
      border: `1px solid ${BORDER}`,
      borderRadius: 10,
      padding: "14px 16px",
      backdropFilter: "blur(12px)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.5)",
      ...style,
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: DIM, marginBottom: 10, textTransform: "uppercase" }}>{label}</div>
      {children}
    </div>
  );
}

function FlowBar({ ratio }: { ratio: number }) {
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginTop: 6 }}>
      <div style={{ height: "100%", width: `${ratio * 100}%`, background: "linear-gradient(90deg, hsl(160,65%,42%), hsl(200,85%,55%))", borderRadius: 2, transition: "width 0.6s" }} />
    </div>
  );
}

export default function ProductPreview() {
  return (
    <>
      <style>{`
        @keyframes caelyPreviewFloat {
          0%, 100% { transform: perspective(1400px) rotateX(2.5deg) translateY(0px); }
          50%        { transform: perspective(1400px) rotateX(2.5deg) translateY(-7px); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .caelyn-preview { animation: caelyPreviewFloat 7s ease-in-out infinite; }
        }
      `}</style>

      <div style={{ position: "relative", maxWidth: 900, margin: "0 auto" }}>
        {/* Bottom fade */}
        <div aria-hidden style={{ position: "absolute", bottom: -2, left: 0, right: 0, height: 120, background: "linear-gradient(to top, #050608 20%, transparent)", zIndex: 2, pointerEvents: "none", borderRadius: "0 0 14px 14px" }} />

        {/* Outer frame */}
        <div className="caelyn-preview" style={{
          background: "rgba(6,8,12,0.9)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 32px 80px rgba(0,0,0,0.7), 0 0 120px rgba(41,189,232,0.04)",
          overflow: "hidden",
        }}>
          {/* Fake window chrome */}
          <div style={{ height: 36, background: "rgba(4,5,8,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", padding: "0 14px", gap: 7 }}>
            {["#ff5f57","#febc2e","#28c840"].map((c, i) => <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: c, opacity: 0.7 }} />)}
            <div style={{ marginLeft: 12, fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em", fontFamily: "monospace" }}>caelyn.app</div>
          </div>

          {/* Main grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto auto", gap: 10, padding: 12 }}>

            {/* Market Regime */}
            <MiniCard label="Market Regime">
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "0.02em", marginBottom: 6 }}>SELECTIVE UPTREND</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {[["Macro", "Neutral"], ["Breadth", "Improving"], ["Volatility", "Low"]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: DIM }}>{k}</span>
                    <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </MiniCard>

            {/* Leading Themes */}
            <MiniCard label="Leading Themes">
              {[
                { name: "AI Infrastructure", dir: "↑", active: true },
                { name: "Defense & Aerospace", dir: "↑", active: true },
                { name: "Energy Transition", dir: "→", active: false },
              ].map(t => (
                <div key={t.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: t.active ? ICE : "rgba(255,255,255,0.22)", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.72)", fontWeight: 500 }}>{t.name}</span>
                  </div>
                  <span style={{ fontSize: 12, color: t.dir === "↑" ? "hsl(160,65%,48%)" : DIM, fontWeight: 600 }}>{t.dir}</span>
                </div>
              ))}
            </MiniCard>

            {/* Options Flow */}
            <MiniCard label="Options Flow">
              <div style={{ fontSize: 11, fontWeight: 600, color: "hsl(160,65%,50%)", marginBottom: 8 }}>CALL-WEIGHTED</div>
              {[["S&P 500", 0.68], ["Tech", 0.74], ["Energy", 0.52]].map(([name, ratio]) => (
                <div key={name as string} style={{ marginBottom: 7 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: DIM, marginBottom: 2 }}>
                    <span>{name}</span><span style={{ color: "rgba(255,255,255,0.5)" }}>{Math.round((ratio as number) * 100)}% call</span>
                  </div>
                  <FlowBar ratio={ratio as number} />
                </div>
              ))}
            </MiniCard>

            {/* AI Terminal */}
            <MiniCard label="AI Terminal">
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "9px 11px", fontSize: 10, fontFamily: "monospace", lineHeight: 1.6, border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ color: ICE, marginBottom: 5 }}>{">"} Analyze momentum across my watchlist</div>
                <div style={{ color: "rgba(255,255,255,0.55)" }}>
                  Three positions show strengthening<br />
                  relative momentum. Defense sector<br />
                  rotation is <span style={{ color: ICE }}>accelerating</span>...
                </div>
              </div>
            </MiniCard>
          </div>

          {/* Illustrative label */}
          <div style={{ textAlign: "center", padding: "8px 0 12px", fontSize: 9, color: "rgba(255,255,255,0.18)", letterSpacing: "0.12em" }}>
            PLATFORM OVERVIEW · ILLUSTRATIVE · NOT LIVE DATA
          </div>
        </div>
      </div>
    </>
  );
}
