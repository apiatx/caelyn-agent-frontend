const BORDER = "rgba(255,255,255,0.07)";

function FactCard({ text }: { text: string }) {
  return (
    <div style={{
      background: "rgba(8,10,16,0.7)",
      border: `1px solid ${BORDER}`,
      borderRadius: 10,
      padding: "18px 22px",
      fontSize: "clamp(0.875rem, 1.4vw, 1rem)",
      color: "rgba(255,255,255,0.55)",
      lineHeight: 1.65,
    }}>
      {text}
    </div>
  );
}

export default function AboutSection() {
  return (
    <section id="about" style={{ padding: "120px 24px", borderTop: `1px solid ${BORDER}` }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>

        {/* Label */}
        <div style={{ marginBottom: 28 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>About</span>
        </div>

        {/* Main headline — split for visual weight */}
        <div style={{ maxWidth: 780, marginBottom: 64 }}>
          <div style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#fff", marginBottom: 12 }}>
            Built because investing tools still make you do the thinking between the tabs.
          </div>
        </div>

        {/* Body — staggered layout */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 72 }}>
          <FactCard text="Market data lives in one platform. Options activity lives somewhere else. Social sentiment moves in real time. Fundamentals update quarterly. Catalysts arrive without context." />
          <FactCard text="The investor is left connecting everything manually — tab by tab, platform by platform, with no single view of whether the setup actually makes sense." />
          <FactCard text="Caelyn was built to connect it. It organizes market structure, themes, technical strength, fundamentals, options positioning, catalysts and real-time intelligence into one investing workspace." />
        </div>

        {/* Large statement */}
        <div style={{ maxWidth: 680, margin: "0 auto 64px", textAlign: "center" }}>
          <div style={{ fontSize: "clamp(1.2rem, 2.2vw, 1.6rem)", fontWeight: 400, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, fontStyle: "italic" }}>
            "Not to tell you what to buy.
          </div>
          <div style={{ fontSize: "clamp(1.2rem, 2.2vw, 1.6rem)", fontWeight: 400, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 32 }}>
            To help you see the full setup before you make the decision."
          </div>

          {/* Divider */}
          <div style={{ width: 40, height: 1, background: "rgba(255,255,255,0.12)", margin: "0 auto 28px" }} />

          {/* Positioning line */}
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>
            Intelligence infrastructure for self-directed investors.
          </div>
        </div>
      </div>
    </section>
  );
}
