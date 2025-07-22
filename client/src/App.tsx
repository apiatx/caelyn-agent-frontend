import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import BTCPage from "@/pages/btc";
import AltsPage from "@/pages/alts";
import SolanaPage from "@/pages/solana";
import DeFiPage from "@/pages/defi";
import HypePage from "@/pages/hype";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/btc" component={BTCPage} />
      <Route path="/alts" component={AltsPage} />
      <Route path="/solana" component={SolanaPage} />
      <Route path="/defi" component={DeFiPage} />
      <Route path="/hype" component={HypePage} />
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
