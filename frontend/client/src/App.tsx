import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MainLayout } from "@/components/main-layout";
import { ChatbotProvider } from "@/contexts/ChatbotContext";
import { PageContextProvider } from "@/contexts/PageContextContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AlertProvider } from "@/contexts/AlertContext";
import { AlertBubbles } from "@/components/alert-bubbles";
import { AlertHistoryButton } from "@/components/alert-history-drawer";
import ChatbotWidget from "@/components/ChatbotWidget";
import LoginPage from "@/pages/login";
import HomePage from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import TopChartsPage from "@/pages/top-charts";
import AltcoinsPage from "@/pages/altcoins";
import EthereumPage from "@/pages/ethereum";
import SolanaPage from "@/pages/solana";
import ArbitrumPage from "@/pages/arbitrum";
import DeFiPage from "@/pages/defi";
import BTCDeFiPage from "@/pages/btc-defi";
import DeFAIPage from "@/pages/defai";
import DePINPage from "@/pages/depin";
import P2EPage from "@/pages/p2e";
import BNBPage from "@/pages/bnb";
import SUIPage from "@/pages/sui";
import CaelynAIPage from "@/pages/hippo-ai";
import CryptoStocks from "@/pages/crypto-stocks";
import StocksSectorsPage from "@/pages/stocks-sectors";
import StocksFundamentalsPage from "@/pages/stocks-fundamentals";
import StocksScreeningPage from "@/pages/stocks-screening";
import StocksEarningsCalendarPage from "@/pages/stocks-earnings-calendar";
import CryptoStonks from "@/pages/crypto-stonks";
import CommoditiesPage from "@/pages/commodities";
import RWAPage from "@/pages/rwa";
import BittensorPage from "@/pages/bittensor";
import TradePage from "@/pages/trade";
import TradePerpsPage from "@/pages/trade-perps";
import TradeSpotTerminalsPage from "@/pages/trade-spot-terminals";
import TradeOptionsPage from "@/pages/trade-options";
import TradeOnRampPage from "@/pages/trade-onramp";

import OnchainPage from "@/pages/onchain";
import OnchainAlphaPage from "@/pages/onchain-alpha";
import OnchainSmartWalletsPage from "@/pages/onchain-smart-wallets";
import OnchainSocialPage from "@/pages/onchain-social";
import DevQAPage from "@/pages/dev-qa";
import OnchainLaunchpadPage from "@/pages/onchain-launchpad";
import OnchainAirdropPage from "@/pages/onchain-airdrop";
import OnchainMemesPage from "@/pages/onchain-memes";
import OnchainDiscoverPage from "@/pages/onchain-discover";
import OnchainAnalyzePage from "@/pages/onchain-analyze";
import BasePage from "@/pages/base";
import PortfolioPage from "@/pages/portfolio";
import PredictPage from "@/pages/predict";
import NotifAIPage from "@/pages/notifai";
import OptionsPage from "@/pages/options";
import MacroTerminalPage from "@/pages/macro-terminal";
import CaelynTerminalPage from "@/pages/caelyn-terminal-page";
import HyperliquidScreenerPage from "@/pages/hyperliquid-screener";
import InsiderActivityPage from "@/pages/stocks-insider-activity";
import WhaleWatchPage from "@/pages/whale-watch";
import AboutPage from "@/pages/about";
import WatchlistPage from "@/pages/watchlist";
import StrategyScreenerPage, { BottlenecksPage } from "@/pages/strategy-screener";
import MultiChartsPage from "@/pages/multicharts";
import ChartRadarPage from "@/pages/chart-radar";

