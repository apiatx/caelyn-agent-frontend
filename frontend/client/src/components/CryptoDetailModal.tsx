import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type NullableNumber = number | null;

export interface CryptoDetailRow {
  coingecko_id: string | null;
  name: string;
  symbol: string;
  rank: NullableNumber;
  price: NullableNumber;
  change_1h_pct: NullableNumber;
  change_24h_pct: NullableNumber;
  change_7d_pct: NullableNumber;
  change_30d_pct: NullableNumber;
  market_cap: NullableNumber;
  volume_24h: NullableNumber;
  setup_label: string | null;
  pct_vs_sma_50: NullableNumber;
  pct_vs_sma_150: NullableNumber;
  pct_vs_sma_200: NullableNumber;
  sma_50_rising: boolean | null;
  sma_150_rising: boolean | null;
  sma_200_rising: boolean | null;
  bullish_ma_stack: boolean | null;
  volume_change_24h_pct: NullableNumber;
  volume_delta_7d_pct: NullableNumber;
  vol_x_7d: NullableNumber;
  volume_to_market_cap_pct: NullableNumber;
}

interface CryptoDetailModalProps {
  row: CryptoDetailRow;
  cmcSlug: string;
  onClose: () => void;
}

export function createCryptoDetailRow(
  row: Pick<CryptoDetailRow, 'name' | 'symbol'> & Partial<CryptoDetailRow>,
): CryptoDetailRow {
  return {
    coingecko_id: null,
    rank: null,
    price: null,
    change_1h_pct: null,
    change_24h_pct: null,
    change_7d_pct: null,
    change_30d_pct: null,
    market_cap: null,
    volume_24h: null,
    setup_label: null,
    pct_vs_sma_50: null,
    pct_vs_sma_150: null,
    pct_vs_sma_200: null,
    sma_50_rising: null,
    sma_150_rising: null,
    sma_200_rising: null,
    bullish_ma_stack: null,
    volume_change_24h_pct: null,
    volume_delta_7d_pct: null,
    vol_x_7d: null,
    volume_to_market_cap_pct: null,
    ...row,
  };
}

const COMMON_BINANCE_SYMBOLS = new Set([
  'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'AVAX', 'DOT', 'MATIC', 'LINK',
  'DOGE', 'SHIB', 'UNI', 'AAVE', 'LTC', 'NEAR', 'ATOM', 'APT', 'SUI', 'ARB',
  'OP', 'INJ', 'TIA', 'PEPE', 'RENDER', 'FET', 'TAO', 'ONDO', 'RUNE', 'XLM',
  'TRX', 'TON', 'HBAR', 'FIL', 'ICP',
]);

const INTERVALS = [
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
  { label: '1D', value: '1D' },
  { label: '1W', value: '1W' },
];

const present = (value: NullableNumber): value is number => value != null;

