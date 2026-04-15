import { useState, useRef, useEffect } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import type { PlaybookSummary, StrategyOption } from "@/types/playbook";

interface StrategySelectorProps {
  playbooks: PlaybookSummary[];
  selectedId: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

const DEFAULT_OPTION: StrategyOption = {
  id: "default",
  label: "Default",
  description: "Standard behavior, no playbook applied",
};

function colorDot(color?: string) {
  if (!color) return null;
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

export default function StrategySelector({
  playbooks,
  selectedId,
  onChange,
  disabled = false,
  compact = false,
}: StrategySelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const options: StrategyOption[] = [
    DEFAULT_OPTION,
    ...playbooks.map((p) => ({
      id: p.id,
      label: p.short_label || p.name,
      color: p.ui_color,
      description: p.description,
    })),
  ];

  const selected = options.find((o) => o.id === selectedId) || DEFAULT_OPTION;
  const isActive = selectedId !== "default";

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: compact ? "3px 9px" : "5px 12px",
          borderRadius: 8,
          fontSize: compact ? 11 : 12,
          fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
          background: isActive
            ? `rgba(99,102,241,0.15)`
            : "rgba(255,255,255,0.04)",
          color: isActive ? "#a5b4fc" : "#9ca3af",
          border: isActive
            ? "1px solid rgba(99,102,241,0.4)"
            : "1px solid rgba(255,255,255,0.08)",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.15s",
          whiteSpace: "nowrap",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {isActive && <Sparkles size={10} style={{ flexShrink: 0 }} />}
        {isActive && selected.color && colorDot(selected.color)}
        <span>
          {isActive ? selected.label : "Strategy"}
        </span>
        <ChevronDown
          size={10}
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: 240,
            background: "rgba(12,13,20,0.98)",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "8px 12px 6px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "#6b7280",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Select Strategy Playbook
            </div>
          </div>
          {options.map((opt) => {
            const isSel = opt.id === selectedId;
            return (
              <div
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                  background: isSel
                    ? "rgba(99,102,241,0.1)"
                    : "transparent",
                  borderLeft: isSel
                    ? "2px solid #6366f1"
                    : "2px solid transparent",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  !isSel &&
                  ((e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.03)")
                }
                onMouseLeave={(e) =>
                  !isSel &&
                  ((e.currentTarget as HTMLElement).style.background =
                    "transparent")
                }
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: isSel
                      ? "2px solid #6366f1"
                      : "2px solid #4b5563",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 1,
                    flexShrink: 0,
                  }}
                >
                  {isSel && (
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "#6366f1",
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 2,
                    }}
                  >
                    {opt.color && colorDot(opt.color)}
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: isSel ? "#e0e0e0" : "#d1d5db",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {opt.label}
                    </span>
                  </div>
                  {opt.description && (
                    <div
                      style={{
                        fontSize: 9,
                        color: "#6b7280",
                        lineHeight: 1.4,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {opt.description.length > 80
                        ? opt.description.slice(0, 80) + "…"
                        : opt.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
