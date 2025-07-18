import { useState } from "react";
import { Crown, Lock, Activity, DollarSign, ExternalLink, ArrowUpRight, ArrowDownRight, ChevronDown, Copy, Eye } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useWhaleWatching } from "@/hooks/use-whale-watching";
import { CryptoPaymentModal } from "@/components/crypto-payment-modal";

export default function WhaleWatchingSection() {
  const { data: hasAccess, premiumTransactions, freeTransactions } = useWhaleWatching(1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<'ETH' | 'TAO' | null>(null);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  const handlePremiumPayment = (token: 'ETH' | 'TAO') => {
    setSelectedPaymentType(token);
    setShowPaymentModal(true);
  };

  const getExplorerUrl = (network: string, txHash: string) => {
    if (network === 'BASE') {
      return `https://basescan.org/tx/${txHash}`;
    } else if (network === 'TAO') {
      return `https://taostats.io/tx/${txHash}`;
    }
    return '#';
  };

  const getAddressExplorerUrl = (network: string, address: string) => {
    if (network === 'BASE') {
      return `https://basescan.org/address/${address}`;
    } else if (network === 'TAO') {
      return `https://bittensor.com/scan/address/${address}`;
    }
    return '#';
  };

  const getTokenExplorerUrl = (network: string, tokenAddress: string) => {
    if (network === 'BASE' && tokenAddress) {
      return `https://basescan.org/token/${tokenAddress}`;
    }
    return '#';
  };

  const getTransactionType = (tx: any) => {
    return tx.action || (tx.network === 'TAO' ? 'STAKE' : 'BUY');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8">
      {/* Premium Access Gate */}
      <div className="backdrop-blur-md bg-gradient-to-br from-crypto-warning/20 to-crypto-warning/5 rounded-2xl border border-crypto-warning/30 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-crypto-warning to-yellow-400 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Crown className="text-2xl text-crypto-black" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Premium Whale Watching</h2>
          <p className="text-crypto-silver mb-6">Get real-time alerts for large transactions ({'>'}$2,500) across BASE and Bittensor networks</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto mb-6">
            <Button 
              variant="outline" 
              className="h-16 backdrop-blur-sm bg-white/10 hover:bg-white/20 border-crypto-silver/30"
              onClick={() => handlePremiumPayment('ETH')}
            >
              <div className="text-center">
                <div className="text-lg font-semibold text-white">0.1 ETH</div>
                <div className="text-sm text-crypto-silver">~$232.41</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 backdrop-blur-sm bg-white/10 hover:bg-white/20 border-crypto-silver/30"
              onClick={() => handlePremiumPayment('TAO')}
            >
              <div className="text-center">
                <div className="text-lg font-semibold text-white">1 TAO</div>
                <div className="text-sm text-crypto-silver">~$553.24</div>
              </div>
            </Button>
          </div>
          
          <div className="text-xs text-crypto-silver mb-4">30-day access • Real-time alerts • Premium support</div>
          <Button className="bg-gradient-to-r from-crypto-warning to-yellow-400 text-crypto-black font-semibold hover:shadow-lg transition-all duration-200">
            Unlock Premium Access
          </Button>
        </div>
      </div>

      {/* FREE Whale Activity */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Real-Time Whale Activity</h2>
          <div className="text-sm text-crypto-success">FREE - No premium required</div>
        </div>

        <Tabs defaultValue="base" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/10 mb-6">
            <TabsTrigger value="base" className="data-[state=active]:bg-white/20 text-white">
              Live Base Whale Watch
            </TabsTrigger>
            <TabsTrigger value="tao" className="data-[state=active]:bg-white/20 text-white">
              Live TAO Whale Watch
            </TabsTrigger>
          </TabsList>

          <TabsContent value="base">
            <div className="space-y-4">
              <div className="text-sm text-crypto-silver mb-4">
                🔴 LIVE: Tracking ALL BASE altcoin whale transactions over $2,500
                <br />Monitoring: 47+ tokens including SKI, BRETT, NORMIE, AI16Z, PEPE, BONK, WIF, GOAT
              </div>
              {freeTransactions && freeTransactions.length > 0 ? (
                freeTransactions
                  .filter(tx => tx.network === 'BASE')
                  .slice(0, 10)
                  .map((tx, index) => {
                    const transactionType = getTransactionType(tx);
                    const usdAmount = parseFloat(tx.amountUsd);
                    const txKey = tx.id || `${tx.transactionHash}-${index}`;
                    const isExpanded = expandedTx === txKey;
                    
                    return (
                      <Collapsible key={txKey} open={isExpanded} onOpenChange={(open) => setExpandedTx(open ? txKey : null)}>
                        <div className="backdrop-blur-sm bg-white/5 rounded-xl border border-crypto-silver/10 hover:bg-white/10 transition-all duration-200">
                          <div className="p-5">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
                                  {tx.token.substring(0, 2)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge 
                                      variant={transactionType === 'BUY' ? 'default' : 'destructive'}
                                      className={`${transactionType === 'BUY' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white font-medium`}
                                    >
                                      {transactionType === 'BUY' ? (
                                        <><ArrowUpRight className="w-3 h-3 mr-1" /> BUY</>
                                      ) : (
                                        <><ArrowDownRight className="w-3 h-3 mr-1" /> SELL</>
                                      )}
                                    </Badge>
                                    <h3 className="font-medium text-white">
                                      {parseFloat(tx.amount).toLocaleString()} ${tx.token}
                                    </h3>
                                  </div>
                                  <p className="text-crypto-silver text-sm">
                                    BASE Network • {new Date(tx.timestamp).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-crypto-success mb-1">
                                  ${usdAmount.toLocaleString('en-US', { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                  })}
                                </div>
                                <div className="flex items-center gap-2">
                                  <a 
                                    href={getExplorerUrl(tx.network, tx.transactionHash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                                  >
                                    Basescan <ExternalLink className="w-3 h-3" />
                                  </a>
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-crypto-silver hover:text-white">
                                      <Eye className="w-3 h-3 mr-1" />
                                      Details
                                      <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </Button>
                                  </CollapsibleTrigger>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-crypto-silver text-xs font-mono bg-black/20 rounded-lg p-3">
                              <div>
                                <span className="text-crypto-silver/70">From:</span> {tx.fromAddress.slice(0, 8)}...{tx.fromAddress.slice(-6)}
                              </div>
                              <div className="text-crypto-silver/50">→</div>
                              <div>
                                <span className="text-crypto-silver/70">To:</span> {tx.toAddress?.slice(0, 8)}...{tx.toAddress?.slice(-6)}
                              </div>
                            </div>
                          </div>
                          
                          <CollapsibleContent className="border-t border-crypto-silver/10">
                            <div className="p-5 space-y-4 bg-black/10">
                              <h4 className="font-semibold text-white mb-3">Transaction Details</h4>
                              
                              {/* Transaction Hash */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-crypto-silver text-sm">Transaction Hash:</span>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(tx.transactionHash)}
                                      className="text-crypto-silver hover:text-white"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                    <a 
                                      href={getExplorerUrl(tx.network, tx.transactionHash)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                </div>
                                <code className="text-xs text-crypto-silver font-mono bg-black/30 p-2 rounded block break-all">
                                  {tx.transactionHash}
                                </code>
                              </div>

                              {/* From Address */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-crypto-silver text-sm">From Address:</span>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(tx.fromAddress)}
                                      className="text-crypto-silver hover:text-white"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                    <a 
                                      href={getAddressExplorerUrl(tx.network, tx.fromAddress)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                </div>
                                <code className="text-xs text-crypto-silver font-mono bg-black/30 p-2 rounded block break-all">
                                  {tx.fromAddress}
                                </code>
                              </div>

                              {/* To Address */}
                              {tx.toAddress && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-crypto-silver text-sm">To Address:</span>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(tx.toAddress)}
                                        className="text-crypto-silver hover:text-white"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                      <a 
                                        href={getAddressExplorerUrl(tx.network, tx.toAddress)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  </div>
                                  <code className="text-xs text-crypto-silver font-mono bg-black/30 p-2 rounded block break-all">
                                    {tx.toAddress}
                                  </code>
                                </div>
                              )}

                              {/* Token Contract Address */}
                              {tx.tokenAddress && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-crypto-silver text-sm">Token Contract:</span>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(tx.tokenAddress)}
                                        className="text-crypto-silver hover:text-white"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                      <a 
                                        href={getTokenExplorerUrl(tx.network, tx.tokenAddress)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  </div>
                                  <code className="text-xs text-crypto-silver font-mono bg-black/30 p-2 rounded block break-all">
                                    {tx.tokenAddress}
                                  </code>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-crypto-silver mx-auto mb-4" />
                  <p className="text-crypto-silver">Loading BASE altcoin whale activity...</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tao">
            <div className="space-y-4">
              <div className="text-sm text-crypto-silver mb-4">
                🔴 LIVE: Monitoring TAO subnet staking events over $2,500
                <br />Tracking ALL Bittensor subnet whale stakes (SN1-SN32+)
              </div>
              {freeTransactions && freeTransactions.length > 0 ? (
                freeTransactions
                  .filter(tx => tx.network === 'TAO')
                  .slice(0, 10)
                  .map((tx, index) => {
                    const usdAmount = parseFloat(tx.amountUsd);
                    const txKey = tx.id || `${tx.transactionHash}-${index}`;
                    const isExpanded = expandedTx === txKey;
                    
                    return (
                      <Collapsible key={txKey} open={isExpanded} onOpenChange={(open) => setExpandedTx(open ? txKey : null)}>
                        <div className="backdrop-blur-sm bg-white/5 rounded-xl border border-orange-500/20 hover:bg-white/10 transition-all duration-200">
                          <div className="p-5">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
                                  τ
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge 
                                      variant="default"
                                      className="bg-orange-500 hover:bg-orange-600 text-white font-medium"
                                    >
                                      <ArrowUpRight className="w-3 h-3 mr-1" /> STAKE
                                    </Badge>
                                    <h3 className="font-medium text-white">
                                      {parseFloat(tx.amount).toLocaleString()} TAO
                                    </h3>
                                  </div>
                                  <p className="text-crypto-silver text-sm">
                                    TAO Subnet • {new Date(tx.timestamp).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-orange-400 mb-1">
                                  ${usdAmount.toLocaleString('en-US', { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                  })}
                                </div>
                                <div className="flex items-center gap-2">
                                  <a 
                                    href={getExplorerUrl(tx.network, tx.transactionHash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 text-sm transition-colors"
                                  >
                                    TaoStats <ExternalLink className="w-3 h-3" />
                                  </a>
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-crypto-silver hover:text-white">
                                      <Eye className="w-3 h-3 mr-1" />
                                      Details
                                      <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </Button>
                                  </CollapsibleTrigger>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-crypto-silver text-xs font-mono bg-black/20 rounded-lg p-3">
                              <div>
                                <span className="text-crypto-silver/70">Staker:</span> {tx.fromAddress.slice(0, 8)}...{tx.fromAddress.slice(-6)}
                              </div>
                              <div className="text-crypto-silver/50">→</div>
                              <div>
                                <span className="text-orange-400 font-medium">{tx.toAddress}</span>
                              </div>
                            </div>
                          </div>
                          
                          <CollapsibleContent className="border-t border-orange-500/20">
                            <div className="p-5 space-y-4 bg-black/10">
                              <h4 className="font-semibold text-white mb-3">TAO Staking Details</h4>
                              
                              {/* Transaction Hash */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-crypto-silver text-sm">Transaction Hash:</span>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(tx.transactionHash)}
                                      className="text-crypto-silver hover:text-white"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                    <a 
                                      href={getExplorerUrl(tx.network, tx.transactionHash)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-orange-400 hover:text-orange-300"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                </div>
                                <code className="text-xs text-crypto-silver font-mono bg-black/30 p-2 rounded block break-all">
                                  {tx.transactionHash}
                                </code>
                              </div>

                              {/* Staker Address */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-crypto-silver text-sm">Staker Address:</span>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(tx.fromAddress)}
                                      className="text-crypto-silver hover:text-white"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                    <a 
                                      href={getAddressExplorerUrl(tx.network, tx.fromAddress)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-orange-400 hover:text-orange-300"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                </div>
                                <code className="text-xs text-crypto-silver font-mono bg-black/30 p-2 rounded block break-all">
                                  {tx.fromAddress}
                                </code>
                              </div>

                              {/* Subnet Information */}
                              {tx.toAddress && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-crypto-silver text-sm">Target Subnet:</span>
                                  </div>
                                  <div className="bg-gradient-to-r from-orange-500/20 to-orange-400/20 border border-orange-500/30 rounded-lg p-3">
                                    <span className="text-orange-400 font-medium text-sm">{tx.toAddress}</span>
                                  </div>
                                </div>
                              )}

                              {/* TAO Amount Details */}
                              <div className="space-y-2">
                                <span className="text-crypto-silver text-sm">Stake Amount:</span>
                                <div className="bg-black/30 rounded-lg p-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-white font-semibold">{parseFloat(tx.amount).toLocaleString()} TAO</span>
                                    <span className="text-orange-400 font-bold">${usdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-crypto-silver mx-auto mb-4" />
                  <p className="text-crypto-silver">Loading TAO staking whale activity...</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </GlassCard>

      {/* Live Whale Monitoring (Premium Feature) */}
      {hasAccess && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <Activity className="text-crypto-success mr-3 h-6 w-6" />
              Live Whale Monitoring
            </h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-crypto-success rounded-full animate-pulse"></div>
              <span className="text-crypto-success text-sm">Live</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {premiumTransactions?.map((transaction) => (
              <div key={transaction.id} className="backdrop-blur-sm bg-white/5 rounded-xl border border-crypto-silver/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full mr-3 flex items-center justify-center text-xs font-bold ${
                      transaction.network === 'BASE' 
                        ? 'bg-blue-500' 
                        : 'bg-gradient-to-r from-purple-500 to-pink-500'
                    }`}>
                      {transaction.network === 'BASE' ? 'B' : 'Τ'}
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{transaction.token} Transaction</h3>
                      <p className="text-sm text-crypto-silver">
                        {new Date(transaction.timestamp || '').toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-crypto-success font-medium">${transaction.amountUsd}</div>
                    <div className="text-crypto-silver text-sm">{transaction.amount} {transaction.token}</div>
                  </div>
                </div>
                <div className="text-xs text-crypto-silver">
                  From: {transaction.fromAddress}
                  {transaction.toAddress && (
                    <span className="block">To: {transaction.toAddress}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Payment Modal */}
      <CryptoPaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedPaymentType(null);
        }}
        paymentType={selectedPaymentType}
        amount={selectedPaymentType === 'ETH' ? '0.1' : '1'}
        usdValue={selectedPaymentType === 'ETH' ? '$232.41' : '$553.24'}
      />
    </div>
  );
}