function formatPrice(value: NullableNumber) {
  if (!present(value)) return '—';
  if (value >= 1000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (value >= 1) return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
}

function formatUsd(value: NullableNumber) {
  if (!present(value)) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: NullableNumber) {
  return present(value) ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%` : '—';
}

function tone(value: NullableNumber) {
  if (!present(value) || Math.abs(value) < 0.5) return 'text-gray-300';
  return value > 0 ? 'text-emerald-400' : 'text-red-400';
}

function formatMa(value: NullableNumber, rising: boolean | null) {
  if (!present(value)) return '—';
  return `${formatPercent(value)}${rising == null ? '' : rising ? ' ↑' : ' ↓'}`;
}

function Metric({ label, value, className = 'text-gray-100' }: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
      <div className="font-mono text-[8px] uppercase tracking-[0.12em] text-gray-500">{label}</div>
      <div className={`mt-1 truncate font-mono text-[11px] font-semibold ${className}`}>{value}</div>
    </div>
  );
}

function tradingViewSymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  return COMMON_BINANCE_SYMBOLS.has(normalized) ? `BINANCE:${normalized}USDT` : normalized;
}

export default function CryptoDetailModal({ row, cmcSlug, onClose }: CryptoDetailModalProps) {
  const [interval, setInterval] = useState('1D');
  const tvSymbol = tradingViewSymbol(row.symbol);
  const coinGeckoUrl = row.coingecko_id
    ? `https://www.coingecko.com/en/coins/${row.coingecko_id}`
    : `https://www.coingecko.com/en/search?query=${encodeURIComponent(row.symbol)}`;
  const hasStack = present(row.pct_vs_sma_50)
    && present(row.pct_vs_sma_150)
    && present(row.pct_vs_sma_200);
  const chartUrl = `https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=440&interval=${interval}&style=1&toolbar_bg=0d1623&enable_publishing=false&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=exchange&hide_top_toolbar=false&disabled_features=%5B%22volume_force_overlay%22%2C%22create_volume_indicator_by_default%22%2C%22use_localstorage_for_settings%22%5D&enabled_features=%5B%22study_templates%22%2C%22header_indicators%22%2C%22header_compare%22%2C%22header_undo_redo%22%2C%22header_screenshot%22%2C%22header_chart_type%22%2C%22header_settings%22%2C%22header_resolutions%22%2C%22header_fullscreen_button%22%2C%22left_toolbar%22%2C%22drawing_templates%22%5D&symbol=${encodeURIComponent(tvSymbol)}`;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-5"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="crypto-detail-title"
        className="flex max-h-[92vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#080b0f]/95 shadow-2xl shadow-black/60"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="flex flex-shrink-0 items-center gap-3 border-b border-white/10 px-3 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 id="crypto-detail-title" className="truncate text-sm font-bold text-gray-100 sm:text-base">{row.name}</h2>
            <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-cyan-300/80">
              {row.symbol}{present(row.rank) ? ` · #${row.rank}` : ''}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-xs font-semibold text-gray-100 sm:text-sm">{formatPrice(row.price)}</div>
            <div className={`font-mono text-[10px] ${tone(row.change_24h_pct)}`}>{formatPercent(row.change_24h_pct)}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close crypto detail"
            className="rounded-md p-2 text-gray-500 transition hover:bg-white/5 hover:text-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          <div className="mb-2 flex items-center gap-1.5">
            {INTERVALS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setInterval(option.value)}
                className={`rounded border px-2 py-1 font-mono text-[9px] font-semibold transition ${
                  interval === option.value
                    ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300'
                    : 'border-white/10 text-gray-500 hover:text-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
            <iframe
              key={`${tvSymbol}-${interval}`}
              src={chartUrl}
              title={`${row.symbol} TradingView chart`}
              className="block h-[360px] w-full border-0 sm:h-[440px]"
            />
          </div>

          <section className="mt-5">
            <h3 className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-gray-500">Quote / Market</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              <Metric label="Price" value={formatPrice(row.price)} />
              <Metric label="1h" value={formatPercent(row.change_1h_pct)} className={tone(row.change_1h_pct)} />
              <Metric label="24h" value={formatPercent(row.change_24h_pct)} className={tone(row.change_24h_pct)} />
              <Metric label="7d" value={formatPercent(row.change_7d_pct)} className={tone(row.change_7d_pct)} />
              <Metric label="30d" value={formatPercent(row.change_30d_pct)} className={tone(row.change_30d_pct)} />
              <Metric label="Market Cap" value={formatUsd(row.market_cap)} />
              <Metric label="24h Volume" value={formatUsd(row.volume_24h)} />
            </div>
          </section>

          <section className="mt-5">
            <h3 className="mb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-gray-500">Technical / Volume</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <Metric label="Setup" value={row.setup_label || '—'} className="text-cyan-200" />
              <Metric label="50D" value={formatMa(row.pct_vs_sma_50, row.sma_50_rising)} className={tone(row.pct_vs_sma_50)} />
              <Metric label="150D" value={formatMa(row.pct_vs_sma_150, row.sma_150_rising)} className={tone(row.pct_vs_sma_150)} />
              <Metric label="200D" value={formatMa(row.pct_vs_sma_200, row.sma_200_rising)} className={tone(row.pct_vs_sma_200)} />
              <Metric label="MA Stack" value={hasStack ? row.bullish_ma_stack ? 'BULLISH' : 'MIXED' : '—'} className={hasStack && row.bullish_ma_stack ? 'text-emerald-400' : 'text-gray-300'} />
              <Metric label="Vol Δ24h" value={formatPercent(row.volume_change_24h_pct)} className={tone(row.volume_change_24h_pct)} />
              <Metric label="Vol Δ7d" value={formatPercent(row.volume_delta_7d_pct)} className={tone(row.volume_delta_7d_pct)} />
              <Metric label="VolX" value={present(row.vol_x_7d) ? `${row.vol_x_7d.toFixed(2)}x` : '—'} className="text-amber-300" />
              <Metric label="Vol/MC" value={formatPercent(row.volume_to_market_cap_pct)} className="text-violet-300" />
            </div>
          </section>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.07] pt-4">
            <a
              href={`https://coinmarketcap.com/currencies/${cmcSlug}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 font-mono text-[10px] font-semibold text-gray-200 transition hover:border-cyan-400/30 hover:text-cyan-200"
            >
              CoinMarketCap ↗
            </a>
            <a
              href={coinGeckoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 font-mono text-[10px] font-semibold text-gray-200 transition hover:border-cyan-400/30 hover:text-cyan-200"
            >
              CoinGecko ↗
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}