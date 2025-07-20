import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, BarChart3, DollarSign } from "lucide-react";

// Glass card component for Bitcoin section
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function BitcoinSection() {
  // TradingView widget configuration for Bitcoin with Global M2 overlay
  const tradingViewWidget = `
<!-- TradingView Widget BEGIN -->
<div class="tradingview-widget-container" style="height:100%;width:100%">
  <div class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%"></div>
  <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
  {
  "autosize": true,
  "symbol": "BINANCE:BTCUSDT",
  "interval": "D",
  "timezone": "Etc/UTC",
  "theme": "dark",
  "style": "1",
  "locale": "en",
  "enable_publishing": false,
  "backgroundColor": "rgba(0, 0, 0, 0.5)",
  "gridColor": "rgba(255, 255, 255, 0.1)",
  "hide_top_toolbar": false,
  "hide_legend": false,
  "save_image": false,
  "calendar": false,
  "hide_volume": false,
  "support_host": "https://www.tradingview.com"
  }
  </script>
</div>
<!-- TradingView Widget END -->
  `;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Bitcoin & Global M2 Analysis</h2>
        <p className="text-crypto-silver">Bitcoin price action with Global M2 money supply overlay analysis</p>
      </div>

      {/* Global M2 Info Card */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Global M2 Money Supply Indicator</h3>
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
            12-WEEK LEAD
          </Badge>
        </div>
        <div className="bg-white/5 rounded-lg p-6 border border-crypto-silver/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-white mb-3">What is Global M2?</h4>
              <p className="text-crypto-silver text-sm mb-3">
                Global M2 tracks the combined money supply from major economies including USA, Eurozone, China, Japan, UK, Canada, Australia, and more. 
                This indicator converts all currencies to USD for unified analysis.
              </p>
              <p className="text-crypto-silver text-sm">
                The 12-week lead overlay helps identify potential Bitcoin price movements based on global liquidity changes.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Included Countries</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-crypto-silver">
                <div>• USA (USM2)</div>
                <div>• Eurozone (EUM2)</div>
                <div>• China (CNM2)</div>
                <div>• Japan (JPM2)</div>
                <div>• UK (GBM2)</div>
                <div>• Canada (CAM2)</div>
                <div>• Australia (AUM3)</div>
                <div>• India (INM2)</div>
                <div>• South Korea (KRM2)</div>
                <div>• Brazil (BRM2)</div>
                <div>• Russia (RUM2)</div>
                <div>• Switzerland (CHM2)</div>
                <div>• Mexico (MXM2)</div>
                <div>• Indonesia (IDM2)</div>
                <div>• Turkey (TRM2)</div>
                <div>• Saudi Arabia (SAM2)</div>
                <div>• Argentina (ARM2)</div>
                <div>• South Africa (ZAM2)</div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* TradingView Chart with Global M2 */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Bitcoin Chart with Global M2 Overlay</h3>
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
            LIVE ANALYSIS
          </Badge>
        </div>
        <div className="bg-white/5 rounded-lg p-4 border border-crypto-silver/20">
          <div className="mb-4">
            <p className="text-crypto-silver text-sm">
              <strong>How to add the Global M2 indicator:</strong><br/>
              1. Click the "Indicators" button in the chart toolbar<br/>
              2. Search for "Global M2 12-Week Lead"<br/>
              3. Or paste the Pine Script code provided below into a new indicator<br/>
              4. The blue line represents Global M2 money supply with 12-week forward projection
            </p>
          </div>
          <div className="h-[600px] w-full">
            <iframe
              srcDoc={`
                <!DOCTYPE html>
                <html>
                <head>
                  <style>
                    body { margin: 0; padding: 0; background: transparent; }
                    .tradingview-widget-container { height: 100vh; width: 100%; }
                  </style>
                </head>
                <body>
                  ${tradingViewWidget}
                </body>
                </html>
              `}
              className="w-full h-full rounded-lg border border-crypto-silver/20"
              title="Bitcoin TradingView Chart"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      </GlassCard>

      {/* Pine Script Code */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Global M2 Pine Script Code</h3>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            PINE SCRIPT v6
          </Badge>
        </div>
        <div className="bg-gray-900/80 rounded-lg p-4 border border-crypto-silver/20">
          <div className="mb-3">
            <p className="text-crypto-silver text-sm">
              Copy this Pine Script code and paste it into TradingView's Pine Editor to create the Global M2 indicator:
            </p>
          </div>
          <div className="bg-black/60 rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 text-xs whitespace-pre-wrap font-mono">
{`//@version=6
indicator(title = "Global M2 12-Week Lead (for bitcoin)", shorttitle = 'Global M2', overlay=true, scale=scale.left)

// Slide weeks input (in weeks)
slide_weeks = input.int(defval=12, title="Slide Weeks Forward", minval=-52, maxval=52, tooltip="Number of weeks to slide the indicator forward")

// Enable settings for each country's M2
usa_active = input(true, title = "USM2 (USA Money Supply)")
europe_active = input(true, title = "EUM2 (Eurozone Money Supply)")
china_active = input(true, title = "CNM2 (China Money Supply)")
japan_active = input(true, title = "JPM2 (Japan Money Supply)")
uk_active = input(true, title = "UKM2 (United Kingdom Money Supply)")
canada_active = input(true, title = "CAM2 (Canada Money Supply)")
australia_active = input(true, title = "AUM3 (Australia Money Supply)")
india_active = input(true, title = "INM2 (India Money Supply)")
korea_active = input(true, title = "KRM2 (South Korea Money Supply)")
brazil_active = input(true, title = "BRM2 (Brazil Money Supply)")
russia_active = input(true, title = "RUM2 (Russia Money Supply)")
switzerland_active = input(true, title = "CHM2 (Switzerland Money Supply)")
mexico_active = input(true, title = "MXM2 (Mexico Money Supply)")
indonesia_active = input(true, title = "IDM2 (Indonesia Money Supply)")
turkey_active = input(true, title = "TRM2 (Turkey Money Supply)")
saudi_active = input(true, title = "SAM2 (Saudi Arabia Money Supply)")
argentina_active = input(true, title = "ARM2 (Argentina Money Supply)")
southafrica_active = input(true, title = "ZAM2 (South Africa Money Supply)")

// Daily timeframe for economic data
tf = "D"

// Get M2 data for each country and convert to USD
us_m2 = usa_active ? request.security("ECONOMICS:USM2", tf, close) : 0
eu_m2 = europe_active ? request.security("ECONOMICS:EUM2", tf, close) * request.security("FX_IDC:EURUSD", tf, close) : 0
china_m2 = china_active ? request.security("ECONOMICS:CNM2", tf, close) * request.security("FX_IDC:CNYUSD", tf, close) : 0
japan_m2 = japan_active ? request.security("ECONOMICS:JPM2", tf, close) * request.security("FX_IDC:JPYUSD", tf, close) : 0
uk_m2 = uk_active ? request.security("ECONOMICS:GBM2", tf, close) * request.security("FX_IDC:GBPUSD", tf, close) : 0
canada_m2 = canada_active ? request.security("ECONOMICS:CAM2", tf, close) * request.security("FX_IDC:CADUSD", tf, close) : 0
australia_m2 = australia_active ? request.security("ECONOMICS:AUM3", tf, close) * request.security("FX_IDC:AUDUSD", tf, close) : 0
india_m2 = india_active ? request.security("ECONOMICS:INM2", tf, close) * request.security("FX_IDC:INRUSD", tf, close) : 0
korea_m2 = korea_active ? request.security("ECONOMICS:KRM2", tf, close) * request.security("FX_IDC:KRWUSD", tf, close) : 0
brazil_m2 = brazil_active ? request.security("ECONOMICS:BRM2", tf, close) * request.security("FX_IDC:BRLUSD", tf, close) : 0
russia_m2 = russia_active ? request.security("ECONOMICS:RUM2", tf, close) * request.security("FX_IDC:RUBUSD", tf, close) : 0
switzerland_m2 = switzerland_active ? request.security("ECONOMICS:CHM2", tf, close) * request.security("FX_IDC:CHFUSD", tf, close) : 0
mexico_m2 = mexico_active ? request.security("ECONOMICS:MXM2", tf, close) * request.security("FX_IDC:MXNUSD", tf, close) : 0
indonesia_m2 = indonesia_active ? request.security("ECONOMICS:IDM2", tf, close) * request.security("FX_IDC:IDRUSD", tf, close) : 0
turkey_m2 = turkey_active ? request.security("ECONOMICS:TRM2", tf, close) * request.security("FX_IDC:TRYUSD", tf, close) : 0
saudi_m2 = saudi_active ? request.security("ECONOMICS:SAM2", tf, close) * request.security("FX_IDC:SARUSD", tf, close) : 0
argentina_m2 = argentina_active ? request.security("ECONOMICS:ARM2", tf, close) * request.security("FX_IDC:ARSUSD", tf, close) : 0
southafrica_m2 = southafrica_active ? request.security("ECONOMICS:ZAM2", tf, close) * request.security("FX_IDC:ZARUSD", tf, close) : 0

// Calculate total liquidity (In Trillions USD)
total = (us_m2 + eu_m2 + china_m2 + japan_m2 + uk_m2 + canada_m2 + australia_m2 + india_m2 + 
         korea_m2 + brazil_m2 + russia_m2 + switzerland_m2 + mexico_m2 + indonesia_m2 + 
         turkey_m2 + saudi_m2 + argentina_m2 + southafrica_m2) / 1000000000000

// Calculate minutes per bar based on timeframe
var float minutes_per_bar = 0
if timeframe.isminutes
    minutes_per_bar := timeframe.multiplier * 1
else if timeframe.isdaily
    minutes_per_bar := timeframe.multiplier * 1440  // 1440 minutes = 1 day
else if timeframe.isweekly
    minutes_per_bar := timeframe.multiplier * 10080  // 10080 minutes = 1 week
else if timeframe.ismonthly
    minutes_per_bar := timeframe.multiplier * 43200  // 43200 minutes ≈ 1 month (30 days)

// Convert weeks to bars: (weeks * days/week * minutes/day) / minutes_per_bar
bars_offset = math.round(slide_weeks * 7 * 1440 / minutes_per_bar)

// Plot total liquidity with dynamic offset
plot(total, offset=bars_offset, color=color.blue, linewidth=2)`}
            </pre>
          </div>
          <div className="mt-3">
            <p className="text-crypto-silver text-sm">
              <strong>Instructions:</strong><br/>
              1. Open TradingView and go to Pine Editor<br/>
              2. Create a new indicator<br/>
              3. Replace the default code with the code above<br/>
              4. Click "Add to Chart"<br/>
              5. The blue line will show Global M2 money supply with 12-week forward projection
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}