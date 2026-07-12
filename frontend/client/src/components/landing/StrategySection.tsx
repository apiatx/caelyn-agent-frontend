const BORDER = "rgba(255,255,255,0.07)";
const ICE = "hsl(200,85%,55%)";

function ConceptCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(8,10,16,0.72)",
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      padding: "28px 26px",
      display: "flex",
      flexDirection: "column",
      gap: 14,
      transition: "border-color 0.25s, transform 0.25s",
    }}
      onMouseOver={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.13)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseOut={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.transform = ""; }}
    >
      <div style={{ fontSize: "clamp(1rem, 1.6vw, 1.1rem)", fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{title}</div>
      {children}
    </div>
  );
}

function RuleTag({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "5px 10px", fontFamily: "monospace", letterSpacing: "0.02em" }}>
      "{text}"
    </div>
  );
}

export default function StrategySection() {
  return (
    <section id="strategy" style={{ padding: "120px 24px", borderTop: `1px solid ${BORDER}` }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>

        {/* Label */}
        <div style={{ marginBottom: 24 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>Strategy</span>
        </div>

        {/* Main headline */}
        <div style={{ maxWidth: 700, marginBottom: 16 }}>
          <div style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.9rem)", fontWeight: 700, letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.12 }}>
            The market doesn't forget your rules.
          </div>
          <div style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.9rem)", fontWeight: 700, letterSpacing: "-0.02em", color: ICE, lineHeight: 1.12 }}>
            You do.
          </div>
        </div>
        <div style={{ maxWidth: 520, marginBottom: 64 }}>
          <div style={{ fontSize: "clamp(0.9rem, 1.5vw, 1.05rem)", color: "rgba(255,255,255,0.42)", marginBottom: 8 }}>
            Your rules matter most when confluence appears.
          </div>
          <div style={{ fontSize: "clamp(0.88rem, 1.4vw, 1rem)", color: "rgba(255,255,255,0.28)" }}>
            Caelyn Pro is designed to let investors define the conditions that matter to their own process — then evaluate setups against those rules.
          </div>
        </div>

        {/* Three concept cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
          <ConceptCard title="Your market. Your process.">
            <div style={{ fontSize: "clamp(0.85rem, 1.3vw, 0.95rem)", color: "rgba(255,255,255,0.5)", lineHeight: 1.65 }}>
              Choose a predefined investing strategy and refine it around the way you invest.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {["Momentum", "Growth", "Thematic", "Breakout", "Long-term"].map(t => (
                <span key={t} style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4, padding: "3px 8px", letterSpacing: "0.04em" }}>{t}</span>
              ))}
            </div>
            <div style={{ fontSize: "clamp(0.82rem, 1.2vw, 0.9rem)", color: "rgba(255,255,255,0.38)", lineHeight: 1.6 }}>
              Build on rules that have been tested against the platform's signals instead of starting from a blank page.
            </div>
          </ConceptCard>

          <ConceptCard title="Rules become guardrails.">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <RuleTag text="Don't chase extended charts." />
              <RuleTag text="Cut broken positions." />
              <RuleTag text="Add when relative strength confirms." />
              <RuleTag text="Trim into extreme extensions." />
            </div>
            <div style={{ fontSize: "clamp(0.82rem, 1.2vw, 0.9rem)", color: "rgba(255,255,255,0.42)", lineHeight: 1.6 }}>
              Caelyn can surface your own rules against your watchlist and portfolio context. Not as constant alerts. At the decision point.
            </div>
          </ConceptCard>

          <ConceptCard title="Keep the lessons.">
            <div style={{ fontSize: "clamp(0.85rem, 1.3vw, 0.95rem)", color: "rgba(255,255,255,0.5)", lineHeight: 1.65 }}>
              Markets change. Good advice compounds.
            </div>
            <div style={{ fontSize: "clamp(0.82rem, 1.2vw, 0.9rem)", color: "rgba(255,255,255,0.38)", lineHeight: 1.6 }}>
              Save the principles, observations and practical lessons that shape how you invest — and build a permanent investing playbook around them.
            </div>
            <div style={{ fontSize: "clamp(0.85rem, 1.3vw, 0.95rem)", color: "rgba(255,255,255,0.52)", fontStyle: "italic" }}>
              Your strategy should get smarter every cycle.
            </div>
          </ConceptCard>
        </div>

        {/* PRO coming soon card */}
        <div style={{
          marginTop: 16,
          background: "rgba(6,7,10,0.6)",
          border: `1px solid rgba(41,189,232,0.12)`,
          borderRadius: 14,
          padding: "40px 36px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Subtle glow */}
          <div aria-hidden style={{ position: "absolute", top: -60, right: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(41,189,232,0.05), transparent 70%)", pointerEvents: "none" }} />

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
            <div style={{ flex: "1 1 320px" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.04em", color: "#fff" }}>PERSONAL STRATEGY + CONFLUENCE ENGINE</div>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: ICE, border: `1px solid rgba(41,189,232,0.3)`, borderRadius: 4, padding: "3px 8px", background: "rgba(41,189,232,0.06)" }}>COMING TO CAELYN PRO</span>
              </div>
              <div style={{ fontSize: "clamp(0.85rem, 1.3vw, 0.95rem)", color: "rgba(255,255,255,0.42)", lineHeight: 1.7, maxWidth: 520 }}>
                Define your strategy, choose tested rule frameworks, write your own trading guardrails, and build custom confluence logic around the signals that matter to you.
              </div>
            </div>

            {/* Illustrative rule card */}
            <div style={{ flex: "0 1 280px", background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "18px 20px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.28)", marginBottom: 12, textTransform: "uppercase" }}>Strategy Rule · Illustrative</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginBottom: 10, fontFamily: "monospace" }}>DON'T CHASE &gt;12% ABOVE 21EMA</div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 10 }} />
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", lineHeight: 1.55, fontStyle: "italic" }}>
                "A good rule is useless if you remember it after the trade."
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
