import { MacroTerminalLive } from '@/components/macro-terminal-live';
import { useSetPageContext } from '@/hooks/useSetPageContext';
import { useSetScreenContext } from '@/hooks/useSetScreenContext';

export default function MacroTerminalPage() {
  useSetPageContext(
    '[Page: Macro Terminal]\nShows live macroeconomic indicators: Fed funds rate, CPI/inflation, yield curve (2Y/10Y spread), VIX, DXY, SPX/SPY performance, crude oil, gold, and market breadth. Use this for macro-driven analysis, rate sensitivity, and risk-on/risk-off regime assessment.',
    []
  );
  useSetScreenContext({
    route: '/app/macro-terminal',
    page: 'macro',
    rendered_sections: ['fed_funds_rate', 'cpi_inflation', 'yield_curve_2y10y', 'vix', 'dxy', 'spx_spy', 'crude_oil', 'gold', 'market_breadth'],
  }, []);
  return <MacroTerminalLive />;
}