import NotFound from "@/pages/not-found";
import { GlobalPrefetch } from "@/contexts/GlobalDataContext";
import LandingPage from "@/pages/landing";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    // Show minimal loading state while verifying token
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050608' }}>
        <div className="w-6 h-6 border-2 border-purple-500/40 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated && location !== '/login') {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={LandingPage} />
      <Route path="/app"><Redirect to="/app/home" /></Route>
      <Route path="/app/home" component={HomePage} />
      <Route path="/home" component={HomePage} />
      <Route path="/app/market-overview" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/app/charts/majors" component={TopChartsPage} />
      <Route path="/app/charts/altcoins" component={AltcoinsPage} />
      <Route path="/app/altcoins" component={AltcoinsPage} />
      <Route path="/app/majors" component={TopChartsPage} />
      <Route path="/majors" component={TopChartsPage} />
      <Route path="/top-charts" component={TopChartsPage} />
      <Route path="/alts" component={AltcoinsPage} />
      <Route path="/app/onchain" component={OnchainPage} />
      <Route path="/onchain" component={OnchainPage} />
      <Route path="/app/onchain/analytics" component={OnchainAlphaPage} />
      <Route path="/app/onchain/alpha" component={OnchainAlphaPage} />
      <Route path="/app/onchain/smart-wallets" component={OnchainSmartWalletsPage} />
      <Route path="/app/onchain/social" component={OnchainSocialPage} />
      <Route path="/app/dev/qa" component={DevQAPage} />
      <Route path="/app/onchain/launchpad" component={OnchainLaunchpadPage} />
      <Route path="/app/onchain/airdrop" component={OnchainAirdropPage} />
      <Route path="/app/onchain/memes" component={OnchainMemesPage} />
      <Route path="/app/onchain/discover" component={OnchainDiscoverPage} />
      <Route path="/app/onchain/analyze" component={OnchainAnalyzePage} />
      <Route path="/app/base" component={BasePage} />
      <Route path="/base" component={BasePage} />
      <Route path="/app/ethereum" component={EthereumPage} />
      <Route path="/ethereum" component={EthereumPage} />
      <Route path="/app/arbitrum" component={ArbitrumPage} />
      <Route path="/arbitrum" component={ArbitrumPage} />
      <Route path="/app/solana" component={SolanaPage} />
      <Route path="/solana" component={SolanaPage} />
      <Route path="/app/bittensor" component={BittensorPage} />
      <Route path="/bittensor" component={BittensorPage} />
      <Route path="/app/bnb" component={BNBPage} />
      <Route path="/bnb" component={BNBPage} />
      <Route path="/app/sui" component={SUIPage} />
      <Route path="/sui" component={SUIPage} />
      <Route path="/app/trade" component={TradePage} />
      <Route path="/trade" component={TradePage} />
      <Route path="/app/trade/swidge" component={TradePage} />
      <Route path="/app/trade/perps" component={TradePerpsPage} />
      <Route path="/trade-perps" component={TradePerpsPage} />
      <Route path="/perps" component={TradePerpsPage} />
      <Route path="/app/trade/spot-terminals" component={TradeSpotTerminalsPage} />
      <Route path="/trade-spot-terminals" component={TradeSpotTerminalsPage} />
      <Route path="/spot-terminals" component={TradeSpotTerminalsPage} />
      <Route path="/app/trade/options" component={TradeOptionsPage} />
      <Route path="/app/trade-options" component={TradeOptionsPage} />
      <Route path="/trade-options" component={TradeOptionsPage} />
      <Route path="/app/trade/onramp" component={TradeOnRampPage} />
      <Route path="/trade-onramp" component={TradeOnRampPage} />
      <Route path="/app/defi" component={DeFiPage} />
      <Route path="/defi" component={DeFiPage} />
      <Route path="/app/defi/btc-defi" component={BTCDeFiPage} />
      <Route path="/app/defi/defai" component={DeFAIPage} />
      <Route path="/app/defi/depin" component={DePINPage} />
      <Route path="/app/p2e" component={P2EPage} />
      <Route path="/p2e" component={P2EPage} />
      <Route path="/app/rwa" component={RWAPage} />
      <Route path="/app/crypto-stocks" component={CryptoStocks} />
      <Route path="/app/caelyn-ai" component={CaelynAIPage} />
      <Route path="/app/hippo-ai"><Redirect to="/app/caelyn-ai" /></Route>
      <Route path="/app/stocks" component={CryptoStocks} />
      <Route path="/app/stonks" component={CryptoStocks} />
      <Route path="/app/stocks/screening" component={StocksScreeningPage} />
      <Route path="/app/stocks/earnings-calendar" component={StocksEarningsCalendarPage} />
      <Route path="/app/stocks/insider-activity" component={InsiderActivityPage} />
      <Route path="/app/stocks/whale-watch" component={WhaleWatchPage} />
      <Route path="/whales" component={WhaleWatchPage} />

      <Route path="/app/stocks/dashboard"><Redirect to="/app/macro-terminal" /></Route>
      <Route path="/app/stocks/sectors" component={StocksSectorsPage} />
      <Route path="/app/stocks/fundamentals" component={StocksFundamentalsPage} />
      <Route path="/app/caelyn-terminal" component={CaelynTerminalPage} />
      <Route path="/app/hyperliquid-screener" component={HyperliquidScreenerPage} />
      <Route path="/app/crypto-stonks" component={CryptoStonks} />
      <Route path="/app/commodities" component={CommoditiesPage} />
      <Route path="/commodities" component={CommoditiesPage} />
      <Route path="/app/notifai" component={NotifAIPage} />
      <Route path="/notifai" component={NotifAIPage} />
      <Route path="/app/macro-terminal" component={MacroTerminalPage} />
      <Route path="/macro-terminal" component={MacroTerminalPage} />
      <Route path="/app/stocks/should-i-be-trading"><Redirect to="/app/macro-terminal" /></Route>
      <Route path="/should-i-be-trading"><Redirect to="/app/macro-terminal" /></Route>
      <Route path="/app/options" component={OptionsPage} />
      <Route path="/options" component={OptionsPage} />
      <Route path="/app/tradier"><Redirect to="/app/options" /></Route>
      <Route path="/tradier"><Redirect to="/app/options" /></Route>
      <Route path="/app/predict" component={PredictPage} />
      <Route path="/predict" component={PredictPage} />
      <Route path="/app/portfolio" component={PortfolioPage} />
      <Route path="/portfolio" component={PortfolioPage} />
      <Route path="/app/watchlist" component={WatchlistPage} />
      <Route path="/watchlist" component={WatchlistPage} />
      <Route path="/app/multicharts">{() => null}</Route>
      <Route path="/multicharts">{() => null}</Route>
      <Route path="/app/chart-radar" component={ChartRadarPage} />
      <Route path="/chart-radar" component={ChartRadarPage} />
      <Route path="/app/strategy-screener" component={StrategyScreenerPage} />
      <Route path="/strategy-screener" component={StrategyScreenerPage} />
      <Route path="/app/bottlenecks" component={BottlenecksPage} />
      <Route path="/app/about" component={AboutPage} />
      <Route path="/about" component={AboutPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  const isMultichartsRoute = location === '/app/multicharts' || location === '/multicharts';

  if (location === '/login' || location === '/') {
    return (
      <>
        <Toaster />
        <Router />
      </>
    );
  }

  return (
    <AuthGuard>
      <GlobalPrefetch />
      <PageContextProvider>
        <ChatbotProvider>
          <AlertProvider>
            <TooltipProvider>
              <Toaster />
              <MainLayout>
                {/* Normal router — hidden on multicharts route so the always-on instance shows instead */}
                <div style={isMultichartsRoute ? { display: 'none' } : undefined}>
                  <Router />
                </div>
                {/* Always-mounted MultiChartsPage — iframes are never destroyed on navigation */}
                {!isLoading && isAuthenticated && (
                  <div style={isMultichartsRoute ? undefined : { display: 'none' }}>
                    <MultiChartsPage isActive={isMultichartsRoute} />
                  </div>
                )}
              </MainLayout>
              <ChatbotWidget />
              <AlertBubbles />
              <AlertHistoryButton />
            </TooltipProvider>
          </AlertProvider>
        </ChatbotProvider>
      </PageContextProvider>
    </AuthGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
