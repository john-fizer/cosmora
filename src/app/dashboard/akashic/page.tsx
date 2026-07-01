"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { getActiveProfileId, getProfile, getCachedChart } from "@/lib/storage";
import { toSiderealChart, buildVimshottariDasha, buildCharaKarakas, lahiriAyanamsa } from "@/lib/astrology/sidereal";
import { AKASHIC_ENTRIES } from "@/lib/akashic/entries";
import { getEntryChartContext } from "@/lib/akashic/chart-context";
import type { AkashicEntry, AkashicCategory } from "@/lib/akashic/types";
import type { ChartData } from "@/lib/astrology/types";
import type { SiderealChart, VimshottariData, CharaKarakas } from "@/lib/astrology/sidereal";

const CAT_COLORS: Record<AkashicCategory, string> = {
  foundations: "#C8A55B",
  hellenistic:  "#a78bfa",
  timing:       "#f59e0b",
  vedic:        "#06b6d4",
  esoteric:     "#f472b6",
};
const CAT_LABELS: Record<AkashicCategory, string> = {
  foundations: "Foundations",
  hellenistic:  "Hellenistic",
  timing:       "Timing",
  vedic:        "Vedic",
  esoteric:     "Esoteric",
};
const ALL_CATS: AkashicCategory[] = ["foundations", "hellenistic", "timing", "vedic", "esoteric"];

