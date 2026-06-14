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

        /* ── Design tokens — strict black / silver / white ────────── */
        :root {
          --lp-base:          #020202;
          --lp-black:         #050505;
          --lp-elevated:      #090909;
          --lp-panel:         rgba(255,255,255,0.035);
          --lp-panel-strong:  rgba(255,255,255,0.065);
          --lp-border-soft:   rgba(255,255,255,0.10);
          --lp-border-bright: rgba(255,255,255,0.20);
          --lp-text-primary:  #f5f5f0;
          --lp-text-secondary:rgba(245,245,240,0.72);
          --lp-text-muted:    rgba(245,245,240,0.42);
          --lp-silver:        #d8d8d2;
          --lp-silver-soft:   #a9aaa6;
          --lp-glow-white:    rgba(255,255,245,0.20);
          --lp-glow-faint:    rgba(255,255,245,0.075);
        }

        /* ── Root ──────────────────────────────────────────────────── */
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
          color: var(--lp-text-primary);
        }

        /* ── Background: pure neutral white glows, zero color ─────── */
        .lp-atmo {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(ellipse 900px 600px at 68% 5%,  rgba(255,255,250,0.042) 0%, transparent 65%),
            radial-gradient(ellipse 700px 500px at 10% 90%, rgba(255,255,250,0.028) 0%, transparent 65%),
            radial-gradient(ellipse 1200px 800px at 50% 50%, rgba(0,0,0,0.5)        0%, transparent 70%);
        }

        /* ── Hero shell ────────────────────────────────────────────── */
        .lp-shell {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1080px;
          min-height: 580px;
          border-radius: 28px;
          border: 1px solid var(--lp-border-soft);
          background:
            linear-gradient(155deg,
              rgba(255,255,255,0.030) 0%,
              rgba(255,255,255,0.010) 48%,
              rgba(255,255,255,0.018) 100%
            ),
            rgba(5,5,5,0.97);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.045) inset,
            0 60px 100px rgba(0,0,0,0.75),
            0 0 80px rgba(255,255,250,0.025);
          backdrop-filter: blur(20px);
          display: flex;
          overflow: hidden;
        }

        /* top rim highlight */
        .lp-shell::before {
          content: '';
          position: absolute;
          top: 0; left: 8%; right: 8%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
          z-index: 2;
          pointer-events: none;
        }

        /* top-right interior white glow */
        .lp-shell::after {
          content: '';
          position: absolute;
          top: -140px; right: -100px;
          width: 520px; height: 420px;
          background: radial-gradient(ellipse, rgba(255,255,250,0.055) 0%, transparent 68%);
          pointer-events: none;
          z-index: 0;
        }

        /* ── Left brand panel ──────────────────────────────────────── */
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

        /* ── Right form panel ──────────────────────────────────────── */
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

        /* ── Typography helpers ────────────────────────────────────── */
        .lp-silver-text { color: var(--lp-silver); }

        .lp-gradient-text {
          background: linear-gradient(128deg,
            var(--lp-text-primary) 0%,
            var(--lp-silver)       55%,
            var(--lp-silver-soft)  100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ── Pill badge ─────────────────────────────────────────────── */
        .lp-pill {
          display: inline-block;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.63rem;
          font-weight: 500;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: var(--lp-silver-soft);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 100px;
          padding: 0.3rem 0.95rem;
          background: rgba(255,255,255,0.04);
          margin-bottom: 2rem;
        }

        /* ── Feature dot ─────────────────────────────────────────────── */
        .lp-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: rgba(255,255,255,0.30);
          box-shadow: 0 0 6px rgba(255,255,255,0.12);
          flex-shrink: 0;
        }

        /* ── Signal chips (decorative, CSS-only) ───────────────────── */
        .lp-chips {
          display: flex;
          gap: 0.45rem;
          flex-wrap: wrap;
          margin-top: 2rem;
        }

        .lp-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.26rem 0.72rem;
          border-radius: 100px;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.022);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.59rem;
          color: var(--lp-text-muted);
          letter-spacing: 0.05em;
        }

        .lp-chip-dot {
          width: 4px; height: 4px;
          border-radius: 50%;
          flex-shrink: 0;
          background: rgba(255,255,255,0.28);
        }
        .lp-chip-dot.active {
          background: rgba(255,255,255,0.55);
          box-shadow: 0 0 4px rgba(255,255,255,0.25);
        }

        /* ── Form input ─────────────────────────────────────────────── */
        .lp-input {
          width: 100%;
          box-sizing: border-box;
          background: rgba(255,255,255,0.028);
          border: 1px solid var(--lp-border-soft);
          border-radius: 10px;
          padding: 0.72rem 1rem;
          color: var(--lp-text-primary);
          font-size: 0.88rem;
          font-family: 'Outfit', sans-serif;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .lp-input::placeholder { color: rgba(245,245,240,0.20); }
        .lp-input:focus {
          outline: none;
          border-color: rgba(255,255,255,0.30);
          box-shadow: 0 0 0 3px rgba(255,255,245,0.05);
        }
        .lp-input-pw { padding-right: 2.75rem; }

        /* ── Primary button — glossy black ──────────────────────────── */
        .lp-btn {
          width: 100%;
          padding: 0.88rem;
          background: linear-gradient(160deg,
            rgba(255,255,255,0.11) 0%,
            rgba(255,255,255,0.042) 100%
          );
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 10px;
          color: var(--lp-text-primary);
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
          box-shadow:
            0 1px 0 rgba(255,255,255,0.08) inset,
            0 4px 20px rgba(0,0,0,0.55);
          position: relative;
          overflow: hidden;
        }
        .lp-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(160deg, rgba(255,255,255,0.10) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.22s;
        }
        .lp-btn:hover:not(:disabled)::before { opacity: 1; }
        .lp-btn:hover:not(:disabled) {
          border-color: rgba(255,255,255,0.28);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.10) inset,
            0 4px 28px rgba(0,0,0,0.6),
            0 0 20px rgba(255,255,245,0.07);
          transform: translateY(-1px);
        }
        .lp-btn:active:not(:disabled) { transform: translateY(0); }
        .lp-btn:disabled {
          opacity: 0.28;
          cursor: not-allowed;
          transform: none;
        }

        /* ── Checkbox ──────────────────────────────────────────────── */
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

        /* ── Form card ─────────────────────────────────────────────── */
        .lp-card {
          background: rgba(8,8,8,0.88);
          border: 1px solid var(--lp-border-soft);
          border-radius: 16px;
          padding: 1.75rem 1.875rem;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.035) inset,
            0 24px 48px rgba(0,0,0,0.5);
          position: relative;
          overflow: hidden;
        }
        .lp-card::before {
          content: '';
          position: absolute;
          top: 0; left: 15%; right: 15%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
        }

        /* ── Spinner ──────────────────────────────────────────────── */
        @keyframes lp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .lp-spinning { animation: lp-spin 0.9s linear infinite; }
      `}</style>

      {/* Atmospheric glows — white/neutral only */}
      <div className="lp-atmo" />

      {/* Ambient signal chips — top-right, decorative */}
      <div style={{
        position: 'fixed', top: '1.5rem', right: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '0.38rem',
        pointerEvents: 'none', zIndex: 0, opacity: 0.5,
      }}>
        {['SPX LONG', 'BTC +2.1%', 'FOMC WATCH'].map(label => (
          <div key={label} className="lp-chip">
            <span className="lp-chip-dot active" />
            {label}
          </div>
        ))}
      </div>

      {/* ── Hero shell ── */}
      <div className="lp-shell">

        {/* ── LEFT: Brand panel ── */}
        <div className="lp-brand">
          <div>
            {/* Logo */}
            <div style={{ maxWidth: 240, marginBottom: '2.25rem' }}>
              <img src={caelynLogo} alt="CaelynAI"
                style={{ width: '100%', height: 'auto', display: 'block', opacity: 0.90 }} />
            </div>

            {/* Badge */}
            <div className="lp-pill">Cross-Asset Trading Intelligence</div>

            {/* Headline */}
            <h1 style={{
              fontSize: 'clamp(1.55rem, 2.5vw, 2.2rem)',
              fontWeight: 700, lineHeight: 1.2,
              letterSpacing: '-0.03em', marginBottom: '1rem',
              color: 'var(--lp-text-primary)',
            }}>
              One agent.<br />Every market.<br />
              <span className="lp-gradient-text">Institutional-grade signal.</span>
            </h1>

            <p style={{
              color: 'var(--lp-text-muted)', fontSize: '0.88rem',
              lineHeight: 1.72, maxWidth: 380,
            }}>
              19 live data sources. Deterministic scoring. Specific trade plans with entry, stop, and target — not market commentary.
            </p>

            {/* Feature list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.78rem', marginTop: '1.75rem' }}>
              {[
                { label: 'Real-time Data',    desc: '19 providers aggregated per request'       },
                { label: 'AI Synthesis',      desc: 'Claude-powered trade plans with full context' },
                { label: 'Cross-asset',       desc: 'Stocks, crypto & commodities in one view'   },
                { label: 'HyperLiquid Perps', desc: 'Live funding rates, OI, squeeze candidates' },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div className="lp-dot" />
                  <div>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.67rem', fontWeight: 500,
                      color: 'var(--lp-silver-soft)', letterSpacing: '0.06em',
                    }}>{f.label}</span>
                    <span style={{
                      color: 'var(--lp-text-muted)',
                      fontSize: '0.77rem', marginLeft: '0.55rem',
                    }}>{f.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Signal capability chips */}
            <div className="lp-chips">
              {['Unusual Options Flow', 'Macro Radar', 'Hyperliquid Screener', 'Whale Tracker', 'Prophetik Signals'].map(c => (
                <div key={c} className="lp-chip">
                  <span className="lp-chip-dot" />
                  {c}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: fairy image + tagline + SVG curves */}
          <div>
            <div style={{ position: 'relative', height: 140, marginBottom: '0.75rem', overflow: 'hidden' }}>
              {/* Decorative data-stream curves */}
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="none"
                style={{ position: 'absolute', bottom: 0, left: 0, opacity: 0.10 }}>
                <path d="M0,100 Q100,60 200,80 T400,70"  fill="none" stroke="#d8d8d2" strokeWidth="0.8"/>
                <path d="M0,120 Q120,90 240,100 T400,90" fill="none" stroke="#d8d8d2" strokeWidth="0.5"/>
                <path d="M0,80  Q80,40  200,60 T400,50"  fill="none" stroke="#d8d8d2" strokeWidth="0.4"/>
              </svg>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <img src={caelynFairy} alt="CaelynAI"
                  style={{
                    width: 118, height: 118,
                    borderRadius: '50%', objectFit: 'cover',
                    border: '1px solid rgba(255,255,255,0.10)',
                    boxShadow: '0 0 30px rgba(255,255,250,0.06), 0 0 80px rgba(0,0,0,0.55)',
                  }}
                />
              </div>
            </div>

            <div style={{
              width: 34, height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)',
              margin: '0 auto 0.9rem',
            }} />
            <p style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.67rem', color: 'var(--lp-text-muted)',
              letterSpacing: '0.06em', textAlign: 'center',
            }}>
              <span style={{ color: 'var(--lp-silver)', fontWeight: 600 }}>CaelynAI</span> — Signal over noise.
            </p>
          </div>
        </div>

        {/* ── RIGHT: Form panel ── */}
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
              fontSize: '0.62rem', fontWeight: 500,
              letterSpacing: '0.13em', textTransform: 'uppercase',
              color: 'var(--lp-silver-soft)', marginBottom: '0.5rem',
            }}>
              Terminal Access
            </p>

            <h2 style={{
              fontSize: '1.55rem', fontWeight: 600,
              letterSpacing: '-0.025em',
              color: 'var(--lp-text-primary)', marginBottom: '0.35rem',
            }}>
              Sign in to your account
            </h2>
            <p style={{
              color: 'var(--lp-text-muted)', fontSize: '0.85rem',
              marginBottom: '1.75rem', lineHeight: 1.65,
            }}>
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
                    fontSize: '0.60rem', fontWeight: 500,
                    letterSpacing: '0.11em', textTransform: 'uppercase',
                    color: 'var(--lp-text-muted)', marginBottom: '0.4rem',
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
                    fontSize: '0.60rem', fontWeight: 500,
                    letterSpacing: '0.11em', textTransform: 'uppercase',
                    color: 'var(--lp-text-muted)', marginBottom: '0.4rem',
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
                        color: 'var(--lp-text-muted)',
                        display: 'flex', alignItems: 'center', padding: 0,
                        transition: 'color 0.18s',
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
                        ? '1px solid rgba(255,255,255,0.38)'
                        : '1px solid var(--lp-border-soft)',
                      background: rememberMe
                        ? 'rgba(255,255,255,0.09)'
                        : 'rgba(255,255,255,0.024)',
                      boxShadow: rememberMe ? '0 0 8px rgba(255,255,245,0.08)' : 'none',
                    }}
                  >
                    {rememberMe && (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                        stroke="var(--lp-silver)" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span
                    onClick={() => setRememberMe(v => !v)}
                    style={{
                      fontSize: '0.82rem', color: 'var(--lp-text-muted)',
                      cursor: 'pointer', userSelect: 'none',
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
                    borderRadius: 8, padding: '0.65rem 0.9rem',
                    color: '#f87171', fontSize: '0.81rem', lineHeight: 1.5,
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
                borderTop: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'flex-start', gap: '0.45rem',
              }}>
                <Shield size={11} style={{ color: 'var(--lp-text-muted)', flexShrink: 0, marginTop: 2 }} />
                <p style={{
                  color: 'var(--lp-text-muted)', fontSize: '0.71rem',
                  lineHeight: 1.55, margin: 0,
                }}>
                  Secured with JWT authentication. Tokens expire after 24h unless Remember me is enabled.
                </p>
              </div>
            </div>

            {/* Bottom tagline */}
            <p style={{
              textAlign: 'center', marginTop: '1.4rem',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.67rem', color: 'var(--lp-text-muted)', letterSpacing: '0.04em',
            }}>
              Not financial advice. All trading involves risk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
