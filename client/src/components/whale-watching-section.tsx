import { useState } from "react";
import { Crown, Lock, Activity, DollarSign } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWhaleWatching } from "@/hooks/use-whale-watching";
import { CryptoPaymentModal } from "@/components/crypto-payment-modal";

export default function WhaleWatchingSection() {
  const { data: hasAccess, premiumTransactions, freeTransactions } = useWhaleWatching(1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<'ETH' | 'TAO' | null>(null);

  const handlePremiumPayment = (token: 'ETH' | 'TAO') => {
    setSelectedPaymentType(token);
    setShowPaymentModal(true);
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
              BASE Altcoins
            </TabsTrigger>
            <TabsTrigger value="tao" className="data-[state=active]:bg-white/20 text-white">
              TAO Staking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="base">
            <div className="space-y-4">
              <div className="text-sm text-crypto-silver mb-4">
                Tracking altcoin purchases over $10,000: SKI, TIG, GIZA, VIRTUAL, HIGHER, MFER, TOSHI, AERO, DEGEN
              </div>
              {freeTransactions && freeTransactions.length > 0 ? (
                freeTransactions
                  .filter(tx => tx.network === 'BASE')
                  .slice(0, 10)
                  .map((tx, index) => (
                  <div key={tx.id || index} className="backdrop-blur-sm bg-white/5 rounded-xl border border-crypto-silver/10 p-4 hover:bg-white/10 transition-all duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-500 rounded-full mr-3 flex items-center justify-center text-xs font-bold">
                          B
                        </div>
                        <div>
                          <h3 className="font-medium text-white">
                            {tx.amount} ${tx.token}
                          </h3>
                          <p className="text-crypto-silver text-sm">
                            BASE Network • ${parseFloat(tx.amountUsd).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-crypto-success font-semibold">${parseFloat(tx.amountUsd).toLocaleString()}</div>
                        <div className="text-crypto-silver text-xs">
                          {new Date(tx.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-crypto-silver text-xs font-mono">
                      From: {tx.fromAddress.slice(0, 6)}...{tx.fromAddress.slice(-4)}
                      {' → '}
                      To: {tx.toAddress.slice(0, 6)}...{tx.toAddress.slice(-4)}
                    </div>
                  </div>
                ))
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
                Monitoring TAO staking events over $2,500 across all Bittensor subnets
              </div>
              {freeTransactions && freeTransactions.length > 0 ? (
                freeTransactions
                  .filter(tx => tx.network === 'TAO')
                  .slice(0, 10)
                  .map((tx, index) => (
                  <div key={tx.id || index} className="backdrop-blur-sm bg-white/5 rounded-xl border border-orange-500/20 p-4 hover:bg-white/10 transition-all duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full mr-3 flex items-center justify-center text-xs font-bold">
                          τ
                        </div>
                        <div>
                          <h3 className="font-medium text-white">
                            {tx.amount} TAO
                          </h3>
                          <p className="text-crypto-silver text-sm">
                            Subnet Stake • ${parseFloat(tx.amountUsd).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-orange-400 font-semibold">${parseFloat(tx.amountUsd).toLocaleString()}</div>
                        <div className="text-crypto-silver text-xs">
                          {new Date(tx.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-crypto-silver text-xs font-mono">
                      Staker: {tx.fromAddress.slice(0, 6)}...{tx.fromAddress.slice(-4)}
                      {' → '}
                      SN{tx.toAddress ? tx.toAddress.slice(-2) : '??'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-crypto-silver mx-auto mb-4" />
                  <p className="text-crypto-silver">Loading TAO staking whale activity...</p>
                </div>
              )}
                    <p className="text-sm text-crypto-silver">2 minutes ago</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-crypto-success font-medium">$47,823.45</div>
                  <div className="text-crypto-silver text-sm">ETH Purchase</div>
                </div>
              </div>
              <div className="text-xs text-crypto-silver blur-sm">
                Address: 0x742d35cc6bf9f...
              </div>
            </div>
          </div>

          <div className="backdrop-blur-sm bg-white/5 rounded-xl border border-crypto-silver/10 p-4 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-3 flex items-center justify-center text-xs font-bold">Τ</div>
                  <div>
                    <h3 className="font-medium text-white">Large TAO Stake</h3>
                    <p className="text-sm text-crypto-silver">8 minutes ago</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-crypto-success font-medium">$89,156.78</div>
                  <div className="text-crypto-silver text-sm">Subnet 27 Stake</div>
                </div>
              </div>
              <div className="text-xs text-crypto-silver blur-sm">
                Hotkey: 5GrwvaEF5zXb26F...
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-sm bg-gradient-to-r from-crypto-warning/10 to-crypto-warning/5 rounded-xl border border-crypto-warning/20 p-4 text-center">
            <Lock className="text-crypto-warning text-2xl mb-2 mx-auto" />
            <p className="text-crypto-silver text-sm">Unlock premium access to see full transaction details and real-time alerts</p>
          </div>
        </div>
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
