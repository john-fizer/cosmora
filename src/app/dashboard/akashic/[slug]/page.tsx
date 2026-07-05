"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { getActiveProfileId, getProfile, getCachedChart, getOraclePersona } from "@/lib/storage";
import { toSiderealChart, buildVimshottariDasha, buildCharaKarakas, lahiriAyanamsa } from "@/lib/astrology/sidereal";
import { ENTRIES_BY_SLUG } from "@/lib/akashic/entries";
import { getEntryChartContext } from "@/lib/akashic/chart-context";
import type { AkashicEntry, AkashicCategory, EntryChartContext } from "@/lib/akashic/types";
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

function cacheKey(slug: string) { return `cosmora_akashic_${slug}`; }

export default function AkashicArticlePage() {
  const params   = useParams<{ slug: string }>();
  const slug     = params?.slug ?? "";
  const entry    = ENTRIES_BY_SLUG[slug] as AkashicEntry | undefined;

  const [chart, setChart]         = useState<ChartData | null>(null);
  const [sidereal, setSidereal]   = useState<SiderealChart | null>(null);
  const [dasha, setDasha]         = useState<VimshottariData | null>(null);
  const [karakas, setKarakas]     = useState<CharaKarakas | null>(null);
  const [context, setContext]     = useState<EntryChartContext | null>(null);
  const [body, setBody]           = useState("");
  const [generating, setGenerating] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  // Load chart
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

  // Compute context once chart is loaded
  useEffect(() => {
    if (!entry || !chart) return;
    setContext(getEntryChartContext(entry, chart, sidereal, dasha, karakas));
  }, [entry, chart, sidereal, dasha, karakas]);

  // Generate or load cached body
  useEffect(() => {
    if (!entry) return;
    const cached = typeof window !== "undefined" ? localStorage.getItem(cacheKey(slug)) : null;
    if (cached) { setBody(cached); return; }

    const generate = async () => {
      setGenerating(true);
      const message = `Write a 300-word educational article about "${entry.title}" for the Akashic Records — a Cosmora astrology learning library. ${entry.promptHint} Write in second person where helpful ("when you have X..." or "if your Y is in Z..."). No headers or bullet points. Flowing prose only. End with one short, memorable, poetic sentence.`;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, history: [], persona: getOraclePersona() }),
        });
        if (!res.ok || !res.body) { setGenerating(false); return; }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "", acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n"); buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") break;
            try { const p = JSON.parse(payload); if (p.text) { acc += p.text; setBody(acc); } } catch { /* skip */ }
          }
        }
        if (acc) localStorage.setItem(cacheKey(slug), acc);
      } catch { /* silent */ }
      setGenerating(false);
    };
    generate();
  }, [entry, slug, reloadNonce]);

  if (!entry) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <div className="text-center ml-16">
          <p style={{ color: "#C8A55B", fontSize: 13, fontFamily: "'Fragment Mono', monospace" }}>ENTRY NOT FOUND</p>
          <Link href="/dashboard/akashic" style={{ color: "#445577", fontSize: 11, fontFamily: "'Fragment Mono', monospace" }}>← Back to Library</Link>
        </div>
      </div>
    );
  }

  const accentColor = CAT_COLORS[entry.category];
  const oracleQ = context?.hasRelevance
    ? `Tell me more about ${entry.title} in my chart. ${context.headline}`
    : `Explain ${entry.title} and how it might show up in someone's chart.`;

  const related = entry.relatedSlugs.map(s => ENTRIES_BY_SLUG[s]).filter(Boolean);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#010810" }}>
      <DashboardBg />
      <div className="absolute inset-0 overflow-y-auto" style={{ left: 64, scrollbarWidth: "none" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 24px 48px" }}>

          {/* Back */}
          <Link href="/dashboard/akashic" style={{ textDecoration: "none" }}>
            <button style={{ color: "#445577", fontSize: 9, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.12em", background: "none", border: "none", cursor: "pointer", marginBottom: 20, padding: 0 }}>
              ← AKASHIC RECORDS
            </button>
          </Link>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30`, borderRadius: 20, padding: "3px 10px", color: accentColor, fontSize: 8, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.12em" }}>
                {CAT_LABELS[entry.category].toUpperCase()}
              </span>
              {entry.tags.slice(0, 3).map(t => (
                <span key={t} style={{ color: "#334466", fontSize: 8, fontFamily: "'Fragment Mono', monospace" }}>#{t}</span>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
              <div style={{ width: 4, height: 32, background: accentColor, borderRadius: 2, flexShrink: 0, marginTop: 4 }} />
              <h1 style={{ color: "#C0D4FF", fontSize: 28, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, margin: 0 }}>{entry.title}</h1>
            </div>
            <p style={{ color: "#445577", fontSize: 11, fontFamily: "'Fragment Mono', monospace", paddingLeft: 16, marginBottom: 12 }}>{entry.subtitle}</p>
            <p style={{ color: "#8899BB", fontSize: 14, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", lineHeight: 1.7, paddingLeft: 16 }}>{entry.summary}</p>
          </div>

          {/* In Your Chart */}
          {context?.hasRelevance && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: `${accentColor}0C`, border: `1px solid ${accentColor}30`, borderRadius: 12, padding: "14px 16px", marginBottom: 24 }}>
              <p style={{ color: accentColor, fontSize: 8, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>IN YOUR CHART</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {context.placements.map((pl, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: accentColor, flexShrink: 0 }} />
                    <span style={{ color: "#C0D4FF", fontSize: 12, fontFamily: "'Fragment Mono', monospace" }}>{pl.label}:</span>
                    <span style={{ color: "#8899BB", fontSize: 12, fontFamily: "'Fragment Mono', monospace" }}>{pl.detail}</span>
                    {pl.extra && <span style={{ color: "#445577", fontSize: 10, fontFamily: "'Fragment Mono', monospace" }}>{pl.extra}</span>}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(40,60,100,0.5), transparent)", marginBottom: 24 }} />

          {/* AI-generated body */}
          <div style={{ marginBottom: 28, minHeight: 120 }}>
            {body ? (
              <p style={{ color: "#A0B8D8", fontSize: 15, fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
                {body}
                {generating && (
                  <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.7, repeat: Infinity }}
                    style={{ display: "inline-block", width: 6, height: 13, background: accentColor, borderRadius: 1, marginLeft: 3, verticalAlign: "middle" }} />
                )}
              </p>
            ) : generating ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  style={{ width: 16, height: 16, border: `1.5px solid ${accentColor}`, borderTopColor: "transparent", borderRadius: "50%" }} />
                <span style={{ color: "#334466", fontSize: 10, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.1em" }}>
                  READING THE AKASHIC FIELD…
                </span>
              </div>
            ) : null}
          </div>

          {/* Regenerate button */}
          {body && !generating && (
            <button
              onClick={() => {
                if (typeof window !== "undefined") localStorage.removeItem(cacheKey(slug));
                setBody("");
                setReloadNonce(n => n + 1);
              }}
              style={{ color: "#334466", fontSize: 8, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.1em", background: "none", border: "none", cursor: "pointer", marginBottom: 24, padding: 0 }}>
              ↻ REGENERATE
            </button>
          )}

          {/* Ask Oracle */}
          <Link href={`/dashboard/oracle?q=${encodeURIComponent(oracleQ)}`} style={{ textDecoration: "none" }}>
            <motion.div whileHover={{ borderColor: accentColor + "55" }} style={{
              background: `${accentColor}08`, border: `1px solid ${accentColor}25`,
              borderRadius: 12, padding: "14px 18px", marginBottom: 28,
              display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
            }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, #7B6FD4, #06b6d4)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>✦</div>
              <div>
                <p style={{ color: accentColor, fontSize: 9, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em", marginBottom: 3 }}>ASK THE ORACLE</p>
                <p style={{ color: "#6677AA", fontSize: 12, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
                  {context?.hasRelevance ? context.headline : `Explore ${entry.title} in conversation`}
                </p>
              </div>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14, color: "#334466", marginLeft: "auto", flexShrink: 0 }}>
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          </Link>

          {/* Related entries */}
          {related.length > 0 && (
            <div>
              <p style={{ color: "#334466", fontSize: 8, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 12 }}>RELATED ENTRIES</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {related.map(rel => (
                  <Link key={rel.slug} href={`/dashboard/akashic/${rel.slug}`} style={{ textDecoration: "none" }}>
                    <motion.div whileHover={{ borderColor: "rgba(70,100,180,0.4)", x: 2 }} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                      background: "rgba(10,15,35,0.5)", border: "1px solid rgba(40,60,100,0.25)", borderRadius: 9, cursor: "pointer",
                    }}>
                      <div>
                        <span style={{ color: "#C0D4FF", fontSize: 12, fontFamily: "'Fragment Mono', monospace" }}>{rel.title}</span>
                        <span style={{ color: "#334466", fontSize: 10, fontFamily: "'Fragment Mono', monospace", marginLeft: 8 }}>{rel.subtitle}</span>
                      </div>
                      <span style={{ color: "#334466", fontSize: 10, fontFamily: "'Fragment Mono', monospace", marginLeft: "auto", flexShrink: 0 }}>
                        {CAT_LABELS[rel.category]}
                      </span>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
