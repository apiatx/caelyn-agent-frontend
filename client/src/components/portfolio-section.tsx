import { useState, useEffect } from "react";
import { Wallet, ExternalLink, TrendingUp, Edit3, Save, Plus, Activity, ChevronDown, BarChart3, Brain } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePortfolio } from "@/hooks/use-portfolio";
import { usePortfolioValueHistory } from "@/hooks/use-portfolio-value-history";
import { Skeleton } from "@/components/ui/skeleton";
import { HoldingDetailModal } from "@/components/holding-detail-modal";
import { DataIntegrityNotice } from "@/components/data-integrity-notice";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDeBankPortfolio } from "@/hooks/use-debank-portfolio";
import { useStakingData } from "@/hooks/use-staking-data";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Holding, Subnet } from "@shared/schema";
import { getSecureIframeProps, getSecureLinkProps } from "@/utils/security";
import ethereumLogo from "@assets/Ethereum_logo_2014.svg_1755977414942.png";
import solanaLogo from "@assets/solana_1755977414939.png";
import bittensorLogo from "@assets/bittensor_1755977414942.png";
import hyperliquidLogo from "@assets/hyperliquid-logo_1755977414943.png";
import smartWalletsImage from "@assets/download (1)_1757198511747.png";


export default function PortfolioSection() {
  const { data: portfolio, isLoading } = usePortfolio(1);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [selectedWallet, setSelectedWallet] = useState('total'); // 'total', 'base', 'tao'
  const { data: portfolioHistory, isLoading: isHistoryLoading } = usePortfolioValueHistory(1, selectedTimeframe);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [isEditingWallets, setIsEditingWallets] = useState(false);
  const [baseWalletAddress, setBaseWalletAddress] = useState('');
  const [taoWalletAddress, setTaoWalletAddress] = useState('');
  const [isBaseHoldingsOpen, setIsBaseHoldingsOpen] = useState(true);
  const [isTaoHoldingsOpen, setIsTaoHoldingsOpen] = useState(false);

  // Get DeBank portfolio data using the BASE wallet address
  const { data: debankData, isLoading: isDebankLoading } = useDeBankPortfolio(
    portfolio?.baseWalletAddress || baseWalletAddress
  );

  // Debug logging to see what data we're getting
  useEffect(() => {
    console.log('🔍 Portfolio State:', {
      portfolioWallet: portfolio?.baseWalletAddress,
      localWallet: baseWalletAddress,
      finalWallet: portfolio?.baseWalletAddress || baseWalletAddress,
      timestamp: new Date().toLocaleTimeString()
    });
  }, [portfolio, baseWalletAddress]);

  useEffect(() => {
    if (debankData) {
      console.log('🔍 DeBank Data Received:', {
        success: debankData.success,
        totalValue: debankData.data?.totalValue,
        tokensCount: debankData.data?.topTokens?.length,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  }, [debankData]);

  // Get staking data for the wallet
  const { data: stakingData, isLoading: isStakingLoading } = useStakingData(
    portfolio?.baseWalletAddress || baseWalletAddress
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 p-6">
      {/* PORTFOLIO Section - Enhanced Header */}
      <div className="text-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-blue-500/20 blur-3xl -z-10"></div>
        <div className="flex justify-center items-center gap-4 mb-6">
          <img 
            src={smartWalletsImage} 
            alt="Portfolio" 
            className="w-16 h-16 rounded-xl object-cover border-2 border-yellow-400 shadow-2xl shadow-cyan-500/30 hover:scale-110 transition-transform duration-300"
          />
          <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-cyan-200 to-emerald-200 bg-clip-text text-transparent">Portfolio</h2>
        </div>
        <p className="text-lg text-white/80 font-medium tracking-wide">Advanced Cross-Chain Portfolio Management & Analytics</p>
        <div className="w-32 h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 mx-auto mt-4 rounded-full"></div>
      </div>

      {/* Portfolio Sections - Individual Glass Cards */}
      <div className="space-y-8">
        
        {/* Multi-Chain Section */}
        <div className="bg-black/90 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-8 shadow-2xl">
          <div className="space-y-8">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-300 bg-clip-text text-transparent">Multi-Chain</h4>
            </div>
            
            {/* BBTerminal Portfolio Iframe */}
            <div className="w-full bg-black/20 border border-crypto-silver/20 rounded-lg p-4 shadow-lg">
              <iframe
                src="https://app.bbterminal.com/portfolio"
                title="BBTerminal Portfolio"
                className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
                frameBorder="0"
                loading="lazy"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
                referrerPolicy="strict-origin-when-cross-origin"
                style={{
                  background: '#000000',
                  colorScheme: 'dark'
                }}
              />
            </div>
            
            <Button
              variant="outline"
              onClick={() => window.open('https://cerebro.xyz/dashboard', '_blank', 'noopener,noreferrer')}
              className="group w-full bg-gradient-to-br from-cyan-600/30 via-blue-600/20 to-indigo-600/30 border-cyan-400/40 hover:from-cyan-500/40 hover:via-blue-500/30 hover:to-indigo-500/40 hover:border-cyan-300/60 text-white justify-start p-6 h-auto shadow-xl hover:shadow-cyan-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center mr-4 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-xl">Cerebro</div>
                <div className="text-sm text-cyan-200/90 font-medium">Advanced Multi-Chain Portfolio Analytics & Tracking</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-cyan-500/30 text-cyan-200 border-cyan-400/40 px-3 py-1 font-semibold">
                  MULTI-CHAIN
                </Badge>
                <ExternalLink className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </div>
            </Button>
          </div>
        </div>

        {/* EVM Section */}
        <div className="bg-black/90 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-8 shadow-2xl">
          <div className="space-y-8">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                <img src={ethereumLogo} alt="Ethereum" className="w-8 h-8 rounded-lg" />
              </div>
              <h4 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-300 bg-clip-text text-transparent">EVM</h4>
            </div>
            <Button
              variant="outline"
              onClick={() => window.open('https://debank.com/profile', '_blank', 'noopener,noreferrer')}
              className="group w-full bg-gray-900/80 border-gray-600/40 hover:bg-gray-800/90 hover:border-gray-500/60 text-white justify-start p-6 h-auto shadow-xl hover:shadow-gray-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mr-4 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-xl">DeBank</div>
                <div className="text-sm text-gray-300 font-medium">Professional EVM Portfolio Tracking & Analytics</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-gray-700/50 text-gray-300 border-gray-600/40 px-3 py-1 font-semibold">
                  EVM CHAINS
                </Badge>
                <ExternalLink className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </div>
            </Button>
          </div>
        </div>

        {/* Solana Section */}
        <div className="bg-black/90 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-8 shadow-2xl">
          <div className="space-y-8">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                <img src={solanaLogo} alt="Solana" className="w-8 h-8 rounded-lg" />
              </div>
              <h4 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-violet-300 bg-clip-text text-transparent">Solana</h4>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="text-xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-violet-400 bg-clip-text text-transparent">Jupiter Portfolio Tracker</h5>
                <button
                  onClick={() => window.open('https://jup.ag/portfolio', '_blank', 'noopener,noreferrer')}
                  className="text-purple-300 hover:text-purple-200 text-sm font-medium bg-purple-500/20 px-4 py-2 rounded-lg border border-purple-400/30 hover:bg-purple-500/30 transition-all duration-300 flex items-center gap-2"
                >
                  Open Full View <ExternalLink className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-gradient-to-br from-slate-900/80 via-gray-900/80 to-purple-900/30 rounded-2xl border border-purple-400/20 overflow-hidden shadow-2xl">
                <iframe
                  src="https://jup.ag/portfolio"
                  className="w-full h-[600px] sm:h-[700px] lg:h-[800px] border-0"
                  title="Jupiter Portfolio"
                  frameBorder="0"
                  loading="lazy"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  style={{
                    background: 'transparent',
                    colorScheme: 'dark'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* HyperLiquid Section */}
        <div className="bg-black/90 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-8 shadow-2xl">
          <div className="space-y-8">
            {/* HyperLiquid Portfolio Iframe */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                    <img src={hyperliquidLogo} alt="HyperLiquid" className="w-8 h-8 rounded-lg" />
                  </div>
                  <h4 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent">HyperLiquid</h4>
                </div>
                <button
                  onClick={() => window.open('https://app.hyperliquid.xyz/portfolio', '_blank', 'noopener,noreferrer')}
                  className="text-teal-300 hover:text-teal-200 text-sm font-medium bg-teal-500/20 px-4 py-2 rounded-lg border border-teal-400/30 hover:bg-teal-500/30 transition-all duration-300 flex items-center gap-2"
                >
                  Open Full View <ExternalLink className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-gradient-to-br from-slate-900/80 via-gray-900/80 to-teal-900/30 rounded-2xl border border-teal-400/20 overflow-hidden shadow-2xl">
                <iframe
                  src="https://app.hyperliquid.xyz/portfolio"
                  className="w-full h-[600px] sm:h-[700px] lg:h-[800px] border-0"
                  title="HyperLiquid Portfolio"
                  frameBorder="0"
                  loading="lazy"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  style={{
                    background: 'transparent',
                    colorScheme: 'dark'
                  }}
                />
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={() => window.open('https://app.coinmarketman.com/hypertracker', '_blank', 'noopener,noreferrer')}
              className="group w-full bg-gradient-to-br from-teal-600/30 via-cyan-600/20 to-blue-600/30 border-teal-400/40 hover:from-teal-500/40 hover:via-cyan-500/30 hover:to-blue-500/40 hover:border-teal-300/60 text-white justify-start p-6 h-auto shadow-xl hover:shadow-teal-500/20 transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-xl flex items-center justify-center mr-4 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-xl">CoinMarketMan</div>
                <div className="text-sm text-teal-200/90 font-medium">Professional HyperLiquid Perpetuals Portfolio Analytics</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-teal-500/30 text-teal-200 border-teal-400/40 px-3 py-1 font-semibold">
                  PERPS
                </Badge>
                <ExternalLink className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </div>
            </Button>
          </div>
        </div>

        {/* Bittensor Section */}
        <div className="bg-black/90 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-8 shadow-2xl">
          <div className="space-y-8">
            {/* TaoHub Portfolio Iframe */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                    <img src={bittensorLogo} alt="Bittensor" className="w-8 h-8 rounded-lg" />
                  </div>
                  <h4 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-300 bg-clip-text text-transparent">Bittensor</h4>
                </div>
                <button
                  onClick={() => window.open('https://www.taohub.info/portfolio', '_blank', 'noopener,noreferrer')}
                  className="text-orange-300 hover:text-orange-200 text-sm font-medium bg-orange-500/20 px-4 py-2 rounded-lg border border-orange-400/30 hover:bg-orange-500/30 transition-all duration-300 flex items-center gap-2"
                >
                  Open Full View <ExternalLink className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-gradient-to-br from-slate-900/80 via-gray-900/80 to-orange-900/30 rounded-2xl border border-orange-400/20 overflow-hidden shadow-2xl">
                <iframe
                  src="https://www.taohub.info/portfolio"
                  className="w-full h-[600px] sm:h-[700px] lg:h-[800px] border-0"
                  title="TaoHub Portfolio"
                  frameBorder="0"
                  loading="lazy"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  style={{
                    background: 'transparent',
                    colorScheme: 'dark'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Holding Detail Modal */}
      <HoldingDetailModal 
        holding={selectedHolding}
        subnets={[]}
        onClose={() => setSelectedHolding(null)}
      />
    </div>
  );
}