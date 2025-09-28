import { useState } from "react";
import { Activity, BarChart3, TrendingUp, ChartLine, Brain, Zap, DollarSign, Building2, Layers, Coins, ChevronRight, ChevronDown, ChevronLeft, Wallet, Users, MessageSquare, Rocket, Globe, ArrowLeftRight, Search, Menu, X } from "lucide-react";
import { useLocation } from "wouter";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";

interface SidebarNavigationProps {
  className?: string;
  isCollapsed: boolean;
  isMobile?: boolean;
  isMobileMenuOpen?: boolean;
  onToggle: () => void;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: NavItem[];
}

export function SidebarNavigation({ className = "", isCollapsed, isMobile = false, isMobileMenuOpen = false, onToggle, onCloseMobile }: SidebarNavigationProps) {
  const [location, setLocation] = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(isCollapsed ? [] : ['charts', 'onchain', 'ecosystems', 'trade', 'tradfi']);

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

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Market Overview',
      icon: <Activity className="w-4 h-4" />,
      path: '/app'
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
      id: 'onchain',
      label: 'Onchain',
      icon: <BarChart3 className="w-4 h-4" />,
      children: [
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
          id: 'onchain-inspect',
          label: 'Inspect',
          icon: <Search className="w-4 h-4" />,
          path: '/app/onchain/inspect'
        },
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
          id: 'bittensor',
          label: 'Bittensor',
          icon: <Brain className="w-4 h-4" />,
          path: '/app/bittensor'
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
      label: 'DeFi',
      icon: <DollarSign className="w-4 h-4" />,
      path: '/app/defi'
    },
    {
      id: 'tradfi',
      label: 'TradFi',
      icon: <Building2 className="w-4 h-4" />,
      children: [
        {
          id: 'rwa',
          label: 'RWA',
          icon: <Building2 className="w-4 h-4" />,
          path: '/app/rwa'
        },
        {
          id: 'crypto-stocks',
          label: 'Stonks',
          icon: <TrendingUp className="w-4 h-4" />,
          path: '/app/crypto-stocks'
        },
        {
          id: 'crypto-stonks',
          label: 'Crypto Stonks',
          icon: <Building2 className="w-4 h-4" />,
          path: '/app/crypto-stonks'
        },
        {
          id: 'commodities',
          label: 'Commodities',
          icon: <Coins className="w-4 h-4" />,
          path: '/app/commodities'
        }
      ]
    },
    {
      id: 'portfolio',
      label: 'Portfolio',
      icon: <Activity className="w-4 h-4" />,
      path: '/app/portfolio'
    },
    {
      id: 'predict',
      label: 'Predict',
      icon: <TrendingUp className="w-4 h-4" />,
      path: '/app/predict'
    },
    {
      id: 'onchain-social',
      label: 'Social',
      icon: <MessageSquare className="w-4 h-4" />,
      path: '/app/onchain/social'
    },
    {
      id: 'about',
      label: 'About',
      icon: <Activity className="w-4 h-4" />,
      path: '/app/about'
    }
  ];

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = !isCollapsed && expandedItems.includes(item.id);
    const itemIsActive = item.path ? isActive(item.path) : false;
    const hasActiveChild = item.children?.some(child => child.path ? isActive(child.path) : false);

    return (
      <div key={item.id} className="w-full">
        {hasChildren ? (
          <button
            onClick={() => !isCollapsed && toggleExpanded(item.id)}
            title={isCollapsed ? item.label : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2 text-left text-sm font-medium transition-all duration-200 rounded-lg group ${
              hasActiveChild
                ? "bg-gradient-to-r from-crypto-warning/20 to-yellow-400/10 border-l-2 border-crypto-warning text-white"
                : "text-gray-300 hover:bg-white/5 hover:text-white"
            } ${level > 0 && !isCollapsed ? 'ml-4' : ''}`}
            data-testid={`nav-${item.id}`}
          >
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
              {item.icon}
              {!isCollapsed && <span>{item.label}</span>}
            </div>
            {!isCollapsed && (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 transition-transform duration-200" />
              ) : (
                <ChevronRight className="w-4 h-4 transition-transform duration-200" />
              )
            )}
          </button>
        ) : (
          <button
            onClick={() => item.path && navigateTo(item.path)}
            title={isCollapsed ? item.label : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 text-left text-sm font-medium transition-all duration-200 rounded-lg group ${
              itemIsActive
                ? "bg-gradient-to-r from-crypto-warning/20 to-yellow-400/10 border-l-2 border-crypto-warning text-white shadow-md"
                : "text-gray-300 hover:bg-white/5 hover:text-white"
            } ${level > 0 && !isCollapsed ? 'ml-4' : ''}`}
            data-testid={`nav-${item.id}`}
          >
            {item.icon}
            {!isCollapsed && <span>{item.label}</span>}
          </button>
        )}

        {hasChildren && isExpanded && !isCollapsed && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Hamburger Menu Button */}
      {isMobile && (
        <div className="fixed top-4 left-4 z-50 lg:hidden">
          <button
            onClick={onToggle}
            className="bg-black/90 backdrop-blur-lg border border-crypto-silver/20 rounded-lg p-2 text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200 shadow-lg"
            data-testid="mobile-menu-toggle"
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation-menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      )}
      
      <div 
        id="mobile-navigation-menu"
        className={`fixed left-0 top-0 h-full ${
          isMobile 
            ? `w-80 transform transition-transform duration-300 ease-in-out ${
                isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
              }` 
            : isCollapsed 
              ? 'w-16' 
              : 'w-64'
        } bg-black/95 backdrop-blur-lg border-r border-crypto-silver/20 ${
          isMobile ? 'z-50' : 'z-40'
        } ${!isMobile ? 'transition-all duration-300 ease-in-out' : ''} flex flex-col ${className}`}
        aria-hidden={isMobile && !isMobileMenuOpen}
        inert={isMobile && !isMobileMenuOpen ? true : undefined}
      >
        
        {/* Desktop Toggle Button */}
        {!isMobile && (
          <div className="absolute -right-3 top-6 z-50">
            <button
              onClick={onToggle}
              className="bg-black/90 backdrop-blur-lg border border-crypto-silver/20 rounded-full p-1.5 text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200 shadow-lg"
              data-testid="toggle-sidebar"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

      {/* Header with Logo */}
      <div className="flex-shrink-0 p-4 border-b border-crypto-silver/20">
        <div className={`flex items-center ${isCollapsed && !isMobile ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-yellow-400 shadow-lg">
            <img 
              src={cryptoHippoImage}
              alt="CryptoHippo"
              className="w-full h-full object-cover"
              data-testid="logo-cryptohippo"
            />
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="flex flex-col">
              <span className="text-white font-bold text-lg">CryptoHippo</span>
              <span className="text-gray-400 text-xs">Trading Dashboard</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Items - Scrollable Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-4 space-y-1 scrollbar-thin scrollbar-thumb-crypto-silver/20 scrollbar-track-transparent">
        {navItems.map(item => renderNavItem(item))}
      </div>

      {/* Footer */}
      {(!isCollapsed || isMobile) && (
        <div className="flex-shrink-0 p-4 border-t border-crypto-silver/20">
          <div className="text-xs text-gray-400 text-center">
            © 2024 CryptoHippo
          </div>
        </div>
      )}
    </div>
    </>
  );
}