"use client";

import { motion } from "framer-motion";
import { SYNTHESIS_SOURCE_META } from "@/lib/reports/types";
import type { SynthesisSource } from "@/lib/reports/types";

const ALL_SOURCES = Object.keys(SYNTHESIS_SOURCE_META) as SynthesisSource[];

export function SynthesisSourcePicker({
  selected, onChange,
}: {
  selected: Set<SynthesisSource>;
  onChange: (next: Set<SynthesisSource>) => void;
}) {
  const toggle = (s: SynthesisSource) => {
    const next = new Set(selected);
    if (next.has(s)) next.delete(s); else next.add(s);
    onChange(next);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_SOURCES.map(s => {
        const meta = SYNTHESIS_SOURCE_META[s];
        const active = selected.has(s);
        return (
          <motion.button
            key={s}
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => toggle(s)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-left cursor-pointer transition-colors"
            style={{
              background: active ? "rgba(156,138,196,0.15)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${active ? "rgba(156,138,196,0.4)" : "rgba(255,255,255,0.07)"}`,
            }}
          >
            <span
              className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold"
              style={{
                background: active ? "#9C8AC4" : "transparent",
                border: `1px solid ${active ? "#9C8AC4" : "rgba(255,255,255,0.2)"}`,
                color: "#0a0a14",
              }}
            >
              {active ? "✓" : ""}
            </span>
            <span className="text-[13px] font-bold" style={{ color: active ? "#D4CEBD" : "#64748b" }}>
              {meta.label}
            </span>
            <span className="text-[12px]" style={{ color: "#475569" }}>{meta.description}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
