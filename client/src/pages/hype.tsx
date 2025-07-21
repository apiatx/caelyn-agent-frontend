import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  Brain, 
  ChartLine, 
  DollarSign, 
  Layers, 
  Zap, 
  Wallet,
  TrendingUp,
  Menu,
  X
} from "lucide-react";
import moodengImage from "@assets/image_1752975467353.png";
import { HypeSection } from "@/components/hype-section";

type TabType = "dashboard" | "alpha" | "charts" | "base" | "bittensor" | "abstract" | "solana" | "defi" | "portfolio" | "hype";

export default function HypePage() {
  const [location, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("hype");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    
    // Navigate to appropriate route
    switch (tab) {
      case "dashboard":
        navigate("/");
        break;
      case "solana":
        navigate("/solana");
        break;
      case "defi":
        navigate("/defi");
        break;
      case "hype":
        navigate("/hype");
        break;
      default:
        navigate("/");
        break;
    }
    
    // Reset scroll position
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tabs = [
    { id: "dashboard" as TabType, name: "Dashboard", icon: BarChart3 },
    { id: "alpha" as TabType, name: "Alpha", icon: TrendingUp },
    { id: "charts" as TabType, name: "Charts", icon: ChartLine },
    { id: "base" as TabType, name: "Base", icon: ChartLine },
    { id: "bittensor" as TabType, name: "Bittensor", icon: Brain },
    { id: "abstract" as TabType, name: "Abstract", icon: Layers },
    { id: "solana" as TabType, name: "Solana", icon: Zap },
    { id: "defi" as TabType, name: "DeFi", icon: DollarSign },
    { id: "portfolio" as TabType, name: "Portfolio", icon: Wallet },
    { id: "hype" as TabType, name: "Hype", icon: TrendingUp }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-black">
      {/* Header */}
      <header className="border-b border-crypto-silver/20 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-lg overflow-hidden">
                <img 
                  src={moodengImage} 
                  alt="CryptoHippo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">CryptoHippo</h1>
                <p className="text-xs text-crypto-silver">Premium Crypto Analytics</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'bg-crypto-primary text-white shadow-lg'
                        : 'text-crypto-silver hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden text-white p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="lg:hidden py-4 border-t border-crypto-silver/20">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                        activeTab === tab.id
                          ? 'bg-crypto-primary text-white'
                          : 'text-crypto-silver hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <HypeSection />
        </div>
      </main>
    </div>
  );
}