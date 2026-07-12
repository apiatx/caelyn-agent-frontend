const ICE = "hsl(200,85%,55%)";

const SIGNALS = [
  { label: "TECHNICALS", x: 70, y: 55 },
  { label: "FUNDAMENTALS", x: 210, y: 30 },
  { label: "OPTIONS FLOW", x: 370, y: 22 },
  { label: "CATALYSTS", x: 530, y: 30 },
  { label: "SOCIAL INTEL", x: 670, y: 55 },
];
const CX = 370;
const CY = 200;
const CONFLUENCE_Y = 280;
const CONVICTION_Y = 360;

export default function SignalConvergence() {
  return (
    <section id="signal" style={{ padding: "120px 24px", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes caelyLineDraw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes caelyPulse {
          0%,100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes caelyFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .conv-line { animation: caelyLineDraw 1.8s ease-out forwards; }
          .conv-line:nth-child(1) { animation-delay: 0.0s; }
          .conv-line:nth-child(2) { animation-delay: 0.15s; }
          .conv-line:nth-child(3) { animation-delay: 0.3s; }
          .conv-line:nth-child(4) { animation-delay: 0.45s; }
          .conv-line:nth-child(5) { animation-delay: 0.6s; }
          .conv-center { animation: caelyPulse 3s ease-in-out infinite; }
          .conv-confluence { animation: caelyFade 1s ease-out 1.4s both; }
          .conv-conviction { animation: caelyFade 1s ease-out 1.9s both; }
        }
        @media (prefers-reduced-motion: reduce) {
          .conv-line { stroke-dashoffset: 0; }
        }
      `}</style>

      <div style={{ maxWidth: 1280, margin: "0 auto" }}>

        {/* Headlines */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
            You don't need more data.
          </div>
        </div>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 700, letterSpacing: "-0.02em", background: `linear-gradient(90deg, ${ICE}, rgba(255,255,255,0.9))`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            You need the data to agree.
          </div>
        </div>

        {/* Convergence visual — SIGNALS → CAELYN → CONFLUENCE → CONVICTION */}
        <div style={{ maxWidth: 760, margin: "0 auto 60px", position: "relative" }}>
          <svg viewBox="0 0 740 400" style={{ width: "100%", display: "block", overflow: "visible" }} aria-hidden>
            {/* Lines from each signal to CAELYN box */}
            {SIGNALS.map((s, i) => {
              const len = Math.sqrt((s.x - CX) ** 2 + (s.y - CY) ** 2);
              return (
                <line
                  key={i}
                  className="conv-line"
                  x1={s.x} y1={s.y + 14}
                  x2={CX} y2={CY - 18}
                  stroke={`rgba(41,189,232,${0.12 + i * 0.02})`}
                  strokeWidth={1}
                  strokeDasharray={len}
                  style={{ strokeDashoffset: len }}
                />
              );
            })}

            {/* Vertical connector: CAELYN → CONFLUENCE */}
            <line x1={CX} y1={CY + 18} x2={CX} y2={CONFLUENCE_Y - 16} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />

            {/* Vertical connector: CONFLUENCE → CONVICTION */}
            <line x1={CX} y1={CONFLUENCE_Y + 16} x2={CX} y2={CONVICTION_Y - 8} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />

            {/* Signal nodes */}
            {SIGNALS.map((s, i) => (
              <g key={i}>
                <circle cx={s.x} cy={s.y} r={3} fill={ICE} opacity={0.5} />
                <text
                  x={s.x} y={s.y - 10}
                  textAnchor="middle"
                  fontSize={8.5}
                  fontFamily="'Inter', sans-serif"
                  fontWeight={700}
                  fill="rgba(255,255,255,0.45)"
                  letterSpacing="1.8"
                >
                  {s.label}
                </text>
              </g>
            ))}

            {/* CAELYN box */}
            <g className="conv-center">
              <rect x={CX - 56} y={CY - 18} width={112} height={36} rx={5} fill="rgba(8,12,18,0.9)" stroke={ICE} strokeWidth={1} />
              <text x={CX} y={CY + 6} textAnchor="middle" fontSize={11} fontFamily="'Inter', sans-serif" fontWeight={700} fill={ICE} letterSpacing="4">
                CAELYN
              </text>
            </g>

            {/* CONFLUENCE box — the key intermediate step */}
            <g className="conv-confluence">
              <rect x={CX - 64} y={CONFLUENCE_Y - 16} width={128} height={32} rx={5}
                fill="rgba(41,189,232,0.08)" stroke="rgba(41,189,232,0.35)" strokeWidth={1} />
              <text x={CX} y={CONFLUENCE_Y + 5} textAnchor="middle" fontSize={10} fontFamily="'Inter', sans-serif" fontWeight={700}
                fill="rgba(41,189,232,0.85)" letterSpacing="4">
                CONFLUENCE
              </text>
            </g>

            {/* Arrow dot */}
            <circle className="conv-conviction" cx={CX} cy={CONVICTION_Y - 4} r={2} fill="rgba(255,255,255,0.2)" />

            {/* CONVICTION */}
            <text className="conv-conviction" x={CX} y={CONVICTION_Y + 14} textAnchor="middle" fontSize={11} fontFamily="'Inter', sans-serif" fontWeight={700} fill="rgba(255,255,255,0.45)" letterSpacing="5">
              CONVICTION
            </text>
          </svg>
        </div>

        {/* Copy below */}
        <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
          <div style={{ fontSize: "clamp(0.9rem, 1.6vw, 1.05rem)", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: 20 }}>
            Confluence is the point where separate signals start confirming the same idea.
          </div>
          <div style={{ fontSize: "clamp(0.88rem, 1.5vw, 1rem)", color: "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>
            Caelyn is built to surface that alignment across tickers, themes, watchlists and portfolios.
          </div>
        </div>
      </div>
    </section>
  );
}
