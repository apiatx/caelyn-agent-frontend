import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import TopChartsPage from "@/pages/top-charts";
import EthereumPage from "@/pages/ethereum";
import SolanaPage from "@/pages/solana";
import DeFiPage from "@/pages/defi";
import HypePage from "@/pages/hype";
import AbstractPage from "@/pages/abstract";
import CryptoStocks from "@/pages/crypto-stocks";
import BittensorPage from "@/pages/bittensor";
import BTCPage from "@/pages/btc";

import OnchainPage from "@/pages/onchain";
import BasePage from "@/pages/base";
import PortfolioPage from "@/pages/portfolio";
import AboutPage from "@/pages/about";

import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/app" component={Dashboard} />
      <Route path="/app/majors" component={BTCPage} />
      <Route path="/btc" component={BTCPage} />
      <Route path="/majors" component={BTCPage} />
      <Route path="/app/onchain" component={OnchainPage} />
      <Route path="/onchain" component={OnchainPage} />
      <Route path="/app/base" component={BasePage} />
      <Route path="/app/ethereum" component={EthereumPage} />
      <Route path="/app/solana" component={SolanaPage} />
      <Route path="/app/hype" component={HypePage} />
      <Route path="/app/bittensor" component={BittensorPage} />
      <Route path="/app/abstract" component={AbstractPage} />
      <Route path="/app/defi" component={DeFiPage} />
      <Route path="/defi" component={DeFiPage} />
      <Route path="/app/crypto-stocks" component={CryptoStocks} />
      <Route path="/app/stocks" component={CryptoStocks} />
      <Route path="/app/portfolio" component={PortfolioPage} />
      <Route path="/portfolio" component={PortfolioPage} />
      <Route path="/app/about" component={AboutPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
