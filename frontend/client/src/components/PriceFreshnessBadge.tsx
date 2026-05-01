import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface PriceFreshnessBadgeMeta {
  source?: string | null;
  is_realtime?: boolean | null;
  is_live_backup?: boolean | null;
  is_stale?: boolean | null;
  staleness_seconds?: number | null;
  quote_timestamp?: string | number | null;
  updated_at?: string | number | null;
}

interface PriceFreshnessBadgeProps {
  meta: PriceFreshnessBadgeMeta;
  className?: string;
  compact?: boolean;
}

interface BadgeStyle {
  label: string;
  dotClass: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  testId: string;
}

function classify(meta: PriceFreshnessBadgeMeta): BadgeStyle | null {
  const source = (meta.source || "").toString().toLowerCase();
  const isRealtime = meta.is_realtime === true;
  const isStale = meta.is_stale === true;

  // Stale takes precedence
  if (isStale || source === "lkg") {
    return {
      label: "Stale",
      dotClass: "bg-amber-400/80",
      textClass: "text-amber-300",
      bgClass: "bg-amber-500/10",
      borderClass: "border-amber-500/30",
      testId: "price-freshness-stale",
    };
  }

  if (source === "tradier" && isRealtime) {
    return {
      label: "Live",
      dotClass: "bg-emerald-400 animate-pulse",
      textClass: "text-emerald-300",
      bgClass: "bg-emerald-500/10",
      borderClass: "border-emerald-500/30",
      testId: "price-freshness-live",
    };
  }

  if (source === "public_fallback" && isRealtime) {
    return {
      label: "Live Backup",
      dotClass: "bg-cyan-400",
      textClass: "text-cyan-300",
      bgClass: "bg-cyan-500/10",
      borderClass: "border-cyan-500/30",
      testId: "price-freshness-live-backup",
    };
  }

  if (source === "public_fallback") {
    return {
      label: "Backup",
      dotClass: "bg-sky-400/70",
      textClass: "text-sky-300",
      bgClass: "bg-sky-500/10",
      borderClass: "border-sky-500/30",
      testId: "price-freshness-backup",
    };
  }

  if (source === "fmp_fallback" || source === "twelvedata_fallback") {
    return {
      label: "Fallback",
      dotClass: "bg-slate-400/70",
      textClass: "text-slate-300",
      bgClass: "bg-slate-500/10",
      borderClass: "border-slate-500/30",
      testId: "price-freshness-fallback",
    };
  }

  return null;
}

function formatTimestamp(ts: string | number | null | undefined): string | null {
  if (ts == null) return null;
  try {
    const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString();
  } catch {
    return null;
  }
}

export function PriceFreshnessBadge({ meta, className, compact = false }: PriceFreshnessBadgeProps) {
  const style = classify(meta);
  if (!style) return null;

  const stalenessLabel =
    typeof meta.staleness_seconds === "number" && meta.staleness_seconds >= 0
      ? `${Math.round(meta.staleness_seconds)}s old`
      : null;
  const tsLabel = formatTimestamp(meta.quote_timestamp ?? meta.updated_at ?? null);

  const badge = (
    <span
      data-testid={style.testId}
      data-price-source={meta.source ?? "unknown"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-[1px] text-[10px] font-medium leading-none",
        style.bgClass,
        style.borderClass,
        style.textClass,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dotClass)} aria-hidden />
      {!compact && <span>{style.label}</span>}
    </span>
  );

  const tooltipParts: string[] = [];
  tooltipParts.push(`Source: ${meta.source ?? "unknown"}`);
  if (meta.is_realtime) tooltipParts.push("Realtime");
  if (meta.is_live_backup) tooltipParts.push("Live backup");
  if (meta.is_stale) tooltipParts.push("Stale");
  if (stalenessLabel) tooltipParts.push(stalenessLabel);
  if (tsLabel) tooltipParts.push(`as of ${tsLabel}`);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltipParts.join(" • ")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default PriceFreshnessBadge;
