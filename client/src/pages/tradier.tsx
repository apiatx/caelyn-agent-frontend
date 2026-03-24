import OptionsPage from "./options";

export default function TradierPage() {
  return <OptionsPage apiBase="/api/tradier" pageTitle="TRADIER" queryPresetIntent="tradier_flow" />;
}
