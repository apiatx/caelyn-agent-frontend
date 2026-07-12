import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const ICE = "hsl(200,85%,55%)";
const BORDER = "rgba(255,255,255,0.07)";

interface Feature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  tagline: string;
  price: string;
  priceSuffix: string;
  cta: string;
  highlight: boolean;
  comingSoon: boolean;
  badge?: string;
  features: Feature[];
}

const PLANS: Plan[] = [
  {
    name: "FREE",
    tagline: "Explore Caelyn's market intelligence",
    price: "$0",
    priceSuffix: "",
    cta: "EXPLORE FREE",
    highlight: false,
    comingSoon: false,
    features: [
      { text: "Curated market intelligence", included: true },
      { text: "Market leadership views", included: true },
      { text: "Limited curated thematic watchlist", included: true },
      { text: "Options Flow", included: true },
      { text: "Catalysts & calendar", included: true },
      { text: "Screeners", included: true },
      { text: "Social intelligence signals", included: true },
      { text: "AI analysis", included: false },
      { text: "Personal watchlists", included: false },
      { text: "Portfolios", included: false },
      { text: "Terminal access", included: false },
      { text: "Confluence views", included: false },
      { text: "Multi-agent collaboration", included: false },
      { text: "Custom rules & strategies", included: false },
    ],
  },
  {
    name: "STARTER",
    tagline: "Start personalizing your workspace",
    price: "$19",
    priceSuffix: "/ month",
    cta: "START BUILDING",
    highlight: false,
    comingSoon: false,
    features: [
      { text: "Everything in Free", included: true },
      { text: "1 watchlist · 50 tickers", included: true },
      { text: "1 portfolio · 10 holdings", included: true },
      { text: "Terminal access", included: true },
      { text: "1 single-agent analysis / day", included: true },
      { text: "Multi-agent collaboration", included: false },
      { text: "Curated confluence views", included: false },
      { text: "Full curated ticker universe", included: false },
      { text: "Custom confluence rules", included: false },
      { text: "Custom trading rules & strategies", included: false },
      { text: "Personal Strategy Engine", included: false },
    ],
  },
  {
    name: "PLUS",
    tagline: "See confluence across the market",
    price: "$59",
    priceSuffix: "/ month",
    cta: "GET CAELYN PLUS",
    highlight: true,
    comingSoon: false,
    badge: "MOST POPULAR",
    features: [
      { text: "Everything in Starter", included: true },
      { text: "Full curated ticker universe", included: true },
      { text: "500+ noteworthy tickers", included: true },
      { text: "Dozens of market themes", included: true },
      { text: "Curated confluence views", included: true },
      { text: "Technical, options, catalyst & fundamentals alignment", included: true },
      { text: "2 single-agent analyses / day", included: true },
      { text: "1 multi-agent collaboration / day", included: true },
      { text: "2 watchlists · 100 tickers each", included: true },
      { text: "3 portfolios · 15 holdings each", included: true },
      { text: "or 2 portfolios · 25 holdings each", included: true },
      { text: "Custom confluence rules", included: false },
      { text: "Custom trading rules & strategies", included: false },
      { text: "Personal Strategy Engine", included: false },
      { text: "Custom theme baskets", included: false },
      { text: "Custom page layouts & sidebar", included: false },
      { text: "Advanced financial + technical history", included: false },
    ],
  },
  {
    name: "PRO",
    tagline: "Build your own confluence engine",
    price: "$299",
    priceSuffix: "/ month",
    cta: "JOIN THE PRO WAITLIST",
    highlight: false,
    comingSoon: true,
    badge: "COMING SOON",
    features: [
      { text: "Everything in Plus", included: true },
      { text: "Custom confluence rules", included: true },
      { text: "Custom trading rules & strategies", included: true },
      { text: "Personal Strategy Engine", included: true },
      { text: "Predefined strategy frameworks", included: true },
      { text: "Decision guardrails", included: true },
      { text: "Personal investing playbook", included: true },
      { text: "Custom theme baskets", included: true },
      { text: "Advanced financial + technical history", included: true },
      { text: "Custom page layouts & sidebar", included: true },
      { text: "5 watchlists · 100 tickers each", included: true },
      { text: "5 portfolios · 20 holdings each", included: true },
      { text: "High-volume Caelyn AI", included: true },
      { text: "200 AI analyses / month", included: true },
      { text: "100 multi-agent collaborations / month", included: true },
    ],
  },
];

function FeatureRow({ feature }: { feature: Feature }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "4px 0" }}>
      <div style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {feature.included ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M2 6l3 3 5-5" stroke={ICE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <div style={{ width: 8, height: 1, background: "rgba(255,255,255,0.15)" }} />
        )}
      </div>
      <span style={{ fontSize: "clamp(0.75rem, 1.15vw, 0.82rem)", color: feature.included ? "rgba(255,255,255,0.68)" : "rgba(255,255,255,0.22)", lineHeight: 1.5 }}>
        {feature.text}
      </span>
    </div>
  );
}

