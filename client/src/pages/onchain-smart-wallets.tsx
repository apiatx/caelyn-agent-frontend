import { UniversalNavigation } from "@/components/universal-navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Shield, Bot, ExternalLink, Zap, Lock, Users, ArrowUpRight } from "lucide-react";
import { openSecureLink } from '@/utils/security';
import onchainImage from "@assets/images_1756750962640.jpeg";

// Safe Glass Card component
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`backdrop-blur-sm bg-gradient-to-br from-black/90 to-black/95 border border-white/20 ${className}`}>
    {children}
  </Card>
);

interface SafeLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const SafeLink: React.FC<SafeLinkProps> = ({ href, children, className = "" }) => {
  const openInNewTab = (url: string) => {
    openSecureLink(url);
  };

  return (
    <button onClick={() => openInNewTab(href)} className={className}>
      {children}
    </button>
  );
};

export default function OnchainSmartWalletsPage() {
  const openInNewTab = (url: string) => {
    openSecureLink(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <UniversalNavigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <img 
                src={onchainImage} 
                alt="Smart Wallets" 
                className="w-12 h-12 rounded-xl object-cover"
              />
              <h1 className="text-3xl font-bold text-white">Smart Wallets</h1>
            </div>
            <p className="text-crypto-silver">Advanced wallet solutions and account abstraction</p>
          </div>

          {/* Smart Wallet Platforms */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Wallet className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white">Smart Wallet Platforms</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <SafeLink
                href='https://www.safe.global/'
                className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white group-hover:text-green-300 mb-2">Safe (Gnosis Safe)</h4>
                <p className="text-gray-400 group-hover:text-gray-300 text-sm">Multi-signature smart contract wallet</p>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs mt-2">
                  MULTI-SIG
                </Badge>
              </SafeLink>

              <SafeLink
                href='https://www.coinbase.com/wallet/smart-wallet'
                className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white group-hover:text-blue-300 mb-2">Coinbase Smart Wallet</h4>
                <p className="text-gray-400 group-hover:text-gray-300 text-sm">Social recovery and gasless transactions</p>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs mt-2">
                  GASLESS
                </Badge>
              </SafeLink>

              <SafeLink
                href='https://www.argent.xyz/'
                className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white group-hover:text-purple-300 mb-2">Argent</h4>
                <p className="text-gray-400 group-hover:text-gray-300 text-sm">Account abstraction and social recovery</p>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs mt-2">
                  SOCIAL RECOVERY
                </Badge>
              </SafeLink>
            </div>
          </GlassCard>

          {/* Account Abstraction Tools */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                  <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white">Account Abstraction</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SafeLink
                href='https://www.alchemy.com/account-abstraction'
                className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/10 hover:from-orange-500/20 hover:to-orange-600/20 border border-orange-500/20 hover:border-orange-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-orange-300 mb-1">Alchemy AA</div>
                <div className="text-xs text-crypto-silver">Account abstraction infrastructure</div>
              </SafeLink>

              <SafeLink
                href='https://www.biconomy.io/'
                className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">Biconomy</div>
                <div className="text-xs text-crypto-silver">Meta-transactions and gasless UX</div>
              </SafeLink>

              <SafeLink
                href='https://zerodev.app/'
                className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">ZeroDev</div>
                <div className="text-xs text-crypto-silver">Smart wallet SDK</div>
              </SafeLink>

              <SafeLink
                href='https://pimlico.io/'
                className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-green-300 mb-1">Pimlico</div>
                <div className="text-xs text-crypto-silver">ERC-4337 bundler and paymaster</div>
              </SafeLink>
            </div>
          </GlassCard>

          {/* Multi-Chain Wallets */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white">Multi-Chain Solutions</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <SafeLink
                href='https://www.rainbow.me/'
                className="p-6 bg-gradient-to-br from-pink-500/10 to-pink-600/10 hover:from-pink-500/20 hover:to-pink-600/20 border border-pink-500/20 hover:border-pink-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white group-hover:text-pink-300 mb-2">Rainbow</h4>
                <p className="text-gray-400 group-hover:text-gray-300 text-sm">Ethereum wallet with DeFi integration</p>
              </SafeLink>

              <SafeLink
                href='https://rabby.io/'
                className="p-6 bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 hover:from-yellow-500/20 hover:to-yellow-600/20 border border-yellow-500/20 hover:border-yellow-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ArrowUpRight className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white group-hover:text-yellow-300 mb-2">Rabby</h4>
                <p className="text-gray-400 group-hover:text-gray-300 text-sm">Multi-chain wallet browser extension</p>
              </SafeLink>

              <SafeLink
                href='https://www.okx.com/web3'
                className="p-6 bg-gradient-to-br from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 border border-red-500/20 hover:border-red-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white group-hover:text-red-300 mb-2">OKX Web3</h4>
                <p className="text-gray-400 group-hover:text-gray-300 text-sm">All-in-one Web3 wallet</p>
              </SafeLink>
            </div>
          </GlassCard>

          {/* Developer Tools */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white">Developer Tools</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SafeLink
                href='https://docs.walletconnect.com/'
                className="p-4 bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 hover:from-cyan-500/20 hover:to-cyan-600/20 border border-cyan-500/20 hover:border-cyan-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-cyan-300 mb-1">WalletConnect</div>
                <div className="text-xs text-crypto-silver">Connect wallets to dApps</div>
              </SafeLink>

              <SafeLink
                href='https://web3modal.com/'
                className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">Web3Modal</div>
                <div className="text-xs text-crypto-silver">Wallet connection interface</div>
              </SafeLink>

              <SafeLink
                href='https://wagmi.sh/'
                className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">wagmi</div>
                <div className="text-xs text-crypto-silver">React hooks for Ethereum</div>
              </SafeLink>

              <SafeLink
                href='https://viem.sh/'
                className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg transition-all duration-300 text-left group"
              >
                <div className="text-sm font-medium text-white group-hover:text-green-300 mb-1">viem</div>
                <div className="text-xs text-crypto-silver">TypeScript interface for Ethereum</div>
              </SafeLink>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}