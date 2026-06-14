import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Eye, EyeOff, Shield } from 'lucide-react';
import caelynLogo from "@assets/image_1771576238262.png";
import caelynFairy from "@assets/image_1771572217667.png";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate('/app/caelyn-ai');
  }, [isAuthenticated, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError('');
    setIsLoading(true);
    try {
      await login(username.trim(), password, rememberMe);
      navigate('/app/caelyn-ai');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="lp-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        /* ── Design tokens ───────────────────────────────────────────── */
        :root {
          --lp-base:        #030404;
          --lp-elevated:    #080b09;
          --lp-panel:       rgba(255,255,255,0.032);
          --lp-border-soft: rgba(255,255,255,0.09);
          --lp-border-mid:  rgba(255,255,255,0.13);
          --lp-text-1:      #f0f0eb;
          --lp-text-2:      rgba(240,240,235,0.70);
          --lp-text-3:      rgba(240,240,235,0.40);
          --lp-sage:        #b8cab0;
          --lp-sage-dim:    rgba(174,191,180,0.55);
          --lp-glow:        rgba(184,202,176,0.20);
          --lp-glow-faint:  rgba(184,202,176,0.08);
        }

        /* ── Root wrapper ────────────────────────────────────────────── */
        .lp-root {
          min-height: 100vh;
          background: var(--lp-base);
          font-family: 'Outfit', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
          color: var(--lp-text-1);
        }

        /* ── Atmospheric background glows ────────────────────────────── */
        .lp-atmo {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(ellipse 1100px 700px at 72% 8%,  rgba(174,191,180,0.055) 0%, transparent 65%),
            radial-gradient(ellipse 800px  600px at 12% 88%, rgba(174,191,180,0.038) 0%, transparent 65%),
            radial-gradient(ellipse 600px  400px at 50% 50%, rgba(10,16,12,0.6)      0%, transparent 70%);
        }

        /* ── Ambient noise texture overlay ──────────────────────────── */
        .lp-atmo::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.028'/%3E%3C/svg%3E");
          opacity: 0.4;
        }

        /* ── Hero shell — large rounded mega-card ────────────────────── */
        .lp-shell {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1080px;
          min-height: 580px;
          border-radius: 28px;
          border: 1px solid var(--lp-border-soft);
          background:
            linear-gradient(155deg, rgba(255,255,255,0.024) 0%, rgba(255,255,255,0.008) 50%, rgba(255,255,255,0.014) 100%),
            rgba(6,9,7,0.96);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.04) inset,
            0 64px 120px rgba(0,0,0,0.7),
            0 0 60px rgba(174,191,180,0.04);
          backdrop-filter: blur(24px);
          display: flex;
          overflow: hidden;
        }

        /* ── Top highlight rim ───────────────────────────────────────── */
        .lp-shell::before {
          content: '';
          position: absolute;
          top: 0; left: 10%; right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
          z-index: 2;
          pointer-events: none;
        }

        /* ── Glow from top-right inside shell ────────────────────────── */
        .lp-shell::after {
          content: '';
          position: absolute;
          top: -120px; right: -80px;
          width: 500px; height: 400px;
          background: radial-gradient(ellipse, rgba(174,191,180,0.07) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* ── Left brand panel ────────────────────────────────────────── */
        .lp-brand {
          width: 52%;
          padding: 3.5rem 3rem 3rem;
          border-right: 1px solid var(--lp-border-soft);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          z-index: 1;
        }

        /* ── Right form panel ────────────────────────────────────────── */
        .lp-form-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 2.75rem;
          position: relative;
          z-index: 1;
        }

        /* ── Mobile ─────────────────────────────────────────────────── */
        .lp-mobile-logo { display: none; text-align: center; margin-bottom: 1.75rem; }

        @media (max-width: 820px) {
          .lp-root    { padding: 0; align-items: flex-start; }
          .lp-shell   { border-radius: 0; min-height: 100vh; flex-direction: column; border: none; }
          .lp-brand   { display: none; }
          .lp-mobile-logo { display: block; }
          .lp-form-wrap { padding: 2.5rem 1.5rem; align-items: flex-start; }
        }

        /* ── Sage accent text ─────────────────────────────────────────── */
        .lp-sage-text { color: var(--lp-sage); }

        .lp-gradient-text {
          background: linear-gradient(128deg, var(--lp-text-1) 0%, var(--lp-sage) 55%, rgba(174,191,180,0.7) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ── Feature dot ─────────────────────────────────────────────── */
        .lp-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--lp-sage-dim);
          box-shadow: 0 0 6px var(--lp-glow-faint);
          flex-shrink: 0;
        }

        /* ── Pill badge ──────────────────────────────────────────────── */
        .lp-pill {
          display: inline-block;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.63rem;
          font-weight: 500;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: var(--lp-sage-dim);
          border: 1px solid rgba(174,191,180,0.18);
          border-radius: 100px;
          padding: 0.3rem 0.95rem;
          background: rgba(174,191,180,0.04);
          margin-bottom: 2rem;
        }

        /* ── Signal chips (decorative, CSS-only) ────────────────────── */
        .lp-chips {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-top: 2.25rem;
        }
        .lp-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.28rem 0.75rem;
          border-radius: 100px;
          border: 1px solid var(--lp-border-soft);
          background: rgba(255,255,255,0.024);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.6rem;
          color: var(--lp-text-3);
          letter-spacing: 0.05em;
        }
        .lp-chip-dot {
          width: 4px; height: 4px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .lp-chip-dot.up   { background: #7dbf8a; box-shadow: 0 0 4px rgba(125,191,138,0.5); }
        .lp-chip-dot.flat { background: var(--lp-text-3); }
        .lp-chip-dot.sig  { background: var(--lp-sage-dim); box-shadow: 0 0 4px rgba(174,191,180,0.4); }

        /* ── Thin decorative SVG line ────────────────────────────────── */
        .lp-deco-line {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 180px;
          pointer-events: none;
          opacity: 0.18;
        }

        /* ── Form input ──────────────────────────────────────────────── */
        .lp-input {
          width: 100%;
          box-sizing: border-box;
          background: rgba(255,255,255,0.028);
          border: 1px solid var(--lp-border-soft);
          border-radius: 10px;
          padding: 0.72rem 1rem;
          color: var(--lp-text-1);
          font-size: 0.88rem;
          font-family: 'Outfit', sans-serif;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .lp-input::placeholder { color: rgba(240,240,235,0.20); }
        .lp-input:focus {
          outline: none;
          border-color: rgba(174,191,180,0.4);
          box-shadow: 0 0 0 3px rgba(174,191,180,0.07);
        }
        .lp-input-pw { padding-right: 2.75rem; }

        /* ── Primary button ──────────────────────────────────────────── */
        .lp-btn {
          width: 100%;
          padding: 0.88rem;
          background: linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%);
          border: 1px solid var(--lp-border-mid);
          border-radius: 10px;
          color: var(--lp-text-1);
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          font-size: 0.93rem;
          letter-spacing: 0.025em;
          cursor: pointer;
          transition: all 0.22s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 4px 20px rgba(0,0,0,0.45);
          position: relative;
          overflow: hidden;
        }
        .lp-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(160deg, rgba(174,191,180,0.10) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.22s;
        }
        .lp-btn:hover:not(:disabled)::before { opacity: 1; }
        .lp-btn:hover:not(:disabled) {
          border-color: rgba(174,191,180,0.28);
          box-shadow: 0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 28px rgba(0,0,0,0.5), 0 0 16px rgba(174,191,180,0.07);
          transform: translateY(-1px);
        }
        .lp-btn:active:not(:disabled) { transform: translateY(0); }
        .lp-btn:disabled {
          opacity: 0.32;
          cursor: not-allowed;
          transform: none;
        }

        /* ── Checkbox ────────────────────────────────────────────────── */
        .lp-check {
          width: 16px; height: 16px;
          border-radius: 4px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.18s;
          padding: 0;
        }

        /* ── Spinner ─────────────────────────────────────────────────── */
        @keyframes lp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .lp-spinning { animation: lp-spin 0.9s linear infinite; }

        /* ── Form card ───────────────────────────────────────────────── */
        .lp-card {
          background: rgba(8,11,9,0.82);
          border: 1px solid var(--lp-border-soft);
          border-radius: 16px;
          padding: 1.75rem 1.875rem;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.03) inset;
          position: relative;
          overflow: hidden;
        }
        .lp-card::before {
          content: '';
          position: absolute;
          top: 0; left: 15%; right: 15%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(174,191,180,0.18), transparent);
        }
      `}</style>

      {/* Atmospheric glows */}
      <div className="lp-atmo" />

      {/* Floating ambient chips — decorative, top-right corner of viewport */}
      <div style={{
        position: 'fixed', top: '1.5rem', right: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '0.4rem',
        pointerEvents: 'none', zIndex: 0, opacity: 0.55
      }}>
        {[
          { label: 'SPX LONG', color: 'up' },
          { label: 'BTC +2.1%', color: 'up' },
          { label: 'FOMC WATCH', color: 'sig' },
        ].map(c => (
          <div key={c.label} className="lp-chip">
            <span className={`lp-chip-dot ${c.color}`} />
            {c.label}
          </div>
        ))}
      </div>

      {/* ── Hero shell ── */}
      <div className="lp-shell">

        {/* ── LEFT BRAND PANEL ── */}
        <div className="lp-brand">
          <div>
            {/* Logo */}
            <div style={{ maxWidth: 240, marginBottom: '2.25rem' }}>
              <img src={caelynLogo} alt="CaelynAI" style={{ width: '100%', height: 'auto', display: 'block', opacity: 0.92 }} />
            </div>

            {/* Pill badge */}
            <div className="lp-pill">Cross-Asset Trading Intelligence</div>

            {/* Headline */}
            <h1 style={{
              fontSize: 'clamp(1.55rem, 2.5vw, 2.2rem)',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.03em',
              marginBottom: '1rem',
              color: 'var(--lp-text-1)'
            }}>
              One agent.<br />Every market.<br />
              <span className="lp-gradient-text">Institutional-grade signal.</span>
            </h1>

            <p style={{ color: 'var(--lp-text-3)', fontSize: '0.88rem', lineHeight: 1.72, maxWidth: 380, marginBottom: '0' }}>
              19 live data sources. Deterministic scoring. Specific trade plans with entry, stop, and target — not market commentary.
            </p>

            {/* Feature list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1.75rem' }}>
              {[
                { label: 'Real-time Data',    desc: '19 providers aggregated per request'      },
                { label: 'AI Synthesis',      desc: 'Claude-powered trade plans with full context' },
                { label: 'Cross-asset',       desc: 'Stocks, crypto & commodities in one view'  },
                { label: 'HyperLiquid Perps', desc: 'Live funding rates, OI, squeeze candidates' },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div className="lp-dot" />
                  <div>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.68rem', fontWeight: 500,
                      color: 'var(--lp-sage-dim)', letterSpacing: '0.06em'
                    }}>{f.label}</span>
                    <span style={{ color: 'var(--lp-text-3)', fontSize: '0.78rem', marginLeft: '0.55rem' }}>{f.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Signal chips row */}
            <div className="lp-chips">
              {[
                { label: 'Unusual Options Flow', t: 'up'  },
                { label: 'Macro Radar',           t: 'sig' },
                { label: 'Hyperliquid Screener',  t: 'sig' },
                { label: 'Whale Tracker',         t: 'up'  },
                { label: 'Prophetik Signals',     t: 'flat'},
              ].map(c => (
                <div key={c.label} className="lp-chip">
                  <span className={`lp-chip-dot ${c.t}`} />
                  {c.label}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: fairy image + tagline */}
          <div>
            {/* Thin decorative SVG streaks */}
            <div style={{ position: 'relative', height: 140, marginBottom: '0.75rem', overflow: 'hidden' }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="none"
                style={{ position: 'absolute', bottom: 0, left: 0, opacity: 0.14 }}>
                <path d="M0,100 Q100,60 200,80 T400,70" fill="none" stroke="var(--lp-sage)" strokeWidth="0.8"/>
                <path d="M0,120 Q120,90 240,100 T400,90" fill="none" stroke="var(--lp-sage)" strokeWidth="0.5"/>
                <path d="M0,80 Q80,40 200,60 T400,50"  fill="none" stroke="var(--lp-sage)" strokeWidth="0.4"/>
              </svg>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <img
                  src={caelynFairy}
                  alt="CaelynAI"
                  style={{
                    width: 120, height: 120,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid rgba(174,191,180,0.14)',
                    boxShadow: '0 0 32px rgba(174,191,180,0.08), 0 0 80px rgba(0,0,0,0.5)',
                  }}
                />
              </div>
            </div>

            {/* Divider */}
            <div style={{
              width: 36, height: 1,
              background: 'linear-gradient(90deg, transparent, var(--lp-sage-dim), transparent)',
              margin: '0 auto 0.9rem'
            }} />

            <p style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.67rem', color: 'var(--lp-text-3)',
              letterSpacing: '0.06em', textAlign: 'center'
            }}>
              <span className="lp-sage-text" style={{ fontWeight: 600 }}>CaelynAI</span> — Signal over noise.
            </p>
          </div>
        </div>

        {/* ── RIGHT FORM PANEL ── */}
        <div className="lp-form-wrap">
          <div style={{ width: '100%', maxWidth: 400 }}>

            {/* Mobile logo */}
            <div className="lp-mobile-logo">
              <div style={{ maxWidth: 180, margin: '0 auto 1rem' }}>
                <img src={caelynLogo} alt="CaelynAI" style={{ width: '100%', height: 'auto' }} />
              </div>
            </div>

            {/* Section label */}
            <p style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.63rem', fontWeight: 500,
              letterSpacing: '0.13em', textTransform: 'uppercase',
              color: 'var(--lp-sage-dim)', marginBottom: '0.5rem'
            }}>
              Terminal Access
            </p>

            <h2 style={{
              fontSize: '1.55rem', fontWeight: 600,
              letterSpacing: '-0.025em',
              color: 'var(--lp-text-1)', marginBottom: '0.35rem'
            }}>
              Sign in to your account
            </h2>
            <p style={{ color: 'var(--lp-text-3)', fontSize: '0.85rem', marginBottom: '1.75rem', lineHeight: 1.65 }}>
              Enter your credentials to access the trading terminal.
            </p>

            {/* Form card */}
            <div className="lp-card">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

                {/* Username */}
                <div>
                  <label style={{
                    display: 'block',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.6rem', fontWeight: 500,
                    letterSpacing: '0.11em', textTransform: 'uppercase',
                    color: 'var(--lp-text-3)', marginBottom: '0.4rem'
                  }}>
                    Username
                  </label>
                  <input
                    type="text"
                    className="lp-input"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter username"
                    autoComplete="username"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label style={{
                    display: 'block',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.6rem', fontWeight: 500,
                    letterSpacing: '0.11em', textTransform: 'uppercase',
                    color: 'var(--lp-text-3)', marginBottom: '0.4rem'
                  }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="lp-input lp-input-pw"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter password"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      tabIndex={-1}
                      style={{
                        position: 'absolute', right: '0.85rem', top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--lp-text-3)', display: 'flex',
                        alignItems: 'center', padding: 0,
                        transition: 'color 0.18s'
                      }}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={rememberMe}
                    onClick={() => setRememberMe(v => !v)}
                    className="lp-check"
                    style={{
                      border: rememberMe
                        ? '1px solid rgba(174,191,180,0.45)'
                        : '1px solid var(--lp-border-soft)',
                      background: rememberMe
                        ? 'rgba(174,191,180,0.10)'
                        : 'rgba(255,255,255,0.028)',
                      boxShadow: rememberMe ? '0 0 8px rgba(174,191,180,0.1)' : 'none',
                    }}
                  >
                    {rememberMe && (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                        stroke="var(--lp-sage)" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span
                    onClick={() => setRememberMe(v => !v)}
                    style={{
                      fontSize: '0.82rem', color: 'var(--lp-text-3)',
                      cursor: 'pointer', userSelect: 'none'
                    }}
                  >
                    Remember me for 30 days
                  </span>
                </div>

                {/* Error */}
                {error && (
                  <div style={{
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.16)',
                    borderRadius: 8,
                    padding: '0.65rem 0.9rem',
                    color: '#f87171',
                    fontSize: '0.81rem',
                    lineHeight: 1.5
                  }}>
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading || !username.trim() || !password}
                  className="lp-btn"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} className="lp-spinning" />
                      Authenticating…
                    </>
                  ) : 'Sign In'}
                </button>
              </form>

              {/* Security note */}
              <div style={{
                marginTop: '1.25rem', paddingTop: '1rem',
                borderTop: '1px solid var(--lp-border-soft)',
                display: 'flex', alignItems: 'flex-start', gap: '0.45rem'
              }}>
                <Shield size={11} style={{ color: 'var(--lp-text-3)', flexShrink: 0, marginTop: 2 }} />
                <p style={{
                  color: 'var(--lp-text-3)', fontSize: '0.71rem',
                  lineHeight: 1.55, margin: 0
                }}>
                  Secured with JWT authentication. Tokens expire after 24h unless Remember me is enabled.
                </p>
              </div>
            </div>

            {/* Bottom tagline */}
            <p style={{
              textAlign: 'center', marginTop: '1.4rem',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.67rem', color: 'var(--lp-text-3)', letterSpacing: '0.04em'
            }}>
              Not financial advice. All trading involves risk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
