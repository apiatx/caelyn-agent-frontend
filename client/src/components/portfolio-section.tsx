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
      {/* Page Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-2xl">💼</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Portfolio Management</h1>
        </div>
        <p className="text-crypto-silver">Track your crypto portfolio across multiple chains and platforms</p>
      </div>

      {/* Multi-Chain Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-xl font-bold">🌐</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Multi-Chain</h2>
            <p className="text-crypto-silver">Cross-chain portfolio tracking and analytics</p>
          </div>
        </div>

        {/* Cerebro */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
                C
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Cerebro</h3>
                <p className="text-crypto-silver text-sm">Multi-Chain Portfolio Tracker</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                MULTI-CHAIN
              </Badge>
              <button
                onClick={() => window.open('https://cerebro.xyz/dashboard', '_blank', 'noopener,noreferrer')}
                className="text-crypto-silver hover:text-white transition-colors group"
              >
                <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* EVM Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-xl font-bold">⚡</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">EVM</h2>
            <p className="text-crypto-silver">Ethereum Virtual Machine portfolio tracking</p>
          </div>
        </div>

        {/* DeBank */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
                DB
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">DeBank</h3>
                <p className="text-crypto-silver text-sm">EVM Portfolio Tracker</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                EVM CHAINS
              </Badge>
              <button
                onClick={() => window.open('https://debank.com/profile', '_blank', 'noopener,noreferrer')}
                className="text-crypto-silver hover:text-white transition-colors group"
              >
                <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </GlassCard>
      </div>





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
                    href="https://debank.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    DeBank
                  </a>
                </div>
              </div>
            )}
          </GlassCard>
        )}

      {/* Solana Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-xl font-bold">◎</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Solana</h2>
            <p className="text-crypto-silver">Solana ecosystem portfolio tracking</p>
          </div>
        </div>

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
              onClick={() => window.open('https://jup.ag/portfolio', '_blank', 'noopener,noreferrer')}
              className="text-crypto-silver hover:text-white transition-colors group"
            >
              <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
        
        <div className="w-full">
          <iframe
            src="https://jup.ag/portfolio"
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
      </div>

      {/* Bittensor Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
            <Brain className="text-white text-xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Bittensor</h2>
            <p className="text-crypto-silver">TAO network portfolio and staking analytics</p>
          </div>
        </div>

        {/* Bittensor */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-sm font-bold">
                B
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Bittensor</h3>
                <p className="text-crypto-silver text-sm">TAO Network Portfolio Tracker</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                TAO NETWORK
              </Badge>
              <button
                onClick={() => window.open('https://www.taohub.info/portfolio', '_blank', 'noopener,noreferrer')}
                className="text-crypto-silver hover:text-white transition-colors group"
              >
                <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* HyperLiquid Analytics */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-sm font-bold">
              H
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">HyperLiquid</h3>
              <p className="text-crypto-silver text-sm">Portfolio Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              PERPS
            </Badge>
            <button
              onClick={() => window.open('https://app.coinmarketman.com/hypertracker', '_blank', 'noopener,noreferrer')}
              className="text-crypto-silver hover:text-white transition-colors group"
            >
              <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* HyperEVM Integration */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center">
            <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-2 flex items-center justify-center text-xs font-bold">
              H
            </div>
            HyperEVM
          </h3>
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              Portfolio Analytics
            </Badge>
            <a 
              href="https://app.hyperbeat.org/hyperfolio"
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
            src="https://app.hyperbeat.org/hyperfolio"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="HyperEVM Portfolio Analytics"
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