function EntryCard({ entry, isRelevant, accentColor }: {
  entry: AkashicEntry; isRelevant: boolean; accentColor: string;
}) {
  return (
    <Link href={`/dashboard/akashic/${entry.slug}`} style={{ textDecoration: "none" }}>
      <motion.div
        whileHover={{ borderColor: accentColor + "55", y: -2 }}
        transition={{ duration: 0.15 }}
        style={{
          background: "rgba(10,15,35,0.6)",
          border: `1px solid ${isRelevant ? accentColor + "35" : "rgba(40,60,100,0.3)"}`,
          borderRadius: 12, padding: "14px 16px", cursor: "pointer",
          height: "100%", display: "flex", flexDirection: "column", gap: 8,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ color: "#C0D4FF", fontSize: 14, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.05em", fontWeight: 600 }}>
              {entry.title}
            </div>
            <div style={{ color: "#445577", fontSize: 10, fontFamily: "'Fragment Mono', monospace", marginTop: 2 }}>
              {entry.subtitle}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <span style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30`, borderRadius: 20, padding: "2px 8px", color: accentColor, fontSize: 8, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
              {CAT_LABELS[entry.category]}
            </span>
            {isRelevant && (
              <span style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 20, padding: "2px 8px", color: "#22c55e", fontSize: 8, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
                IN YOUR CHART
              </span>
            )}
          </div>
        </div>
        {/* Summary */}
        <p style={{ color: "#6677AA", fontSize: 11, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", lineHeight: 1.6, margin: 0, flex: 1 }}>
          {entry.summary.slice(0, 120)}…
        </p>
        {/* Tags */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {entry.tags.slice(0, 3).map(t => (
            <span key={t} style={{ color: "#334466", fontSize: 8, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.08em" }}>
              #{t}
            </span>
          ))}
        </div>
      </motion.div>
    </Link>
  );
}

export default function AkashicPage() {
  const [chart, setChart]         = useState<ChartData | null>(null);
  const [sidereal, setSidereal]   = useState<SiderealChart | null>(null);
  const [dasha, setDasha]         = useState<VimshottariData | null>(null);
  const [karakas, setKarakas]     = useState<CharaKarakas | null>(null);
  const [query, setQuery]         = useState("");
  const [activecat, setActivecat] = useState<AkashicCategory | "all">("all");

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) return;
    const profile = getProfile(id);
    const c = getCachedChart(id);
    if (!profile || !c) return;
    const birthDatetime = `${profile.birthDate}T${profile.birthTime}Z`;
    const sc = toSiderealChart(c, birthDatetime);
    const ay = lahiriAyanamsa(new Date(birthDatetime));
    setChart(c);
    setSidereal(sc);
    const moonP = c.planets.find(p => p.name === "Moon");
    if (moonP) {
      const moonSidereal = ((moonP.longitude - sc.ayanamsa) % 360 + 360) % 360;
      setDasha(buildVimshottariDasha(moonSidereal, birthDatetime));
    }
    setKarakas(buildCharaKarakas(c, ay));
  }, []);

  const relevantSlugs = useMemo(() => {
    if (!chart) return new Set<string>();
    return new Set(
      AKASHIC_ENTRIES
        .filter(e => getEntryChartContext(e, chart, sidereal, dasha, karakas).hasRelevance)
        .map(e => e.slug)
    );
  }, [chart, sidereal, dasha, karakas]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return AKASHIC_ENTRIES.filter(e => {
      const catMatch = activecat === "all" || e.category === activecat;
      const textMatch = !q || e.title.toLowerCase().includes(q) || e.tags.some(t => t.includes(q)) || e.summary.toLowerCase().includes(q);
      return catMatch && textMatch;
    });
  }, [query, activecat]);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#010810" }}>
      <DashboardBg />
      <div className="absolute inset-0 overflow-y-auto" style={{ left: 64, scrollbarWidth: "none" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 24px 48px" }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{ width: 6, height: 28, background: "#C8A55B", borderRadius: 3, boxShadow: "0 0 10px #C8A55B" }} />
              <h1 style={{ color: "#C0D4FF", fontSize: 22, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Akashic Records
              </h1>
              <span style={{ background: "rgba(200,165,91,0.12)", border: "1px solid rgba(200,165,91,0.35)", borderRadius: 20, padding: "3px 12px", color: "#C8A55B", fontSize: 9, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em" }}>
                {AKASHIC_ENTRIES.length} ENTRIES
              </span>
            </div>
            <p style={{ color: "#445577", fontSize: 12, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", paddingLeft: 18 }}>
              The cosmic library — every concept explained, every article personalized to your chart
            </p>
          </div>

          {/* Search */}
          <div style={{ marginBottom: 16, position: "relative" }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search concepts, techniques, planets…"
              style={{
                width: "100%", padding: "10px 14px 10px 38px",
                background: "rgba(10,15,35,0.7)", border: "1px solid rgba(40,60,100,0.4)",
                borderRadius: 10, color: "#C0D4FF", fontSize: 12,
                fontFamily: "'Fragment Mono', monospace", outline: "none", boxSizing: "border-box",
              }}
            />
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#334466", fontSize: 14 }}>⊕</span>
          </div>

          {/* Category pills */}
          <div style={{ display: "flex", gap: 6, marginBottom: 22, flexWrap: "wrap" }}>
            <button onClick={() => setActivecat("all")} style={{
              padding: "5px 14px",
              background: activecat === "all" ? "rgba(200,165,91,0.15)" : "transparent",
              border: `1px solid ${activecat === "all" ? "rgba(200,165,91,0.4)" : "rgba(40,60,100,0.3)"}`,
              borderRadius: 20, color: activecat === "all" ? "#C8A55B" : "#445577",
              fontSize: 9, letterSpacing: "0.12em", fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
            }}>ALL</button>
            {ALL_CATS.map(cat => (
              <button key={cat} onClick={() => setActivecat(cat)} style={{
                padding: "5px 14px",
                background: activecat === cat ? `${CAT_COLORS[cat]}15` : "transparent",
                border: `1px solid ${activecat === cat ? CAT_COLORS[cat] + "40" : "rgba(40,60,100,0.3)"}`,
                borderRadius: 20, color: activecat === cat ? CAT_COLORS[cat] : "#445577",
                fontSize: 9, letterSpacing: "0.12em", fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
              }}>
                {CAT_LABELS[cat].toUpperCase()} · {AKASHIC_ENTRIES.filter(e => e.category === cat).length}
              </button>
            ))}
          </div>

          {/* Entry count */}
          <p style={{ color: "#334466", fontSize: 9, fontFamily: "'Fragment Mono', monospace", marginBottom: 14, letterSpacing: "0.1em" }}>
            {filtered.length} ENTRIES{query ? ` FOR "${query.toUpperCase()}"` : ""}
            {chart ? ` · ${relevantSlugs.size} IN YOUR CHART` : ""}
          </p>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {filtered.map((e, i) => (
              <motion.div key={e.slug} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.4) }}>
                <EntryCard entry={e} isRelevant={relevantSlugs.has(e.slug)} accentColor={CAT_COLORS[e.category]} />
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#334466", fontFamily: "'Fragment Mono', monospace", fontSize: 11 }}>
              No entries match &ldquo;{query}&rdquo;
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
