import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Eye, EyeOff, TrendingUp, Shield, Zap } from 'lucide-react';

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
    if (isAuthenticated) {
      navigate('/app/caelyn-ai');
    }
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
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#050608' }}
    >
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-blue-600/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo & branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/40 to-blue-600/40 border border-purple-500/30 mb-4 shadow-2xl shadow-purple-500/20">
            <TrendingUp className="w-8 h-8 text-purple-300" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">CaelynAI</h1>
          <p className="text-white/40 text-sm">Institutional-grade market intelligence</p>
        </div>

        {/* Login card */}
        <div className="bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Sign in to your terminal</h2>
            <p className="text-white/40 text-sm mt-1">Enter your credentials to access CaelynAI</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                required
                className="w-full bg-black/30 border border-white/10 text-white placeholder-white/20 rounded-lg px-4 py-3 text-sm outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all duration-200"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                  className="w-full bg-black/30 border border-white/10 text-white placeholder-white/20 rounded-lg px-4 py-3 pr-11 text-sm outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={rememberMe}
                onClick={() => setRememberMe(v => !v)}
                className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                  rememberMe
                    ? 'bg-purple-600 border-purple-500 shadow-lg shadow-purple-500/30'
                    : 'bg-black/30 border-white/20 hover:border-white/40'
                }`}
              >
                {rememberMe && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className="text-sm text-white/50 select-none cursor-pointer" onClick={() => setRememberMe(v => !v)}>
                Remember me for 30 days
              </span>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !username.trim() || !password}
              className="w-full bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-white/10 disabled:to-white/10 disabled:text-white/30 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Security note */}
          <div className="mt-6 pt-5 border-t border-white/[0.06] flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 text-white/25 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-white/25 leading-relaxed">
              Secured with JWT authentication. Session tokens expire after 24 hours unless "Remember me" is selected.
            </p>
          </div>
        </div>

        {/* Feature pills */}
        <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
          {['Real-time Data', 'AI Analysis', 'Multi-asset'].map(label => (
            <span
              key={label}
              className="text-xs text-white/30 border border-white/[0.06] bg-white/[0.03] px-3 py-1 rounded-full flex items-center gap-1.5"
            >
              <Zap className="w-2.5 h-2.5 text-purple-400/60" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
