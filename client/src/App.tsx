import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MainLayout } from "@/components/main-layout";
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
import CryptoStocks from "@/pages/crypto-stocks";
import StocksChartsPage from "@/pages/stocks-charts";
import StocksDashboardPage from "@/pages/stocks-dashboard";
import StocksSectorsPage from "@/pages/stocks-sectors";
import StocksPortfolioPage from "@/pages/stocks-portfolio";
import StocksFundamentalsPage from "@/pages/stocks-fundamentals";
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
import OnchainLaunchpadPage from "@/pages/onchain-launchpad";
import OnchainAirdropPage from "@/pages/onchain-airdrop";
import OnchainMemesPage from "@/pages/onchain-memes";
import OnchainDiscoverPage from "@/pages/onchain-discover";
import OnchainAnalyzePage from "@/pages/onchain-analyze";
import OnchainInspectPage from "@/pages/onchain-inspect";
import BasePage from "@/pages/base";
import PortfolioPage from "@/pages/portfolio";
import PredictPage from "@/pages/predict";
import AboutPage from "@/pages/about";

import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/app" component={Dashboard} />
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
      <Route path="/app/onchain/launchpad" component={OnchainLaunchpadPage} />
      <Route path="/app/onchain/airdrop" component={OnchainAirdropPage} />
      <Route path="/app/onchain/memes" component={OnchainMemesPage} />
      <Route path="/app/onchain/discover" component={OnchainDiscoverPage} />
      <Route path="/app/onchain/analyze" component={OnchainAnalyzePage} />
      <Route path="/app/onchain/inspect" component={OnchainInspectPage} />
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
      <Route path="/app/stocks" component={CryptoStocks} />
      <Route path="/app/stonks" component={CryptoStocks} />
      <Route path="/app/stocks/dashboard" component={StocksDashboardPage} />
      <Route path="/app/stocks/charts" component={StocksChartsPage} />
      <Route path="/app/stocks/sectors" component={StocksSectorsPage} />
      <Route path="/app/stocks/fundamentals" component={StocksFundamentalsPage} />
      <Route path="/app/stocks/portfolio" component={StocksPortfolioPage} />
      <Route path="/app/crypto-stonks" component={CryptoStonks} />
      <Route path="/app/commodities" component={CommoditiesPage} />
      <Route path="/commodities" component={CommoditiesPage} />
      <Route path="/app/predict" component={PredictPage} />
      <Route path="/predict" component={PredictPage} />
      <Route path="/app/portfolio" component={PortfolioPage} />
      <Route path="/portfolio" component={PortfolioPage} />
      <Route path="/app/about" component={AboutPage} />
      <Route path="/about" component={AboutPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <MainLayout>
          <Router />
        </MainLayout>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
