import { MacroTerminalLive } from '@/components/macro-terminal-live';
import { useSetPageContext } from '@/hooks/useSetPageContext';

export default function MacroTerminalPage() {
  useSetPageContext(
    '[Page: Macro Terminal]\nShows live macroeconomic indicators: Fed funds rate, CPI/inflation, yield curve (2Y/10Y spread), VIX, DXY, SPX/SPY performance, crude oil, gold, and market breadth. Use this for macro-driven analysis, rate sensitivity, and risk-on/risk-off regime assessment.',
    []
  );
  return <MacroTerminalLive />;
}
