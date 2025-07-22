import { useState } from "react";
import { ChartLine, Settings, Activity, Eye, TrendingUp, BarChart3, Brain, Wallet, Zap, DollarSign, Layers } from "lucide-react";
import { Link } from "wouter";
import DeFiSection from "@/components/defi-section";
import cryptoHippoImage from "@assets/image_1752975467353.png";

import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";

export default function DeFiPage() {
  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      {/* Header */}
      <header className="glass-card-dark border-b border-crypto-silver/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center py-3 lg:py-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden">
                <img 
                  src={cryptoHippoImage}
                  alt="CryptoHippo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                CryptoHippo
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 mt-4 lg:mt-6">
        <GlassCard className="p-1 sm:p-2">
          {/* Desktop Navigation */}
          <div className="hidden lg:flex space-x-2">
            <Link href="/">
              <button className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                <Activity className="w-4 h-4 mr-2 inline" />Market Overview
              </button>
            </Link>
            <Link href="/btc">
              <button className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                <TrendingUp className="w-4 h-4 mr-2 inline" />BTC
              </button>
            </Link>
            <Link href="/alts">
              <button className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                <BarChart3 className="w-4 h-4 mr-2 inline" />Alts
              </button>
            </Link>
            <Link href="/#alpha">
              <button className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                <TrendingUp className="w-4 h-4 mr-2 inline" />Alpha
              </button>
            </Link>
            <Link href="/#base">
              <button className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                <ChartLine className="w-4 h-4 mr-2 inline" />Base
              </button>
            </Link>
            <Link href="/#bittensor">
              <button className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                <Brain className="w-4 h-4 mr-2 inline" />Bittensor
              </button>
            </Link>
            <Link href="/hype">
              <button className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                <Eye className="w-4 h-4 mr-2 inline" />Hype
              </button>
            </Link>
            <Link href="/#abstract">
              <button className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                <Layers className="w-4 h-4 mr-2 inline" />Abstract
              </button>
            </Link>
            <Link href="/solana">
              <button className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                <Zap className="w-4 h-4 mr-2 inline" />Solana
              </button>
            </Link>
            <button className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white">
              <DollarSign className="w-4 h-4 mr-2 inline" />DeFi
            </button>
            <Link href="/#portfolio">
              <button className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                <Wallet className="w-4 h-4 mr-2 inline" />Portfolio
              </button>
            </Link>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden overflow-x-auto">
            <div className="flex space-x-1 min-w-max pb-2">
              <Link href="/">
                <button className="whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                  <Activity className="w-4 h-4 mr-1 inline" />Market Overview
                </button>
              </Link>
              <Link href="/btc">
                <button className="whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                  <TrendingUp className="w-4 h-4 mr-1 inline" />BTC
                </button>
              </Link>
              <Link href="/alts">
                <button className="whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                  <BarChart3 className="w-4 h-4 mr-1 inline" />Alts
                </button>
              </Link>
              <Link href="/#alpha">
                <button className="whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                  <TrendingUp className="w-4 h-4 mr-1 inline" />Alpha
                </button>
              </Link>
              <Link href="/#base">
                <button className="whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                  <ChartLine className="w-4 h-4 mr-1 inline" />Base
                </button>
              </Link>
              <Link href="/#bittensor">
                <button className="whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                  <Brain className="w-4 h-4 mr-1 inline" />Bittensor
                </button>
              </Link>
              <Link href="/hype">
                <button className="whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                  <Eye className="w-4 h-4 mr-1 inline" />Hype
                </button>
              </Link>
              <Link href="/#abstract">
                <button className="whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                  <Layers className="w-4 h-4 mr-1 inline" />Abstract
                </button>
              </Link>
              <Link href="/solana">
                <button className="whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                  <Zap className="w-4 h-4 mr-1 inline" />Solana
                </button>
              </Link>
              <button className="whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white">
                <DollarSign className="w-4 h-4 mr-1 inline" />DeFi
              </button>
              <Link href="/#portfolio">
                <button className="whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver">
                  <Wallet className="w-4 h-4 mr-1 inline" />Portfolio
                </button>
              </Link>
            </div>
          </div>
        </GlassCard>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 pb-8 lg:pb-12">
        <DeFiSection />
      </main>
    </div>
  );
}