import { GlassCard } from "@/components/ui/glass-card";

export default function Dashboard() {
  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-pink-400 to-pink-600 rounded-lg flex items-center justify-center">
              <svg 
                width="48" 
                height="48" 
                viewBox="0 0 100 100" 
                className="text-white"
              >
                {/* Moo Deng's body */}
                <ellipse cx="50" cy="65" rx="25" ry="18" fill="#FFB6C1" stroke="#FF69B4" strokeWidth="2"/>
                
                {/* Moo Deng's head */}
                <circle cx="50" cy="40" r="20" fill="#FFB6C1" stroke="#FF69B4" strokeWidth="2"/>
                
                {/* Eyes */}
                <circle cx="43" cy="35" r="3" fill="#000"/>
                <circle cx="57" cy="35" r="3" fill="#000"/>
                <circle cx="44" cy="34" r="1" fill="#FFF"/>
                <circle cx="58" cy="34" r="1" fill="#FFF"/>
                
                {/* Snout */}
                <ellipse cx="50" cy="45" rx="6" ry="4" fill="#FF91A4"/>
                
                {/* Nostrils */}
                <ellipse cx="48" cy="44" rx="1" ry="1.5" fill="#000"/>
                <ellipse cx="52" cy="44" rx="1" ry="1.5" fill="#000"/>
                
                {/* Ears */}
                <ellipse cx="35" cy="30" rx="4" ry="8" fill="#FFB6C1" stroke="#FF69B4" strokeWidth="1"/>
                <ellipse cx="65" cy="30" rx="4" ry="8" fill="#FFB6C1" stroke="#FF69B4" strokeWidth="1"/>
                
                {/* Legs */}
                <ellipse cx="35" cy="80" rx="4" ry="8" fill="#FFB6C1"/>
                <ellipse cx="45" cy="80" rx="4" ry="8" fill="#FFB6C1"/>
                <ellipse cx="55" cy="80" rx="4" ry="8" fill="#FFB6C1"/>
                <ellipse cx="65" cy="80" rx="4" ry="8" fill="#FFB6C1"/>
                
                {/* Tail */}
                <ellipse cx="25" cy="65" rx="3" ry="6" fill="#FFB6C1" transform="rotate(-30 25 65)"/>
              </svg>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-crypto-silver bg-clip-text text-transparent mb-4">
            CryptoVault Pro
          </h1>
          <p className="text-xl text-crypto-silver mb-8">
            Premium Crypto Analytics Platform
          </p>
          
          <GlassCard className="p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-semibold text-white mb-4">Welcome</h2>
            <p className="text-crypto-silver mb-6">
              Visit the Base page to access the full trading platform with real-time portfolio tracking and analytics.
            </p>
            <a 
              href="/base" 
              className="inline-block bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-pink-600 hover:to-pink-700 transition-all duration-300"
            >
              Go to Base Platform
            </a>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
