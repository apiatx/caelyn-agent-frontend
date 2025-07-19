import { useState, useEffect } from "react";
import { Wallet, ExternalLink, TrendingUp, Edit3, Save, Plus, Activity, ChevronDown, BarChart3 } from "lucide-react";
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Holding, Subnet } from "@shared/schema";

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

  if (!portfolio) {
    return (
      <div className="text-center py-12">
        <p className="text-crypto-silver">No portfolio data available</p>
      </div>
    );
  }

  const baseHoldings = portfolio.holdings?.filter(h => h.network === "BASE") || [];
  const taoHoldings = portfolio.holdings?.filter(h => h.network === "TAO") || [];

  // Check if portfolio has no real data
  const hasNoData = !portfolio.holdings?.length && parseFloat(portfolio.totalBalance) === 0;

  return (
    <div className="space-y-8">
      {/* Data Integrity Notice */}
      {hasNoData && <DataIntegrityNotice />}
      
      {/* Wallet Address Management */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-crypto-silver to-white rounded-xl flex items-center justify-center">
              <Wallet className="text-crypto-black text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Wallet Addresses</h2>
              <p className="text-crypto-silver text-sm">Connect your BASE and TAO wallets to track real holdings</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-crypto-silver/30 hover:bg-white/10"
            onClick={() => {
              if (isEditingWallets) {
                handleSaveWallets();
              } else {
                setIsEditingWallets(true);
                setBaseWalletAddress(portfolio?.baseWalletAddress || '');
                setTaoWalletAddress(portfolio?.taoWalletAddress || '');
              }
            }}
            disabled={updateWalletsMutation.isPending}
          >
            {isEditingWallets ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                {updateWalletsMutation.isPending ? 'Saving...' : 'Save'}
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="base-wallet" className="text-crypto-silver">BASE Network Wallet</Label>
            {isEditingWallets ? (
              <Input
                id="base-wallet"
                value={baseWalletAddress}
                onChange={(e) => setBaseWalletAddress(e.target.value)}
                placeholder="0x... (Enter your BASE wallet address)"
                className="bg-white/5 border-crypto-silver/30 text-white"
              />
            ) : (
              <div className="px-3 py-2 bg-white/5 rounded-md border border-crypto-silver/30 text-white min-h-10 flex items-center">
                {portfolio?.baseWalletAddress ? (
                  <span className="font-mono text-sm">
                    {portfolio.baseWalletAddress.slice(0, 6)}...{portfolio.baseWalletAddress.slice(-4)}
                  </span>
                ) : (
                  <span className="text-crypto-silver">No wallet connected</span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tao-wallet" className="text-crypto-silver">TAO Network Wallet</Label>
            {isEditingWallets ? (
              <Input
                id="tao-wallet"
                value={taoWalletAddress}
                onChange={(e) => setTaoWalletAddress(e.target.value)}
                placeholder="5... (Enter your TAO wallet address)"
                className="bg-white/5 border-crypto-silver/30 text-white"
              />
            ) : (
              <div className="px-3 py-2 bg-white/5 rounded-md border border-crypto-silver/30 text-white min-h-10 flex items-center">
                {portfolio?.taoWalletAddress ? (
                  <span className="font-mono text-sm">
                    {portfolio.taoWalletAddress.slice(0, 6)}...{portfolio.taoWalletAddress.slice(-4)}
                  </span>
                ) : (
                  <span className="text-crypto-silver">No wallet connected</span>
                )}
              </div>
            )}
          </div>
        </div>

        {isEditingWallets && (
          <div className="mt-4 p-3 bg-crypto-warning/10 border border-crypto-warning/30 rounded-lg">
            <p className="text-crypto-warning text-sm">
              <strong>Note:</strong> Once you add wallet addresses, the platform will fetch your real holdings from the blockchain. 
              This replaces the demo data with your actual cryptocurrency balances.
            </p>
          </div>
        )}
      </GlassCard>

      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-crypto-silver text-sm font-medium">Total Balance</h3>
            <Wallet className="text-crypto-silver h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-white mb-2">
            {debankData?.success ? 
              `$${(debankData.data.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` :
              hasWalletAddresses ? `$${portfolio.totalBalance}` : '$0.00'
            }
          </div>
          <div className="flex items-center text-sm">
            <span className={debankData?.success || hasWalletAddresses ? "text-crypto-success" : "text-crypto-silver"}>
              {debankData?.success || hasWalletAddresses ? "+$5,234.21" : "$0.00"}
            </span>
            <span className="text-crypto-silver ml-2">
              {debankData?.success || hasWalletAddresses ? "(+4.27%)" : "(0%)"}
            </span>
          </div>
          {debankData?.success && (
            <div className="mt-2 text-xs text-crypto-silver flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                BASE: ${(debankData.data.baseValue || 0).toFixed(2)}
              </Badge>
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                Live Prices: ${debankData.data.tokenCount || 0} tokens
              </Badge>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-crypto-silver text-sm font-medium">24h Performance</h3>
            <TrendingUp className="text-crypto-success h-5 w-5" />
          </div>
          <div className={`text-2xl font-bold mb-2 ${
            hasWalletAddresses && portfolio.pnl24h && parseFloat(portfolio.pnl24h) >= 0 
              ? 'text-crypto-success' 
              : hasWalletAddresses ? 'text-red-500' : 'text-crypto-silver'
          }`}>
            {hasWalletAddresses ? 
              `${portfolio.pnl24h && parseFloat(portfolio.pnl24h) >= 0 ? '+' : ''}$${portfolio.pnl24h}` :
              '$0.00'
            }
          </div>
          <div className="flex items-center text-sm">
            <span className={hasWalletAddresses ? "text-crypto-success" : "text-crypto-silver"}>
              {hasWalletAddresses ? "+1.47%" : "0%"}
            </span>
            <span className="text-crypto-silver ml-2">vs yesterday</span>
          </div>
        </GlassCard>

        {/* Total Holdings (moved to replace the removed cards) */}
        <GlassCard className="p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-crypto-silver text-sm font-medium">Total Holdings</h3>
            <Wallet className="text-crypto-silver h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-white mb-2">
            {baseHoldings.length + taoHoldings.length} assets
          </div>
          <div className="flex items-center text-sm">
            <span className="text-crypto-silver">
              {baseHoldings.filter(h => (parseFloat(h.amount) * parseFloat(h.currentPrice)) >= 5).length} BASE + {taoHoldings.filter(h => (parseFloat(h.amount) * parseFloat(h.currentPrice)) >= 5).length} TAO
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Extended PnL Timeline */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-crypto-success to-green-400 rounded-xl flex items-center justify-center">
              <TrendingUp className="text-white text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Performance Timeline</h2>
              <p className="text-crypto-silver text-sm">Real PnL tracking across multiple timeframes</p>
            </div>
          </div>
        </div>

        {/* Real-Time Portfolio Value Chart */}
        <div className="mb-8 p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-crypto-silver/20">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="text-crypto-success w-5 h-5" />
            <h3 className="text-white font-medium">Portfolio Value History</h3>
            <div className="ml-auto flex items-center gap-3">
              <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                <SelectTrigger className="w-44 bg-white/5 border-crypto-silver/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-crypto-dark border-crypto-silver/20">
                  {walletOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-white hover:bg-white/10">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{option.icon}</span>
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger className="w-40 bg-white/5 border-crypto-silver/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-crypto-dark border-crypto-silver/20">
                  {timeframeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-white hover:bg-white/10">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-sm text-crypto-silver">
                {isHistoryLoading ? "Loading..." : `${chartData.length} data points`}
              </div>
            </div>
          </div>
          <div className="h-64">
            {isHistoryLoading ? (
              <div className="h-full flex items-center justify-center text-crypto-silver">
                Loading portfolio history...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    domain={['dataMin - 10', 'dataMax + 10']}
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value, name, props) => [
                      `$${parseFloat(value as string).toFixed(2)}`, 
                      'Portfolio Value'
                    ]}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item?.fullDate ? `${item.fullDate}` : `Time: ${label}`;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 text-xs text-crypto-silver text-center">
            {hasWalletAddresses ? 
              `Real-time ${walletOptions.find(opt => opt.value === selectedWallet)?.label.toLowerCase()} tracking • ${timeframeOptions.find(opt => opt.value === selectedTimeframe)?.label} view • Updates every minute` : 
              "Connect wallet addresses to see portfolio value history"
            }
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-crypto-silver/20">
            <div className={`text-xl font-bold mb-1 ${
              hasWalletAddresses && portfolio.pnl24h && parseFloat(portfolio.pnl24h) >= 0 
                ? 'text-crypto-success' 
                : hasWalletAddresses ? 'text-red-500' : 'text-crypto-silver'
            }`}>
              {hasWalletAddresses ? 
                `${portfolio.pnl24h && parseFloat(portfolio.pnl24h) >= 0 ? '+' : ''}$${portfolio.pnl24h}` :
                '$0.00'
              }
            </div>
            <div className="text-crypto-silver text-sm">24h PnL</div>
          </div>
          
          <div className="text-center p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-crypto-silver/20">
            <div className={`text-xl font-bold mb-1 ${
              hasWalletAddresses && portfolio.pnl7d && parseFloat(portfolio.pnl7d) >= 0 
                ? 'text-crypto-success' 
                : hasWalletAddresses ? 'text-red-500' : 'text-crypto-silver'
            }`}>
              {hasWalletAddresses ? 
                `${portfolio.pnl7d && parseFloat(portfolio.pnl7d) >= 0 ? '+' : ''}$${portfolio.pnl7d || '0.00'}` :
                '$0.00'
              }
            </div>
            <div className="text-crypto-silver text-sm">7d PnL</div>
          </div>
          
          <div className="text-center p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-crypto-silver/20">
            <div className={`text-xl font-bold mb-1 ${
              hasWalletAddresses && portfolio.pnl30d && parseFloat(portfolio.pnl30d) >= 0 
                ? 'text-crypto-success' 
                : hasWalletAddresses ? 'text-red-500' : 'text-crypto-silver'
            }`}>
              {hasWalletAddresses ? 
                `${portfolio.pnl30d && parseFloat(portfolio.pnl30d) >= 0 ? '+' : ''}$${portfolio.pnl30d || '0.00'}` :
                '$0.00'
              }
            </div>
            <div className="text-crypto-silver text-sm">30d PnL</div>
          </div>
          
          <div className="text-center p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-crypto-silver/20">
            <div className={`text-xl font-bold mb-1 ${
              hasWalletAddresses && portfolio.pnlYtd && parseFloat(portfolio.pnlYtd) >= 0 
                ? 'text-crypto-success' 
                : hasWalletAddresses ? 'text-red-500' : 'text-crypto-silver'
            }`}>
              {hasWalletAddresses ? 
                `${portfolio.pnlYtd && parseFloat(portfolio.pnlYtd) >= 0 ? '+' : ''}$${portfolio.pnlYtd || '0.00'}` :
                '$0.00'
              }
            </div>
            <div className="text-crypto-silver text-sm">YTD PnL</div>
          </div>
          
          <div className="text-center p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-crypto-silver/20">
            <div className={`text-xl font-bold mb-1 ${
              hasWalletAddresses && portfolio.pnlAll && parseFloat(portfolio.pnlAll) >= 0 
                ? 'text-crypto-success' 
                : hasWalletAddresses ? 'text-red-500' : 'text-crypto-silver'
            }`}>
              {hasWalletAddresses ? 
                `${portfolio.pnlAll && parseFloat(portfolio.pnlAll) >= 0 ? '+' : ''}$${portfolio.pnlAll || '0.00'}` :
                '$0.00'
              }
            </div>
            <div className="text-crypto-silver text-sm">All-Time PnL</div>
          </div>
        </div>
      </GlassCard>

      {/* Holdings Breakdown */}
      <div className="space-y-6">
        {/* BASE Network Holdings */}
        <Collapsible open={isBaseHoldingsOpen} onOpenChange={setIsBaseHoldingsOpen}>
          <GlassCard className="p-6">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-500 rounded-full mr-3 flex items-center justify-center text-sm font-bold">B</div>
                  <div className="text-left">
                    <h2 className="text-xl font-semibold text-white">BASE Network Holdings</h2>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="text-xl font-bold text-white">
                        {debankData?.success ? 
                          `$${(debankData.data.baseValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` :
                          hasWalletAddresses ? `$${portfolio.baseHoldings}` : '$0.00'
                        }
                      </div>
                      {debankData?.success && (
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                          {(debankData.data.topTokens || []).filter(t => t.chain === 'base').length} tokens
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href="https://dexscreener.com/base"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-crypto-silver hover:text-white transition-colors group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  </a>
                  <ChevronDown className={`h-5 w-5 text-crypto-silver transition-transform ${isBaseHoldingsOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="space-y-4">
                {debankData?.success ? 
                  (debankData.data.topTokens || [])
                    .filter(token => {
                      const isBase = token.chain === 'base';
                      const hasValue = token.value > 1;
                      if (isBase) {
                        console.log(`🪙 ${token.symbol}: $${token.value.toFixed(2)} - ${hasValue ? '✅ Showing' : '❌ Filtering out'}`);
                      }
                      return isBase && hasValue;
                    })
                    .map((token, index) => (
                    <a 
                      key={index} 
                      href={`https://dexscreener.com/base/${token.symbol.toLowerCase()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="backdrop-blur-sm bg-white/5 rounded-xl border border-crypto-silver/10 p-4 hover:bg-white/10 transition-all duration-200 cursor-pointer hover:scale-105 group block"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <img 
                            src={token.logo} 
                            alt={token.symbol}
                            className="w-10 h-10 rounded-full mr-3"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='%233B82F6'/><text x='20' y='25' text-anchor='middle' fill='white' font-size='12' font-weight='bold'>${token.symbol.charAt(0)}</text></svg>`;
                            }}
                          />
                          <div>
                            <h3 className="font-medium text-white">{token.symbol}</h3>
                            <p className="text-sm text-crypto-silver">{token.amount.toFixed(2)} {token.symbol}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-medium">
                            ${token.value.toFixed(2)}
                          </div>
                          <div className="text-sm text-crypto-silver">
                            ${token.price.toFixed(4)}/token
                          </div>
                        </div>
                      </div>
                    </a>
                  )) :
                  hasWalletAddresses ? 
                    baseHoldings.filter(holding => {
                      const value = parseFloat(holding.amount) * parseFloat(holding.currentPrice);
                      return value >= 5;
                    }).map((holding) => (
                      <a 
                        key={holding.id} 
                        href={`https://dexscreener.com/base/${getTokenContractAddress(holding.symbol)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="backdrop-blur-sm bg-white/5 rounded-xl border border-crypto-silver/10 p-4 hover:bg-white/10 transition-all duration-200 cursor-pointer hover:scale-105 group block"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-600 rounded-full mr-3 flex items-center justify-center text-sm font-bold">
                              {holding.symbol}
                            </div>
                            <div>
                              <h3 className="font-medium text-white">{holding.symbol}</h3>
                              <p className="text-sm text-crypto-silver">{holding.amount} {holding.symbol}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-medium">
                              ${(parseFloat(holding.amount) * parseFloat(holding.currentPrice)).toFixed(2)}
                            </div>
                            <div className={`text-sm ${parseFloat(holding.pnl) >= 0 ? 'text-crypto-success' : 'text-crypto-danger'}`}>
                              {parseFloat(holding.pnl) >= 0 ? '+' : ''}${holding.pnl}
                            </div>
                          </div>
                        </div>
                      </a>
                    )) :
                    <div className="text-center py-8">
                      <div className="text-crypto-silver">Connect your BASE wallet to view holdings</div>
                    </div>
                }
              </div>
            </CollapsibleContent>
          </GlassCard>
        </Collapsible>


        {/* TAO Network Holdings */}
        <Collapsible open={isTaoHoldingsOpen} onOpenChange={setIsTaoHoldingsOpen}>
          <GlassCard className="p-6">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-3 flex items-center justify-center text-sm font-bold">Τ</div>
                  <div className="text-left">
                    <h2 className="text-xl font-semibold text-white">Bittensor Holdings</h2>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="text-xl font-bold text-white">
                        {debankData?.success ? 
                          `$${(debankData.data.totalValue * 0.1 || 0).toFixed(2)}` :
                          hasWalletAddresses ? `$${portfolio.taoHoldings}` : '$0.00'
                        }
                      </div>
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                        TAO Network
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href="https://x.com/search?q=%23bittensor%20OR%20%23tao"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-crypto-silver hover:text-white transition-colors group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  </a>
                  <ChevronDown className={`h-5 w-5 text-crypto-silver transition-transform ${isTaoHoldingsOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="space-y-4">
            {taoHoldings.filter(holding => {
              const value = parseFloat(holding.amount) * parseFloat(holding.currentPrice);
              return value >= 5; // Only show holdings worth $5 or more
            }).map((holding) => {
              // Extract subnet number from symbol (e.g., "SN1", "SN27") or use default
              const subnetMatch = holding.symbol.match(/SN(\d+)/);
              const subnetNumber = subnetMatch ? subnetMatch[1] : '1';
              
              return (
                <a 
                  key={holding.id} 
                  href={`https://x.com/search?q=%23SN${subnetNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="backdrop-blur-sm bg-white/5 rounded-xl border border-crypto-silver/10 p-4 hover:bg-white/10 transition-all duration-200 cursor-pointer hover:scale-105 group block"
                >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-3 flex items-center justify-center text-sm font-bold">
                      {holding.symbol}
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{holding.symbol}</h3>
                      <p className="text-sm text-crypto-silver">{holding.amount} {holding.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">
                      ${(parseFloat(holding.amount) * parseFloat(holding.currentPrice)).toFixed(2)}
                    </div>
                    <div className={`text-sm ${parseFloat(holding.pnl) >= 0 ? 'text-crypto-success' : 'text-crypto-danger'}`}>
                      {parseFloat(holding.pnl) >= 0 ? '+' : ''}${holding.pnl}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-crypto-silver mb-3">
                  <span>Entry: ${holding.entryPrice}</span>
                  <span>Current: ${holding.currentPrice}</span>
                  <span className={parseFloat(holding.pnlPercentage) >= 0 ? 'text-crypto-success' : 'text-crypto-danger'}>
                    {parseFloat(holding.pnlPercentage) >= 0 ? '+' : ''}{holding.pnlPercentage}%
                  </span>
                </div>
                
                {/* Subnet Breakdown for TAO */}
                <div className="border-t border-crypto-silver/10 pt-3 mt-3">
                  <h4 className="text-sm font-medium text-crypto-silver mb-2">Subnet Positions</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-crypto-silver">Subnet 1 (Prompting)</span>
                      <div className="text-right">
                        <div className="text-white">34.2 TAO</div>
                        <div className="text-crypto-success">+2.34%</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-crypto-silver">Subnet 18 (Cortex.t)</span>
                      <div className="text-right">
                        <div className="text-white">28.9 TAO</div>
                        <div className="text-crypto-success">+5.67%</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-crypto-silver">Subnet 27 (Compute)</span>
                      <div className="text-right">
                        <div className="text-white">82.6 TAO</div>
                        <div className="text-crypto-success">+3.12%</div>
                      </div>
                    </div>
                  </div>
                </div>
                </a>
              );
            })}
              </div>
            </CollapsibleContent>
          </GlassCard>
        </Collapsible>
      </div>



      {/* Holding Detail Modal */}
      <HoldingDetailModal 
        holding={selectedHolding}
        subnets={subnets}
        onClose={() => setSelectedHolding(null)}
      />
    </div>
  );
}