function PricingCard({ plan, onCta }: { plan: Plan; onCta: () => void }) {
  const isHighlight = plan.highlight;
  const isComingSoon = plan.comingSoon;

  const included = plan.features.filter(f => f.included);
  const unavailable = plan.features.filter(f => !f.included);

  return (
    <div style={{
      position: "relative",
      background: isHighlight ? "rgba(10,16,26,0.95)" : "rgba(8,10,16,0.72)",
      border: isHighlight
        ? `1px solid rgba(41,189,232,0.35)`
        : isComingSoon
          ? `1px solid rgba(255,255,255,0.06)`
          : `1px solid ${BORDER}`,
      borderRadius: 14,
      padding: "28px 24px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 0,
      opacity: isComingSoon ? 0.8 : 1,
      boxShadow: isHighlight ? `0 0 0 1px rgba(41,189,232,0.08), 0 16px 48px rgba(0,0,0,0.4), 0 0 80px rgba(41,189,232,0.06)` : "none",
      transition: "transform 0.22s, border-color 0.22s",
    }}
      onMouseOver={e => { if (!isComingSoon) { e.currentTarget.style.transform = "translateY(-3px)"; } }}
      onMouseOut={e => { e.currentTarget.style.transform = ""; }}
    >
      {/* Badge */}
      {plan.badge && (
        <div style={{
          position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
          fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
          color: isHighlight ? "#050608" : "rgba(255,255,255,0.55)",
          background: isHighlight ? ICE : "rgba(255,255,255,0.08)",
          borderRadius: 4, padding: "4px 10px",
          border: isHighlight ? "none" : "1px solid rgba(255,255,255,0.08)",
          whiteSpace: "nowrap",
        }}>
          {plan.badge}
        </div>
      )}

      {/* Plan name + tagline */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: isHighlight ? ICE : "rgba(255,255,255,0.4)", marginBottom: 6 }}>{plan.name}</div>
        <div style={{ fontSize: "clamp(0.8rem, 1.2vw, 0.88rem)", color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>{plan.tagline}</div>
      </div>

      {/* Price */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 20 }}>
        <span style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>{plan.price}</span>
        {plan.priceSuffix && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 400 }}>{plan.priceSuffix}</span>}
      </div>

      {/* Included features */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {included.map((f, i) => <FeatureRow key={i} feature={f} />)}
        </div>

        {/* Divider between included and unavailable */}
        {unavailable.length > 0 && (
          <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "10px 0" }} />
        )}

        {/* Unavailable features */}
        {unavailable.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {unavailable.map((f, i) => <FeatureRow key={i} feature={f} />)}
          </div>
        )}
      </div>

      {/* Spacer before CTA */}
      <div style={{ height: 20 }} />

      {/* CTA */}
      <button
        onClick={onCta}
        disabled={isComingSoon}
        style={{
          width: "100%",
          padding: "11px 16px",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          borderRadius: 7,
          cursor: isComingSoon ? "default" : "pointer",
          border: isHighlight ? "none" : `1px solid ${isComingSoon ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.14)"}`,
          background: isHighlight ? ICE : "rgba(255,255,255,0.04)",
          color: isHighlight ? "#050608" : isComingSoon ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.7)",
          transition: "opacity 0.2s",
        }}
        onMouseOver={e => { if (!isComingSoon) e.currentTarget.style.opacity = "0.85"; }}
        onMouseOut={e => { e.currentTarget.style.opacity = "1"; }}
      >
        {plan.cta}
      </button>
    </div>
  );
}

export default function PricingSection() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleCta = (plan: Plan) => {
    if (plan.comingSoon) {
      toast({
        title: "Pro waitlist coming soon",
        description: "We'll announce when Pro enrollment opens. Stay tuned.",
      });
      return;
    }
    navigate("/login");
  };

  return (
    <section id="pricing" style={{ padding: "120px 24px", borderTop: `1px solid ${BORDER}` }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>

        {/* Label */}
        <div style={{ marginBottom: 24 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>Pricing</span>
        </div>

        {/* Headline */}
        <div style={{ maxWidth: 560, marginBottom: 64 }}>
          <div style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.9rem)", fontWeight: 700, letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.15 }}>
            Start with the market.
          </div>
          <div style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.9rem)", fontWeight: 700, letterSpacing: "-0.02em", color: "rgba(255,255,255,0.45)", lineHeight: 1.15 }}>
            Build your system.
          </div>
        </div>

        {/* Cards grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16, alignItems: "start" }}>
          {PLANS.map(plan => (
            <PricingCard key={plan.name} plan={plan} onCta={() => handleCta(plan)} />
          ))}
        </div>

        {/* Footer note */}
        <div style={{ textAlign: "center", marginTop: 40, fontSize: 11, color: "rgba(255,255,255,0.22)", letterSpacing: "0.04em" }}>
          All plans include access to the core Caelyn intelligence platform. No credit card required to explore.
        </div>
      </div>
    </section>
  );
}
