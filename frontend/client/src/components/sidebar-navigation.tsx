import { useState } from "react";
import { Activity, BarChart3, TrendingUp, ChartLine, Brain, Zap, DollarSign, Building2, Layers, Coins, ChevronRight, ChevronDown, ChevronLeft, Wallet, Users, MessageSquare, Rocket, Globe, ArrowLeftRight, Search, Menu, X, Gamepad2, Gem, CalendarDays, Settings, Info, Newspaper, ScrollText, Monitor, Eye, Waves, LogOut, FlaskConical, Home, LayoutGrid } from "lucide-react";
import { useLocation } from "wouter";
import caelynLogo from "@assets/ChatGPT_Image_Feb_20,_2026,_01_10_21_AM_1771571543846.png";
import { SettingsModal } from "@/pages/settings";
import { HistoryPanel } from "@/components/HistoryPanel";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarNavigationProps {
  className?: string;
  isCollapsed: boolean;
  isMobile?: boolean;
  isMobileMenuOpen?: boolean;
  onToggle: () => void;
  onCloseMobile?: () => void;
  width?: number;
  onBeginDrag?: (clientX: number) => void;
  isDragging?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: NavItem[];
}

export function SidebarNavigation({ className = "", isCollapsed, isMobile = false, isMobileMenuOpen = false, onToggle, onCloseMobile, width, onBeginDrag, isDragging = false }: SidebarNavigationProps) {
  const [location, setLocation] = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { logout } = useAuth();

  const navigateTo = (url: string) => {
    setLocation(url);
    // Close mobile menu when navigating
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  const isActive = (path: string) => {
    const currentPath = location.replace(/^\/+/, '').replace(/\/+$/, '');
    if (path === '/app' || path === '/') {
      return currentPath === '' || currentPath === 'app';
    }
    return currentPath === path.replace(/^\/+/, '').replace(/\/+$/, '');
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const navSections: { label?: string; items: NavItem[] }[] = [
    {
      items: [
        {
          id: 'home',
          label: 'Home',
          icon: <Home className="w-4 h-4" />,
          path: '/app/home'
        },
        {
          id: 'caelyn-ai',
          label: 'Terminal',
          icon: <Brain className="w-4 h-4" />,
          path: '/app/caelyn-ai'
        },
      ]
    },
    {
      label: 'MARKET INTELLIGENCE',
      items: [
        {
          id: 'macro-terminal',
          label: 'Macro',
          icon: <ChartLine className="w-4 h-4" />,
          path: '/app/macro-terminal'
        },
        {
          id: 'stocks-sectors',
          label: 'Themes',
          icon: <Layers className="w-4 h-4" />,
          path: '/app/stocks/sectors'
        },
        {
          id: 'stocks-earnings-calendar',
          label: 'Calendar',
          icon: <CalendarDays className="w-4 h-4" />,
          path: '/app/stocks/earnings-calendar'
        },
        {
          id: 'notifai',
          label: 'NotifAI',
          icon: <Newspaper className="w-4 h-4" />,
          path: '/app/notifai'
        },
      ]
    },
    {
      label: 'DISCOVERY',
      items: [
        {
          id: 'onchain-social',
          label: 'Social',
          icon: <MessageSquare className="w-4 h-4" />,
          path: '/app/onchain/social'
        },
        {
          id: 'stocks-screening',
          label: 'Screener',
          icon: <Search className="w-4 h-4" />,
          path: '/app/stocks/screening'
        },
        {
          id: 'strategy-screener',
          label: 'Strategy',
          icon: <ScrollText className="w-4 h-4" />,
          path: '/app/strategy-screener'
        },
        {
          id: 'stocks-fundamentals',
          label: 'Compare',
          icon: <TrendingUp className="w-4 h-4" />,
          path: '/app/stocks/fundamentals'
        },
      ]
    },
    {
      label: 'PORTFOLIO',
      items: [
        {
          id: 'watchlist',
          label: 'Watchlist',
          icon: <Eye className="w-4 h-4" />,
          path: '/app/watchlist'
        },
        {
          id: 'caelyn-terminal',
          label: 'Portfolio',
          icon: <Monitor className="w-4 h-4" />,
          path: '/app/caelyn-terminal'
        },
        {
          id: 'chart-radar',
          label: 'Chart Radar',
          icon: <BarChart3 className="w-4 h-4" />,
          path: '/app/chart-radar'
        },
      ]
    },
    {
      label: 'POSITIONING',
      items: [
        {
          id: 'options-flow',
          label: 'Options Flow',
          icon: <Zap className="w-4 h-4" />,
          path: '/app/options'
        },
        {
          id: 'whale-watch',
          label: 'Whale Watch',
          icon: <Waves className="w-4 h-4" />,
          path: '/app/stocks/whale-watch'
        },
        {
          id: 'stocks-insider-activity',
          label: 'Insider Activity',
          icon: <Eye className="w-4 h-4" />,
          path: '/app/stocks/insider-activity'
        },
      ]
    },
    {
      label: 'ALT MARKETS',
      items: [
        {
          id: 'hyperliquid-screener',
          label: 'Hyperliquid',
          icon: <Activity className="w-4 h-4" />,
          path: '/app/hyperliquid-screener'
        },
        {
          id: 'predict',
          label: 'Prediction Markets',
          icon: <TrendingUp className="w-4 h-4" />,
          path: '/app/predict'
        },
        {
          id: 'bittensor',
          label: 'Bittensor',
          icon: <Brain className="w-4 h-4" />,
          path: '/app/bittensor'
        },
      ]
    },
    {
      items: [
    {
      id: 'crypto',
      label: 'Crypto',
      icon: <Coins className="w-4 h-4" />,
      children: [
        {
          id: 'dashboard',
          label: 'Market Overview',
          icon: <Activity className="w-4 h-4" />,
          path: '/app/market-overview'
        },
        {
          id: 'onchain-analytics',
          label: 'Screening',
          icon: <TrendingUp className="w-4 h-4" />,
          path: '/app/onchain/analytics'
        },

        {
          id: 'onchain-analyze',
          label: 'Analyze',
          icon: <Brain className="w-4 h-4" />,
          path: '/app/onchain/analyze'
        },
        {
          id: 'charts',
          label: 'Charts',
          icon: <BarChart3 className="w-4 h-4" />,
          children: [
            {
              id: 'majors',
              label: 'Majors',
              icon: <BarChart3 className="w-4 h-4" />,
              path: '/app/charts/majors'
            },
            {
              id: 'altcoins',
              label: 'Altcoins',
              icon: <Coins className="w-4 h-4" />,
              path: '/app/charts/altcoins'
            }
          ]
        },
        {
          id: 'trade',
          label: 'Trade',
          icon: <TrendingUp className="w-4 h-4" />,
          children: [
            {
              id: 'trade-swidge',
              label: 'Swidge',
              icon: <ArrowLeftRight className="w-4 h-4" />,
              path: '/app/trade'
            },
            {
              id: 'trade-perps',
              label: 'Perps',
              icon: <TrendingUp className="w-4 h-4" />,
              path: '/app/trade/perps'
            },
            {
              id: 'trade-spot-terminals',
              label: 'Spot Terminals',
              icon: <BarChart3 className="w-4 h-4" />,
              path: '/app/trade/spot-terminals'
            },
            {
              id: 'trade-options',
              label: 'Options',
              icon: <Zap className="w-4 h-4" />,
              path: '/app/trade/options'
            },
            {
              id: 'trade-onramp',
              label: 'On Ramp',
              icon: <Wallet className="w-4 h-4" />,
              path: '/app/trade/onramp'
            }
          ]
        },
        {
          id: 'defi',
          label: 'Earn',
          icon: <DollarSign className="w-4 h-4" />,
          children: [
            {
              id: 'defi-overview',
              label: 'DeFi',
              icon: <DollarSign className="w-4 h-4" />,
              path: '/app/defi'
            },
            {
              id: 'btc-defi',
              label: 'BTC Fi',
              icon: <Coins className="w-4 h-4" />,
              path: '/app/defi/btc-defi'
            },
            {
              id: 'defai',
              label: 'DeFAI',
              icon: <Brain className="w-4 h-4" />,
              path: '/app/defi/defai'
            },
            {
              id: 'depin',
              label: 'DePIN',
              icon: <Zap className="w-4 h-4" />,
              path: '/app/defi/depin'
            },
            {
              id: 'p2e',
              label: 'P2E',
              icon: <Gamepad2 className="w-4 h-4" />,
              path: '/app/p2e'
            }
          ]
        },
        {
          id: 'ecosystems',
          label: 'Ecosystems',
          icon: <Layers className="w-4 h-4" />,
          children: [
            {
              id: 'ethereum',
              label: 'ETH',
              icon: <Coins className="w-4 h-4" />,
              path: '/app/ethereum'
            },
            {
              id: 'base',
              label: 'Base',
              icon: <ChartLine className="w-4 h-4" />,
              path: '/app/base'
            },
            {
              id: 'solana',
              label: 'Solana',
              icon: <Zap className="w-4 h-4" />,
              path: '/app/solana'
            },

            {
              id: 'bnb',
              label: 'BNB',
              icon: <Coins className="w-4 h-4" />,
              path: '/app/bnb'
            },
            {
              id: 'sui',
              label: 'SUI',
              icon: <Zap className="w-4 h-4" />,
              path: '/app/sui'
            },
            {
              id: 'arbitrum',
              label: 'Arbitrum',
              icon: <Layers className="w-4 h-4" />,
              path: '/app/arbitrum'
            },
          ]
        },
        {
          id: 'onchain',
          label: 'Onchain',
          icon: <BarChart3 className="w-4 h-4" />,
          children: [
            {
              id: 'onchain-smart-wallets',
              label: 'Smart Wallets',
              icon: <Wallet className="w-4 h-4" />,
              path: '/app/onchain/smart-wallets'
            },
            {
              id: 'onchain-launchpad',
              label: 'Launchpad',
              icon: <Rocket className="w-4 h-4" />,
              path: '/app/onchain/launchpad'
            },
            {
              id: 'onchain-airdrop',
              label: 'Airdrop',
              icon: <Zap className="w-4 h-4" />,
              path: '/app/onchain/airdrop'
            },
            {
              id: 'onchain-memes',
              label: 'Memes',
              icon: <Coins className="w-4 h-4" />,
              path: '/app/onchain/memes'
            },
            {
              id: 'onchain-discover',
              label: 'Discover Web3',
              icon: <Globe className="w-4 h-4" />,
              path: '/app/onchain/discover'
            }
          ]
        },
        {
          id: 'crypto-stonks',
          label: 'Treasuries',
          icon: <Building2 className="w-4 h-4" />,
          path: '/app/crypto-stonks'
        },
        {
          id: 'portfolio',
          label: 'Portfolio',
          icon: <Activity className="w-4 h-4" />,
          path: '/app/portfolio'
        },
      ]
    },
    {
      id: 'commodities',
      label: 'Commodities',
      icon: <Gem className="w-4 h-4" />,
      path: '/app/commodities'
    },
    {
      id: 'rwa',
      label: 'Tokenization',
      icon: <Building2 className="w-4 h-4" />,
      path: '/app/rwa'
    },
    {
      id: 'dev-qa',
      label: 'QA Panel',
      icon: <FlaskConical className="w-4 h-4" />,
      path: '/app/dev/qa'
    },
      ]
    },
  ];

  const hasActiveDescendant = (item: NavItem): boolean => {
    if (!item.children) return false;
    return item.children.some(child => 
      (child.path && isActive(child.path)) || hasActiveDescendant(child)
    );
  };

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = !isCollapsed && expandedItems.includes(item.id);
    const itemIsActive = item.path ? isActive(item.path) : false;
    const hasActiveChild = hasActiveDescendant(item);
    const indent = !isCollapsed && level > 0 ? level * 12 : 0;

    return (
      <div key={item.id} className="w-full">
        {hasChildren ? (
          <button
            onClick={() => !isCollapsed && toggleExpanded(item.id)}
            title={isCollapsed ? item.label : undefined}
            style={indent > 0 ? { marginLeft: indent } : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-2 ${isMobile ? 'py-3' : 'py-1.5'} text-left text-xs font-medium transition-all duration-200 rounded-lg group ${
              hasActiveChild
                ? "bg-white/[0.06] border-l-2 border-[hsl(200,90%,58%)] text-white"
                : "text-white hover:bg-white/[0.04]"
            }`}
            data-testid={`nav-${item.id}`}
          >
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
              {item.icon}
              {!isCollapsed && <span>{item.label}</span>}
            </div>
            {!isCollapsed && (
              <span className="shrink-0 ml-1">
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200" />
                )}
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={() => item.path && navigateTo(item.path)}
            title={isCollapsed ? item.label : undefined}
            style={indent > 0 ? { marginLeft: indent } : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} px-2 ${isMobile ? 'py-3' : 'py-1.5'} text-left text-xs font-medium transition-all duration-200 rounded-lg group ${
              itemIsActive
                ? "bg-white/[0.06] border-l-2 border-[hsl(200,90%,58%)] text-white shadow-md"
                : "text-white hover:bg-white/[0.04]"
            }`}
            data-testid={`nav-${item.id}`}
          >
            {item.icon}
            {!isCollapsed && <span>{item.label}</span>}
          </button>
        )}

        {hasChildren && isExpanded && !isCollapsed && (
          <div className="mt-0.5 space-y-0.5">
            {item.children!.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 lg:hidden flex items-center justify-between px-4 h-14 border-b border-white/[0.06]" style={{ background: '#060709' }}>
          <div className="flex items-center gap-3">
            <img src={caelynLogo} alt="CaelynAI" className="w-10 h-10 rounded-full" />
            <span style={{ fontSize:'0.85rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', background:'linear-gradient(135deg, #e0f0ff 0%, #5cc8f0 40%, #3b9ee6 70%, #2080c8 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', fontFamily:"'Inter', -apple-system, sans-serif" }}>CaelynAI</span>
          </div>
          <button
            onClick={onToggle}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-2.5 text-white/45 hover:text-white transition-all"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      )}
      
      <div
        id="mobile-navigation-menu"
        className={`fixed top-0 h-full ${
          isMobile
            ? `right-0 w-full transform transition-transform duration-300 ease-in-out ${
                isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
              }`
            : `left-0`
        } border-r border-white/[0.06] ${
          isMobile ? 'z-50' : 'z-40'
        } flex flex-col ${className}`}
        style={{
          background: '#060709',
          ...(isMobile ? {} : {
            width: width ?? (isCollapsed ? 64 : 192),
            transition: isDragging ? 'none' : 'width 0.2s ease-in-out',
          }),
        }}
        aria-hidden={isMobile && !isMobileMenuOpen}
        inert={isMobile && !isMobileMenuOpen ? true : undefined}
      >

        {/* Desktop drag handle — sits on the right edge of the sidebar */}
        {!isMobile && (
          <div
            onMouseDown={(e) => { e.preventDefault(); onBeginDrag?.(e.clientX); }}
            title="Drag to resize sidebar"
            data-testid="sidebar-drag-handle"
            style={{
              position: 'absolute',
              top: 0,
              right: -3,
              width: 6,
              height: '100%',
              cursor: 'ew-resize',
              zIndex: 60,
              background: 'transparent',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(92,200,240,0.18)'; }}
            onMouseLeave={(e) => { if (!isDragging) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          />
        )}

      {/* Logo — collapses when sidebar is collapsed */}
      {!isMobile && (
      <div className="flex-shrink-0 flex flex-col items-center justify-center" style={{ width:'100%', borderBottom: isCollapsed ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
        <div className="overflow-hidden" style={{ transition: 'max-height 0.3s ease-in-out, opacity 0.25s ease-in-out, padding 0.3s ease-in-out', maxHeight: isCollapsed ? 0 : 200, opacity: isCollapsed ? 0 : 1, padding: isCollapsed ? '0' : '4px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={caelynLogo}
            alt="CaelynAI"
            style={{ width: '100%', height: 'auto', objectFit: 'contain', display: 'block' }}
            data-testid="logo-cryptohippo"
          />
        </div>
      </div>
      )}

      {/* Navigation Items - Scrollable Area */}
      <div className={`flex-1 min-h-0 overflow-y-auto pl-2 pr-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-crypto-silver/20 scrollbar-track-transparent ${isMobile ? 'pt-16' : ''}`}>
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className={sIdx > 0 ? 'mt-3' : ''}>
            {section.label && !isCollapsed && (
              <div className="px-2 mb-1 text-[9px] font-bold tracking-widest text-white/20 uppercase select-none">
                {section.label}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => renderNavItem(item))}
            </div>
          </div>
        ))}
      </div>

      {/* Pinned Bottom: Settings + About */}
      <div className="flex-shrink-0 border-t border-white/[0.06] px-2 py-2 space-y-0.5">
        <button
          onClick={() => setSettingsOpen(true)}
          title={isCollapsed ? "Settings" : undefined}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} px-2 ${isMobile ? 'py-3' : 'py-1.5'} text-left text-xs font-medium transition-all duration-200 rounded-lg text-white hover:bg-white/[0.04]`}
          data-testid="nav-settings"
        >
          <Settings className="w-4 h-4" />
          {!isCollapsed && <span>Settings</span>}
        </button>
        <button
          onClick={() => setHistoryOpen(true)}
          title={isCollapsed ? "History" : undefined}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} px-2 ${isMobile ? 'py-3' : 'py-1.5'} text-left text-xs font-medium transition-all duration-200 rounded-lg text-white hover:bg-white/[0.04]`}
          data-testid="nav-history"
        >
          <ScrollText className="w-4 h-4" />
          {!isCollapsed && <span>History</span>}
        </button>
        <button
          onClick={() => navigateTo('/app/about')}
          title={isCollapsed ? "About" : undefined}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} px-2 ${isMobile ? 'py-3' : 'py-1.5'} text-left text-xs font-medium transition-all duration-200 rounded-lg ${
            isActive('/app/about')
              ? "bg-white/[0.06] border-l-2 border-[hsl(200,90%,58%)] text-white shadow-md"
              : "text-white hover:bg-white/[0.04]"
          }`}
          data-testid="nav-about"
        >
          <Info className="w-4 h-4" />
          {!isCollapsed && <span>About</span>}
        </button>
        <button
          onClick={() => logout()}
          title={isCollapsed ? "Log out" : undefined}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} px-2 ${isMobile ? 'py-3' : 'py-1.5'} text-left text-xs font-medium transition-all duration-200 rounded-lg text-white/30 hover:bg-white/[0.04] hover:text-white/60`}
          data-testid="nav-logout"
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span>Log out</span>}
        </button>
      </div>

      {/* Footer */}
      {(!isCollapsed || isMobile) && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-white/[0.06]">
          <div className="text-[10px] text-center text-white/20">
            © 2026 CaelynAI
          </div>
        </div>
      )}
    </div>

    {/* Settings Modal */}
    <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    {/* History Panel */}
    <HistoryPanel isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}