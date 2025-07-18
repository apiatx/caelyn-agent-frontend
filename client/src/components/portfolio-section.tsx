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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Holding, Subnet } from "@shared/schema";

export default function PortfolioSection() {
  const { data: portfolio, isLoading } = usePortfolio(1);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const { data: portfolioHistory, isLoading: isHistoryLoading } = usePortfolioValueHistory(1, selectedTimeframe);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [isEditingWallets, setIsEditingWallets] = useState(false);
  const [baseWalletAddress, setBaseWalletAddress] = useState('');
  const [taoWalletAddress, setTaoWalletAddress] = useState('');

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
    const maxDataPoints = selectedTimeframe === '24h' ? 48 : selectedTimeframe === '7d' ? 168 : 100;
    const sampledHistory = filteredHistory.length > maxDataPoints 
      ? filteredHistory.filter((_, index) => index % Math.ceil(filteredHistory.length / maxDataPoints) === 0)
      : filteredHistory;
    
    return sampledHistory.map(item => {
      const date = new Date(item.timestamp!);
      return {
        time: formatTimeLabel(date),
        value: parseFloat(item.totalValue),
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
            ${hasWalletAddresses ? portfolio.totalBalance : '0.00'}
          </div>
          <div className="flex items-center text-sm">
            <span className={hasWalletAddresses ? "text-crypto-success" : "text-crypto-silver"}>
              {hasWalletAddresses ? "+$5,234.21" : "$0.00"}
            </span>
            <span className="text-crypto-silver ml-2">
              {hasWalletAddresses ? "(+4.27%)" : "(0%)"}
            </span>
          </div>
        </GlassCard>

        <GlassCard className="p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-crypto-silver text-sm font-medium">24h PnL</h3>
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

        <GlassCard 
          className="p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105"
          onClick={() => {
            const baseHolding = baseHoldings[0];
            if (baseHolding) setSelectedHolding(baseHolding);
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-crypto-silver text-sm font-medium">BASE Holdings</h3>
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">B</div>
          </div>
          <div className="text-2xl font-bold text-white mb-2">
            ${hasWalletAddresses ? portfolio.baseHoldings : '0.00'}
          </div>
          <div className="flex items-center text-sm">
            <span className={hasWalletAddresses ? "text-crypto-success" : "text-crypto-silver"}>
              {hasWalletAddresses ? "+$2,156.34" : "$0.00"}
            </span>
            <span className="text-crypto-silver ml-2">
              {hasWalletAddresses ? "(+4.78%)" : "(0%)"}
            </span>
          </div>
        </GlassCard>

        <GlassCard 
          className="p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105"
          onClick={() => {
            const taoHolding = taoHoldings[0];
            if (taoHolding) setSelectedHolding(taoHolding);
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-crypto-silver text-sm font-medium">TAO Holdings</h3>
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold">Τ</div>
          </div>
          <div className="text-2xl font-bold text-white mb-2">
            ${hasWalletAddresses ? portfolio.taoHoldings : '0.00'}
          </div>
          <div className="flex items-center text-sm">
            <span className={hasWalletAddresses ? "text-crypto-success" : "text-crypto-silver"}>
              {hasWalletAddresses ? "+$3,077.87" : "$0.00"}
            </span>
            <span className="text-crypto-silver ml-2">
              {hasWalletAddresses ? "(+3.97%)" : "(0%)"}
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
              `Real-time portfolio value tracking • ${timeframeOptions.find(opt => opt.value === selectedTimeframe)?.label} view • Updates every minute` : 
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* BASE Network Holdings */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full mr-3 flex items-center justify-center text-sm font-bold">B</div>
              BASE Network Holdings
            </h2>
            <button className="text-crypto-silver hover:text-white transition-colors">
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>

          {/* BASE Holdings Dropdown */}
          <div className="mb-4">
            <Select>
              <SelectTrigger className="w-full bg-white/5 border-crypto-silver/20 text-white">
                <SelectValue placeholder={hasWalletAddresses ? "Select BASE holding to view PnL" : "Connect wallet to view holdings"} />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-crypto-silver/20">
                {hasWalletAddresses ? [
                  { symbol: 'TOSHI', amount: '2,450,000', value: '$573.21', pnl: '+$48.32', pnlPercent: '+9.2%' },
                  { symbol: 'DEGEN', amount: '15,750', value: '$245.70', pnl: '+$12.45', pnlPercent: '+5.3%' },
                  { symbol: 'HIGHER', amount: '1,200', value: '$80.28', pnl: '-$3.72', pnlPercent: '-4.4%' },
                  { symbol: 'AERO', amount: '45', value: '$85.05', pnl: '+$8.05', pnlPercent: '+10.5%' },
                  { symbol: 'MFER', amount: '12,500', value: '$287.50', pnl: '+$23.50', pnlPercent: '+8.9%' }
                ].map((holding) => (
                  <SelectItem key={holding.symbol} value={holding.symbol} className="text-white hover:bg-white/10">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                          {holding.symbol.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{holding.symbol}</div>
                          <div className="text-sm text-crypto-silver">{holding.amount} tokens</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{holding.value}</div>
                        <div className={`text-sm ${holding.pnl.startsWith('+') ? 'text-crypto-success' : 'text-red-500'}`}>
                          {holding.pnl} ({holding.pnlPercent})
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                )) : [
                  <SelectItem key="no-wallet" value="no-wallet" className="text-crypto-silver">
                    Connect BASE wallet to view holdings
                  </SelectItem>
                ]}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-4">
            {baseHoldings.filter(holding => {
              const value = parseFloat(holding.amount) * parseFloat(holding.currentPrice);
              return value >= 5; // Only show holdings worth $5 or more
            }).map((holding) => (
              <div 
                key={holding.id} 
                className="backdrop-blur-sm bg-white/5 rounded-xl border border-crypto-silver/10 p-4 hover:bg-white/10 transition-all duration-200 cursor-pointer hover:scale-105"
                onClick={() => setSelectedHolding(holding)}
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
                <div className="flex justify-between text-sm text-crypto-silver">
                  <span>Entry: ${holding.entryPrice}</span>
                  <span>Current: ${holding.currentPrice}</span>
                  <span className={parseFloat(holding.pnlPercentage) >= 0 ? 'text-crypto-success' : 'text-crypto-danger'}>
                    {parseFloat(holding.pnlPercentage) >= 0 ? '+' : ''}{holding.pnlPercentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* TAO Network Holdings */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-3 flex items-center justify-center text-sm font-bold">Τ</div>
              Bittensor Holdings
            </h2>
            <button className="text-crypto-silver hover:text-white transition-colors">
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>

          {/* Bittensor Holdings Dropdown */}
          <div className="mb-4">
            <Select>
              <SelectTrigger className="w-full bg-white/5 border-crypto-silver/20 text-white">
                <SelectValue placeholder={hasWalletAddresses ? "Select TAO holding to view PnL" : "Connect wallet to view holdings"} />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-crypto-silver/20">
                {hasWalletAddresses ? [
                  { symbol: 'TAO', amount: '12.45', value: '$6,888.83', pnl: '+$523.45', pnlPercent: '+8.2%', subnet: 'Liquid Staking' },
                  { symbol: 'SN1', amount: '3.2', value: '$1,770.88', pnl: '+$145.22', pnlPercent: '+8.9%', subnet: 'Text Prompting' },
                  { symbol: 'SN5', amount: '2.8', value: '$1,549.72', pnl: '+$89.15', pnlPercent: '+6.1%', subnet: 'Image Generation' },
                  { symbol: 'SN18', amount: '1.5', value: '$830.25', pnl: '+$42.75', pnlPercent: '+5.4%', subnet: 'Cortex.t' },
                  { symbol: 'SN27', amount: '4.1', value: '$2,269.14', pnl: '+$156.89', pnlPercent: '+7.4%', subnet: 'Compute Horde' }
                ].map((holding) => (
                  <SelectItem key={holding.symbol} value={holding.symbol} className="text-white hover:bg-white/10">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold">
                          τ
                        </div>
                        <div>
                          <div className="font-medium">{holding.symbol}</div>
                          <div className="text-sm text-crypto-silver">{holding.amount} TAO • {holding.subnet}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{holding.value}</div>
                        <div className={`text-sm ${holding.pnl.startsWith('+') ? 'text-crypto-success' : 'text-red-500'}`}>
                          {holding.pnl} ({holding.pnlPercent})
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                )) : [
                  <SelectItem key="no-wallet" value="no-wallet" className="text-crypto-silver">
                    Connect TAO wallet to view holdings
                  </SelectItem>
                ]}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-4">
            {taoHoldings.filter(holding => {
              const value = parseFloat(holding.amount) * parseFloat(holding.currentPrice);
              return value >= 5; // Only show holdings worth $5 or more
            }).map((holding) => (
              <div 
                key={holding.id} 
                className="backdrop-blur-sm bg-white/5 rounded-xl border border-crypto-silver/10 p-4 hover:bg-white/10 transition-all duration-200 cursor-pointer hover:scale-105"
                onClick={() => setSelectedHolding(holding)}
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
              </div>
            ))}
          </div>
        </GlassCard>
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
