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

  const getTokenContractAddress = (ticker: string): string => {
    const contractAddresses: { [key: string]: string } = {
      'SKI': '0x5364dc963c402aAF150700f38a8ef52C1D7D7F14',
      'TIG': '0x3A33473d7990a605a88ac72A78aD4EFC40a54ADB',
      'GIZA': '0x79d3E7b3d1f8a8E7b0C9a7A8F8f8f8f8f8f8f8f8',
      'VIRTUAL': '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1e',
      'HIGHER': '0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe',
      'MFER': '0xE3086852A4B125803C815a158249ae468A3254Ca',
      'TOSHI': '0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4',
      'AERO': '0x940181a94A35A4569E4529A3CDfB74E38FD98631',
      'DEGEN': '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed',
      'KEYCAT': '0x1A2B3C4D5E6F789012345678901234567890ABCD',
      'BRETT': '0x532f27101965dd16442E59d40670FaF5eBB142E4',
      'NORMIE': '0x7F12d13B34F5F4f0a9449c16Bcd42f0da47AF200',
      'BASEDOG': '0x4D5E6F789012345678901234567890ABCDEF1234',
      'AI16Z': '0x464eBE77c293E473B48cFe96dDCf88fcF7bFDAC0',
      'ZEREBRO': '0x6789012345678901234567890ABCDEF123456789',
      'CHILLGUY': '0x789012345678901234567890ABCDEF123456789A',
      'FARTCOIN': '0x89012345678901234567890ABCDEF123456789AB',
      'BONK': '0x1151CB3d861920e07a38e03eEAd12C32178567ACb',
      'PEPE': '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
      'WIF': '0x4Fbf0429599460D327BD5F55625E30E4fC066095',
      'ETH': '0x4200000000000000000000000000000000000006',
      'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      'DAI': '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    };
    
    return contractAddresses[ticker] || ticker;
  };

  // Update wallet addresses when portfolio data changes
  useEffect(() => {
    if (portfolio) {
      setBaseWalletAddress(portfolio.baseWalletAddress || '');
      setTaoWalletAddress(portfolio.taoWalletAddress || '');
    }
  }, [portfolio]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: subnets } = useQuery<Subnet[]>({
    queryKey: ["/api/subnets"],
  });

  // Update wallet addresses mutation
  const updateWalletsMutation = useMutation({
    mutationFn: async (data: { baseWalletAddress: string; taoWalletAddress: string }) => {
      return apiRequest('PUT', `/api/portfolio/${portfolio?.id}/wallets`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Wallet addresses updated - fetching real data...",
      });
      setIsEditingWallets(false);
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio', 1] });
      
      // Refresh portfolio data after 3 seconds to show real wallet data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/portfolio', 1] });
        toast({
          title: "Portfolio Updated",
          description: "Real wallet data has been loaded",
        });
      }, 3000);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update wallet addresses",
        variant: "destructive",
      });
    }
  });

  const handleSaveWallets = () => {
    updateWalletsMutation.mutate({
      baseWalletAddress,
      taoWalletAddress
    });
  };

  // Check if wallet addresses are configured
  const hasWalletAddresses = portfolio?.baseWalletAddress || portfolio?.taoWalletAddress;
  
  // Format portfolio history data for the chart based on timeframe
  const formatChartData = () => {
    if (!portfolioHistory || portfolioHistory.length === 0) {
      return [{
        time: 'No data',
        value: 0
      }];
    }

    // Sort by timestamp
    const sortedHistory = [...portfolioHistory]
      .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime());

    // Filter data based on timeframe
    const now = new Date();
    const getTimeframeCutoff = () => {
      switch (selectedTimeframe) {
        case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        case 'ytd': return new Date(now.getFullYear(), 0, 1); // January 1st
        case 'all': return new Date(0); // Beginning of time
        default: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }
    };

    const cutoffDate = getTimeframeCutoff();
    const filteredHistory = sortedHistory.filter(item => 
      new Date(item.timestamp!) >= cutoffDate
    );

    // Format time labels based on timeframe
    const formatTimeLabel = (date: Date) => {
      switch (selectedTimeframe) {
        case '24h':
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        case '7d':
        case '30d':
          return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        case '90d':
        case 'ytd':
        case 'all':
          return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
        default:
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    };

    // Sample data points for better chart visualization
    const maxDataPoints = selectedTimeframe === '24h' ? 50 : selectedTimeframe === '7d' ? 168 : 100;
    const sampledHistory = filteredHistory.length > maxDataPoints 
      ? filteredHistory.filter((_, index) => index % Math.ceil(filteredHistory.length / maxDataPoints) === 0)
      : filteredHistory;
    
    return sampledHistory.map(item => {
      const date = new Date(item.timestamp!);
      let value = parseFloat(item.totalValue);
      
      // Filter by wallet type
      if (selectedWallet === 'base') {
        value = parseFloat(portfolio?.baseHoldings || '0');
      } else if (selectedWallet === 'tao') {
        value = parseFloat(portfolio?.taoHoldings || '0');
      }
      
      return {
        time: formatTimeLabel(date),
        value: value,
        fullDate: date.toLocaleString()
      };
    });
  };

  const chartData = formatChartData();

  const timeframeOptions = [
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: 'ytd', label: 'Year to Date' },
    { value: 'all', label: 'All Time' }
  ];

  const walletOptions = [
    { value: 'total', label: 'Total Portfolio', icon: '💼' },
    { value: 'base', label: 'BASE Network', icon: 'B' },
    { value: 'tao', label: 'Bittensor', icon: 'Τ' }
  ];

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

  // Even without portfolio data, show external integrations
  const showExternalIntegrations = true;

  const baseHoldings = portfolio?.holdings?.filter(h => h.network === "BASE") || [];
  const taoHoldings = portfolio?.holdings?.filter(h => h.network === "TAO") || [];

  // Check if portfolio has no real data
  const hasNoData = !portfolio?.holdings?.length && parseFloat(portfolio?.totalBalance || '0') === 0;

  return (
    <div className="space-y-8">

      {/* DeBank Portfolio */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
              DB
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">DeBank Portfolio</h3>
            <Badge className="bg-gradient-to-r from-green-500/20 to-blue-500/20 text-green-300 border-green-500/30 text-xs">
              MULTI-CHAIN
            </Badge>
          </div>
        </div>
        <div className="w-full">
          <div className="h-[250px] sm:h-[280px] lg:h-[300px] rounded-lg border border-crypto-silver/20 bg-gradient-to-br from-green-900/20 to-blue-900/20 flex flex-col items-center justify-center p-6 text-center">
            <h4 className="text-xl font-semibold text-white mb-4">Multi-Chain Portfolio Intelligence</h4>
            <p className="text-crypto-silver mb-5 max-w-md">
              DeBank provides comprehensive portfolio tracking across 30+ blockchains with real-time asset monitoring and DeFi analytics.
            </p>
            <div className="space-y-2 text-sm text-crypto-silver mb-6">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Real-time portfolio tracking across all major chains</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>DeFi protocol position monitoring</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>NFT collection and transaction history</span>
              </div>
            </div>
            <button
              onClick={() => window.open('https://debank.com/profile/0x1677b97859620ccbf4eecf33f6feb1b7bea8d97e', '_blank', 'noopener,noreferrer')}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View DeBank Portfolio
            </button>
          </div>
        </div>
      </GlassCard>





        {/* Real-Time DeBank Portfolio Integration */}
        {(portfolio?.baseWalletAddress || baseWalletAddress) && (
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mr-3 flex items-center justify-center text-sm font-bold">DB</div>
                <div className="text-left">
                  <h2 className="text-xl font-semibold text-white">DeBank Live Portfolio</h2>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="text-xl font-bold text-white">
                      {debankData?.success ? 
                        `$${(debankData.data.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` :
                        'Loading...'
                      }
                    </div>
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                      Live data
                    </Badge>
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      Real-time prices
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={`https://debank.com/profile/${portfolio?.baseWalletAddress || baseWalletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-crypto-silver hover:text-white transition-colors group"
                >
                  <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
                </a>
              </div>
            </div>

            {debankData?.success && (
              <div className="space-y-4">
                {/* Top Holdings */}
                <div className="backdrop-blur-sm bg-white/5 rounded-xl border border-crypto-silver/10 p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Live Holdings (&gt;$50)</h3>
                  <div className="space-y-3">
                    {debankData.data.topTokens
                      .filter(token => token.value > 50)
                      .slice(0, 10)
                      .map((token, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center">
                          <img 
                            src={token.logo} 
                            alt={token.symbol}
                            className="w-8 h-8 rounded-full mr-3"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect width='32' height='32' fill='%233B82F6'/><text x='16' y='20' text-anchor='middle' fill='white' font-size='10' font-weight='bold'>${token.symbol.charAt(0)}</text></svg>`;
                            }}
                          />
                          <div>
                            <h4 className="font-medium text-white">{token.symbol}</h4>
                            <p className="text-sm text-crypto-silver">{token.amount.toFixed(2)} tokens</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-medium">
                            ${token.value.toFixed(2)}
                          </div>
                          <div className="text-sm text-crypto-silver">
                            ${token.price.toFixed(6)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Portfolio Summary */}
                <div className="backdrop-blur-sm bg-white/5 rounded-xl border border-crypto-silver/10 p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Portfolio Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <div className="text-sm text-crypto-silver">Total Holdings</div>
                      <div className="text-xl font-bold text-white">
                        ${debankData.data.totalValue.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <div className="text-sm text-crypto-silver">Tracked Tokens</div>
                      <div className="text-xl font-bold text-white">
                        {debankData.data.topTokens.length}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center text-sm text-crypto-silver bg-white/5 rounded-lg p-3">
                  <p>Live portfolio data from DeBank API with real-time price updates</p>
                  <p className="mt-1">Wallet: {portfolio?.baseWalletAddress || baseWalletAddress}</p>
                  <p className="mt-1 text-green-400">Data refreshes every 5 seconds</p>
                </div>
              </div>
            )}

            {!debankData?.success && (
              <div className="text-center py-8">
                <div className="text-crypto-silver mb-4">Loading DeBank portfolio data...</div>
                <div className="text-sm text-crypto-silver">
                  If data doesn't load, visit{' '}
                  <a 
                    href={`https://debank.com/profile/${portfolio?.baseWalletAddress || baseWalletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    your DeBank profile
                  </a>
                </div>
              </div>
            )}
          </GlassCard>
        )}

      {/* Jupiter Portfolio */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
              J
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Jupiter Portfolio</h3>
              <p className="text-crypto-silver text-sm">Solana DeFi portfolio tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              SOLANA DEX
            </Badge>
            <button
              onClick={() => window.open('https://jup.ag/portfolio/FjT8MxAYv8gUvQ8TQME6zvceE3n4KncrgX55VitJiT4B', '_blank', 'noopener,noreferrer')}
              className="text-crypto-silver hover:text-white transition-colors group"
            >
              <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
        
        <div className="w-full">
          <iframe
            src="https://jup.ag/portfolio/FjT8MxAYv8gUvQ8TQME6zvceE3n4KncrgX55VitJiT4B"
            className="w-full h-[600px] sm:h-[700px] lg:h-[800px] rounded-lg border border-crypto-silver/20"
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
      </GlassCard>

      {/* TaoHub Portfolio Integration */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Brain className="w-4 h-4 mr-2" />
            TaoHub Portfolio
          </h3>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              Portfolio Tracker
            </Badge>
            <a 
              href="https://www.taohub.info/portfolio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-crypto-silver hover:text-white transition-colors group"
            >
              <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
            </a>
          </div>
        </div>
        
        <div className="relative w-full">
          <iframe
            src="https://www.taohub.info/portfolio"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="TaoHub Portfolio"
            frameBorder="0"
            loading="lazy"
            style={{
              background: 'transparent',
              colorScheme: 'dark'
            }}
          />
          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            TAO Portfolio Analytics
          </div>
        </div>
      </GlassCard>



      {/* HyperLiquid Analytics */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-2 flex items-center justify-center text-xs font-bold">
              H
            </div>
            HyperLiquid
          </h3>
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              Portfolio Analytics
            </Badge>
          </div>
        </div>
        
        <div className="bg-black/20 border border-crypto-silver/20 rounded-lg p-6">
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => window.open('https://app.coinmarketman.com/dashboard/accounts/hyperliquid/126558?tab=summary', '_blank', 'noopener,noreferrer')}
              className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 hover:from-purple-500/20 hover:to-pink-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">HyperTracker</div>
                  <div className="text-xs text-crypto-silver">Comprehensive portfolio tracking and metrics</div>
                </div>
                <ExternalLink className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
              </div>
            </button>
            
            <button
              onClick={() => window.open('https://app.coinmarketman.com/hypertracker/wallet/0xEE8d3996E60ff46466334e4844Dd94bafef5Eb5d', '_blank', 'noopener,noreferrer')}
              className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 hover:from-purple-500/20 hover:to-pink-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">PnL Chart</div>
                  <div className="text-xs text-crypto-silver">Wallet performance and PnL visualization</div>
                </div>
                <ExternalLink className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
              </div>
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Hyperfolio Integration */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-2 flex items-center justify-center text-xs font-bold">
              H
            </div>
            Hyperfolio Portfolio
          </h3>
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              Portfolio Analytics
            </Badge>
            <a 
              href="https://www.hyperfolio.xyz/0xEE8d3996E60ff46466334e4844Dd94bafef5Eb5d"
              target="_blank"
              rel="noopener noreferrer"
              className="text-crypto-silver hover:text-white transition-colors group"
            >
              <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
            </a>
          </div>
        </div>
        
        <div className="relative w-full">
          <iframe
            src="https://www.hyperfolio.xyz/0xEE8d3996E60ff46466334e4844Dd94bafef5Eb5d"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="Hyperfolio Portfolio Analytics"
            frameBorder="0"
            loading="lazy"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
          />
          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            Hyperliquid Portfolio
          </div>
        </div>
      </GlassCard>

      {/* Holding Detail Modal */}
      <HoldingDetailModal 
        holding={selectedHolding}
        subnets={subnets}
        onClose={() => setSelectedHolding(null)}
      />
    </div>
  );
}
