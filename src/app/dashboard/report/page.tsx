"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { PLANET_SYMBOLS, SIGN_SYMBOLS } from "@/lib/astrology/types";
import type { ChartData, PlanetName } from "@/lib/astrology/types";
import { getActiveProfileId, getProfile, getCachedChart } from "@/lib/storage";

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionStatus = "pending" | "streaming" | "done" | "error";

interface ReportSection {
  id: string;
  label: string;
  subtitle: string;
  color: string;
  glyph: string;
  content: string;
  status: SectionStatus;
}

interface SectionDef {
  id: string;
  label: string;
  subtitle: string;
  color: string;
  glyph: string;
  prompt: string;
}

// ─── Section builder ──────────────────────────────────────────────────────────

function buildSectionDefs(chart: ChartData): SectionDef[] {
  const p = (name: PlanetName) => chart.planets.find(pl => pl.name === name);
  const sun = p("Sun");
  const moon = p("Moon");
  const merc = p("Mercury");
  const venus = p("Venus");
  const mars = p("Mars");
  const jup = p("Jupiter");
  const sat = p("Saturn");
  const ura = p("Uranus");
  const nep = p("Neptune");
  const plu = p("Pluto");
  const asc = chart.houses[0];

  const BASE = `You are Cosmora, a 2070 cosmic intelligence system writing a natal chart report. Style: poetic yet precise, psychologically insightful, no clichés. Write flowing prose paragraphs only — no bullet points, no sub-headings, no labels. Total length: 220–260 words. End with one practical sentence of guidance.`;

  return [
    {
      id: "identity",
      label: "COSMIC IDENTITY",
      subtitle: "Sun & Ascendant",
      color: "#fbbf24",
      glyph: "☉",
      prompt: `${BASE}\n\nSection: COSMIC IDENTITY. Sun in ${sun?.sign} (${sun?.signDegree?.toFixed(1)}°, House ${sun?.house}${sun?.dignity ? `, ${sun.dignity}` : ""}${sun?.retrograde ? ", Rx" : ""}), Ascendant in ${asc?.sign}. This is a ${chart.sect} chart. Describe the core life force, how the identity projects into the world, and the interplay between the essential self and the outer mask.`,
    },
    {
      id: "emotion",
      label: "EMOTIONAL ARCHITECTURE",
      subtitle: "Moon",
      color: "#BFB6E8",
      glyph: "☽",
      prompt: `${BASE}\n\nSection: EMOTIONAL ARCHITECTURE. Moon in ${moon?.sign} (House ${moon?.house}${moon?.dignity ? `, ${moon.dignity}` : ""}${moon?.retrograde ? ", Rx" : ""}). Describe the emotional world — instinctive responses, what nourishes and destabilizes this person, their relationship to memory and early home, and what they need to feel safe.`,
    },
    {
      id: "mind",
      label: "MENTAL MATRIX",
      subtitle: "Mercury",
      color: "#a78bfa",
      glyph: "☿",
      prompt: `${BASE}\n\nSection: MENTAL MATRIX. Mercury in ${merc?.sign} (House ${merc?.house}${merc?.dignity ? `, ${merc.dignity}` : ""}${merc?.retrograde ? ", Rx" : ""}). Describe how this mind processes and transmits information — its learning style, communication pattern, decision-making architecture, and intellectual signature.`,
    },
    {
      id: "love",
      label: "RELATIONAL GRAVITY",
      subtitle: "Venus",
      color: "#f472b6",
      glyph: "♀",
      prompt: `${BASE}\n\nSection: RELATIONAL GRAVITY. Venus in ${venus?.sign} (House ${venus?.house}${venus?.dignity ? `, ${venus.dignity}` : ""}). Describe the aesthetic sensibility, what this person attracts and is drawn toward, how they love, their pleasure principle, and the kind of beauty they create and seek in relationships.`,
    },
    {
      id: "drive",
      label: "WARRIOR CODE",
      subtitle: "Mars",
      color: "#ef4444",
      glyph: "♂",
      prompt: `${BASE}\n\nSection: WARRIOR CODE. Mars in ${mars?.sign} (House ${mars?.house}${mars?.dignity ? `, ${mars.dignity}` : ""}${mars?.retrograde ? ", Rx" : ""}). Describe how this person acts and pursues desire — their competitive nature, how anger moves through them, their energetic signature, and what fires their ambition.`,
    },
    {
      id: "expansion",
      label: "EXPANSION FIELD",
      subtitle: "Jupiter",
      color: "#f59e0b",
      glyph: "♃",
      prompt: `${BASE}\n\nSection: EXPANSION FIELD. Jupiter in ${jup?.sign} (House ${jup?.house}${jup?.dignity ? `, ${jup.dignity}` : ""}). Describe where natural abundance flows, the philosophical or spiritual lens through which this person grows, and the life territory where fortune tends to compound over time.`,
    },
    {
      id: "karma",
      label: "KARMIC ARCHITECTURE",
      subtitle: "Saturn",
      color: "#94a3b8",
      glyph: "♄",
      prompt: `${BASE}\n\nSection: KARMIC ARCHITECTURE. Saturn in ${sat?.sign} (House ${sat?.house}${sat?.dignity ? `, ${sat.dignity}` : ""}${sat?.retrograde ? ", Rx" : ""}). Describe the structural challenge this life is asked to master — the relationship with authority, limitation, and discipline, and how consistent effort in this domain forges long-term mastery.`,
    },
    {
      id: "outer",
      label: "OUTER PLANET SIGNATURE",
      subtitle: "Uranus · Neptune · Pluto",
      color: "#06b6d4",
      glyph: "✦",
      prompt: `${BASE}\n\nSection: OUTER PLANET SIGNATURE. Uranus in ${ura?.sign} (House ${ura?.house}), Neptune in ${nep?.sign} (House ${nep?.house}), Pluto in ${plu?.sign} (House ${plu?.house}). Describe the generational imprint and how these slow-moving planets' house placements activate specific life zones — where revolution, dissolution, and transformation are quietly reshaping the foundation.`,
    },
  ];
}

// ─── Stream a single section from /api/chat ───────────────────────────────────

async function streamSection(
  idx: number,
  prompt: string,
  chart: ChartData,
  setSections: React.Dispatch<React.SetStateAction<ReportSection[]>>
): Promise<void> {
  setSections(prev =>
    prev.map((s, i) => i === idx ? { ...s, status: "streaming" } : s)
  );

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, chart }),
    });

    if (!res.body) throw new Error("No stream");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      for (const line of text.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6);
        if (payload === "[DONE]") {
          setSections(prev =>
            prev.map((s, i) => i === idx ? { ...s, status: "done", content: accumulated } : s)
          );
          return;
        }
        try {
          const j = JSON.parse(payload);
          if (j.text) {
            accumulated += j.text;
            setSections(prev =>
              prev.map((s, i) => i === idx ? { ...s, content: accumulated } : s)
            );
          }
        } catch { /* ignore parse errors */ }
      }
    }

    setSections(prev =>
      prev.map((s, i) => i === idx ? { ...s, status: "done" } : s)
    );
  } catch (e) {
    setSections(prev =>
      prev.map((s, i) => i === idx ? { ...s, status: "error", content: `Signal lost: ${String(e)}` } : s)
    );
  }
}

// ─── Status indicator ─────────────────────────────────────────────────────────

function StatusDot({ status, color }: { status: SectionStatus; color: string }) {
  if (status === "done") {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-4 h-4 rounded-full flex items-center justify-center"
        style={{ background: `${color}22`, border: `1px solid ${color}` }}
      >
        <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
          <path d="M2 6l3 3 5-5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
    );
  }
  if (status === "streaming") {
    return (
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="w-4 h-4 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
    );
  }
  return (
    <div className="w-4 h-4 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
  );
}

// ─── Report section block ─────────────────────────────────────────────────────

function SectionBlock({
  section,
  idx,
  isCurrent,
}: {
  section: ReportSection;
  idx: number;
  isCurrent: boolean;
}) {
  return (
    <motion.div
      id={`report-section-${section.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: idx * 0.05 }}
      className="relative"
    >
      {/* Section header */}
      <div
        className="relative flex items-center gap-5 py-6 mb-5 overflow-hidden"
        style={{
          borderBottom: `1px solid ${section.color}22`,
        }}
      >
        {/* Streaming scan line */}
        {isCurrent && section.status === "streaming" && (
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(90deg, transparent, ${section.color}18, transparent)`,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Glyph */}
        <div
          className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
          style={{
            background: `${section.color}0F`,
            border: `1px solid ${section.color}30`,
            color: section.color,
            boxShadow: isCurrent && section.status === "streaming"
              ? `0 0 24px ${section.color}30`
              : "none",
            transition: "box-shadow 0.5s",
          }}
        >
          {section.glyph}
        </div>

        {/* Labels */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[14px] font-black tracking-[0.25em] mb-0.5"
            style={{ color: section.color }}
          >
            {section.label}
          </p>
          <p className="text-[14px] font-light" style={{ color: "rgba(100,116,139,0.8)" }}>
            {section.subtitle}
          </p>
        </div>

        {/* Status */}
        <div className="flex-shrink-0">
          {section.status === "streaming" && (
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="text-[13px] font-bold tracking-widest"
              style={{ color: section.color }}
            >
              GENERATING
            </motion.span>
          )}
          {section.status === "done" && (
            <span className="text-[13px] font-bold tracking-widest" style={{ color: "#334155" }}>
              COMPLETE
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pb-10">
        {section.content ? (
          <motion.p
            className="text-[17px] leading-[1.9] whitespace-pre-wrap"
            style={{ color: "#94a3b8" }}
          >
            {section.content}
            {section.status === "streaming" && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.65, repeat: Infinity }}
                className="inline-block ml-0.5 w-0.5 h-3.5 align-middle rounded-full"
                style={{ background: section.color }}
              />
            )}
          </motion.p>
        ) : section.status === "pending" ? (
          <div className="flex items-center gap-2 py-4">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
            <span className="text-[14px] tracking-widest" style={{ color: "#1e293b" }}>AWAITING SIGNAL</span>
          </div>
        ) : section.status === "streaming" ? (
          <div className="flex items-center gap-2 py-4">
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: section.color }}
            />
            <span className="text-[14px] tracking-widest" style={{ color: section.color }}>INITIALIZING</span>
          </div>
        ) : null}
      </div>

      {/* Bottom separator line */}
      {section.status === "done" && (
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${section.color}20, transparent)` }}
        />
      )}
    </motion.div>
  );
}

// ─── Landing / pre-generation state ──────────────────────────────────────────

function ReportLanding({
  chart,
  profileName,
  onGenerate,
}: {
  chart: ChartData | null;
  profileName: string;
  onGenerate: () => void;
}) {
  const sun = chart?.planets.find(p => p.name === "Sun");
  const moon = chart?.planets.find(p => p.name === "Moon");
  const asc = chart?.houses[0];

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-10 px-8 py-12 text-center">
      {/* Cosmic icon */}
      <motion.div
        animate={{
          boxShadow: [
            "0 0 40px rgba(168,85,247,0.3), 0 0 80px rgba(168,85,247,0.1)",
            "0 0 60px rgba(6,182,212,0.35), 0 0 100px rgba(6,182,212,0.12)",
            "0 0 40px rgba(168,85,247,0.3), 0 0 80px rgba(168,85,247,0.1)",
          ],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="w-24 h-24 rounded-3xl flex items-center justify-center text-4xl"
        style={{
          background: "linear-gradient(135deg, rgba(123,111,212,0.2), rgba(6,182,212,0.2))",
          border: "1px solid rgba(168,85,247,0.3)",
        }}
      >
        ✦
      </motion.div>

      {/* Title */}
      <div className="space-y-3">
        <h1 className="text-3xl font-light tracking-wide" style={{ color: "#e2e8f0" }}>
          {profileName ? `${profileName}'s Natal Report` : "Your Natal Report"}
        </h1>
        <p className="text-[16px] max-w-md leading-relaxed" style={{ color: "#475569" }}>
          An 8-chapter AI interpretation of your birth chart — streaming one section at a time, from cosmic identity to outer planet signature.
        </p>
      </div>

      {/* Chart summary pills */}
      {chart && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {[
            { label: "SUN", value: `${sun?.sign}`, color: "#fbbf24", glyph: "☉" },
            { label: "MOON", value: `${moon?.sign}`, color: "#BFB6E8", glyph: "☽" },
            { label: "RISING", value: `${asc?.sign}`, color: "#06b6d4", glyph: "ASC" },
          ].map(item => (
            <div
              key={item.label}
              className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{
                background: `${item.color}0D`,
                border: `1px solid ${item.color}25`,
              }}
            >
              <span className="text-[13px]" style={{ color: item.color }}>{item.glyph}</span>
              <div>
                <p className="text-[13px] font-bold tracking-widest" style={{ color: "#334155" }}>{item.label}</p>
                <p className="text-[13px] font-medium" style={{ color: item.color }}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sections preview */}
      <div className="grid grid-cols-2 gap-2 max-w-sm w-full">
        {[
          { label: "Cosmic Identity", color: "#fbbf24" },
          { label: "Emotional Architecture", color: "#BFB6E8" },
          { label: "Mental Matrix", color: "#a78bfa" },
          { label: "Relational Gravity", color: "#f472b6" },
          { label: "Warrior Code", color: "#ef4444" },
          { label: "Expansion Field", color: "#f59e0b" },
          { label: "Karmic Architecture", color: "#94a3b8" },
          { label: "Outer Planet Signature", color: "#06b6d4" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[14px]" style={{ color: "#334155" }}>{s.label}</span>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      {!chart ? (
        <p className="text-[14px]" style={{ color: "#334155" }}>
          Complete your birth data in{" "}
          <Link href="/dashboard/settings" className="underline" style={{ color: "#a78bfa" }}>
            Settings
          </Link>{" "}
          to generate your report.
        </p>
      ) : (
        <motion.button
          whileHover={{ scale: 1.04, boxShadow: "0 0 40px rgba(168,85,247,0.35)" }}
          whileTap={{ scale: 0.97 }}
          onClick={onGenerate}
          className="px-10 py-4 rounded-2xl text-[14px] font-bold tracking-widest cursor-pointer"
          style={{
            background: "linear-gradient(135deg, rgba(123,111,212,0.3), rgba(6,182,212,0.3))",
            border: "1px solid rgba(168,85,247,0.4)",
            color: "#BFB6E8",
            boxShadow: "0 0 30px rgba(123,111,212,0.15)",
          }}
        >
          ✦ GENERATE NATAL REPORT
        </motion.button>
      )}

      <p className="text-[13px] tracking-widest" style={{ color: "#1e293b" }}>
        8 SECTIONS · AI-GENERATED · STREAMS LIVE
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const [chart, setChart] = useState<ChartData | null>(null);
  const [profileName, setProfileName] = useState("");
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [generating, setGenerating] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [complete, setComplete] = useState(false);
  const [copied, setCopied] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) return;
    const profile = getProfile(id);
    if (profile) setProfileName(profile.name);
    const cached = getCachedChart(id);
    if (cached) setChart(cached);
  }, []);

  const generateReport = async () => {
    if (!chart || generating) return;
    setGenerating(true);
    setComplete(false);
    setCurrentIdx(-1);

    const defs = buildSectionDefs(chart);
    const initial: ReportSection[] = defs.map(def => ({
      id: def.id,
      label: def.label,
      subtitle: def.subtitle,
      color: def.color,
      glyph: def.glyph,
      content: "",
      status: "pending" as SectionStatus,
    }));
    setSections(initial);

    // Scroll doc area to top
    docRef.current?.scrollTo({ top: 0, behavior: "smooth" });

    for (let i = 0; i < defs.length; i++) {
      setCurrentIdx(i);

      // Scroll to the section after a short delay
      setTimeout(() => {
        document.getElementById(`report-section-${defs[i].id}`)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);

      await streamSection(i, defs[i].prompt, chart, setSections);
    }

    setCurrentIdx(-1);
    setGenerating(false);
    setComplete(true);
  };

  const copyReport = () => {
    const text = [
      profileName ? `${profileName} — Natal Chart Report` : "Natal Chart Report",
      `Generated by Cosmora · ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
      "",
      ...sections.map(s =>
        `${s.label}\n${"─".repeat(48)}\n${s.content}`
      ),
    ].join("\n\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const progressPct = sections.length
    ? Math.round((sections.filter(s => s.status === "done").length / sections.length) * 100)
    : 0;

  const showLanding = sections.length === 0 && !generating;

  return (
    <div className="h-screen flex overflow-hidden">
      <DashboardBg />

      <div className="flex-1 flex flex-col min-h-0 min-w-0 md:ml-[68px] mb-[60px] md:mb-0 relative z-10">

        {/* ── Header ── */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-shrink-0 flex items-center justify-between px-6 py-3"
          style={{
            borderBottom: "1px solid rgba(168,85,247,0.15)",
            background: "rgba(3,4,10,0.85)",
            backdropFilter: "blur(24px)",
          }}
        >
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <motion.button
                whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 text-[13px] font-medium cursor-pointer"
                style={{ color: "#64748b" }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
                Dashboard
              </motion.button>
            </Link>
            <span style={{ color: "#1e293b" }}>/</span>
            <span className="text-[13px] font-bold tracking-widest gradient-text">NATAL REPORT</span>
          </div>

          {/* Progress + actions */}
          <div className="flex items-center gap-3">
            {generating && (
              <div className="flex items-center gap-2">
                <div className="relative w-20 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.4 }}
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #7B6FD4, #06b6d4)" }}
                  />
                </div>
                <span className="text-[13px] font-bold tracking-widest" style={{ color: "#475569" }}>
                  {progressPct}%
                </span>
              </div>
            )}
            {complete && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={copyReport}
                className="flex items-center gap-1.5 text-[13px] font-bold tracking-widest px-3 py-1.5 rounded-lg cursor-pointer"
                style={{
                  background: copied ? "rgba(34,197,94,0.12)" : "rgba(168,85,247,0.12)",
                  border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(168,85,247,0.25)"}`,
                  color: copied ? "#4ade80" : "#BFB6E8",
                }}
              >
                {copied ? (
                  <>
                    <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3">
                      <path d="M2.5 8l4 4 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    COPIED
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-3 h-3">
                      <rect x="1" y="4" width="10" height="11" rx="1.5" />
                      <path d="M4 4V2.5A1.5 1.5 0 015.5 1h9A1.5 1.5 0 0116 2.5v9A1.5 1.5 0 0114.5 13H13" />
                    </svg>
                    COPY REPORT
                  </>
                )}
              </motion.button>
            )}
            {complete && !generating && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={generateReport}
                className="text-[13px] font-bold tracking-widest px-3 py-1.5 rounded-lg cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "#475569",
                }}
              >
                REGENERATE
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* ── Body ── */}
        <div className="flex-1 flex min-h-0 overflow-hidden">

          {/* ── Left TOC sidebar (desktop) ── */}
          {sections.length > 0 && (
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="hidden md:flex flex-col flex-shrink-0 py-6 overflow-y-auto gap-1"
              style={{
                width: 220,
                borderRight: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(3,4,10,0.6)",
                scrollbarWidth: "none",
              }}
            >
              <p className="text-[13px] font-bold tracking-[0.2em] px-5 mb-3" style={{ color: "#1e293b" }}>
                SECTIONS
              </p>
              {sections.map((s, i) => (
                <motion.button
                  key={s.id}
                  onClick={() => {
                    document.getElementById(`report-section-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  whileHover={{ x: 3 }}
                  className="flex items-center gap-3 px-5 py-2 text-left cursor-pointer w-full"
                  style={{
                    background: currentIdx === i ? `${s.color}0A` : "transparent",
                  }}
                >
                  <StatusDot status={s.status} color={s.color} />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] font-bold tracking-wider truncate"
                      style={{ color: s.status === "pending" ? "#1e293b" : s.color }}
                    >
                      {s.label}
                    </p>
                    <p className="text-[13px] truncate" style={{ color: "#334155" }}>
                      {s.subtitle}
                    </p>
                  </div>
                </motion.button>
              ))}

              {complete && (
                <div className="mt-4 mx-4">
                  <div className="w-full h-px mb-4" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={copyReport}
                    className="w-full text-[13px] font-bold tracking-widest py-2 rounded-xl cursor-pointer"
                    style={{
                      background: "rgba(168,85,247,0.1)",
                      border: "1px solid rgba(168,85,247,0.2)",
                      color: "#BFB6E8",
                    }}
                  >
                    {copied ? "✓ COPIED" : "COPY REPORT"}
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Document area ── */}
          <div
            ref={docRef}
            className="flex-1 overflow-y-auto"
            style={{ scrollbarWidth: "thin" }}
          >
            <AnimatePresence mode="wait">
              {showLanding ? (
                <motion.div
                  key="landing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <ReportLanding
                    chart={chart}
                    profileName={profileName}
                    onGenerate={generateReport}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="report"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="max-w-3xl mx-auto px-8 md:px-16 py-12"
                >
                  {/* Report title */}
                  <div className="mb-12 pb-8" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[13px] font-bold tracking-[0.3em] mb-3"
                      style={{ color: "#334155" }}
                    >
                      COSMORA NATAL REPORT
                    </motion.p>
                    <motion.h1
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-2xl font-light mb-1"
                      style={{ color: "#e2e8f0" }}
                    >
                      {profileName || "Natal Report"}
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="text-[13px]"
                      style={{ color: "#334155" }}
                    >
                      {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      {chart && ` · ${chart.sect} Chart · ${chart.houseSystem} Houses`}
                    </motion.p>
                  </div>

                  {/* Section blocks */}
                  <div className="space-y-2">
                    {sections.map((s, i) => (
                      <SectionBlock
                        key={s.id}
                        section={s}
                        idx={i}
                        isCurrent={currentIdx === i}
                      />
                    ))}
                  </div>

                  {/* Complete footer */}
                  {complete && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="mt-16 pt-8 text-center"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl mb-6"
                        style={{
                          background: "rgba(34,197,94,0.06)",
                          border: "1px solid rgba(34,197,94,0.15)",
                        }}
                      >
                        <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3">
                          <path d="M2.5 8l4 4 7-7" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[13px] font-bold tracking-widest" style={{ color: "#4ade80" }}>
                          REPORT COMPLETE
                        </span>
                      </div>
                      <p className="text-[14px] leading-relaxed max-w-md mx-auto mb-6" style={{ color: "#334155" }}>
                        This report is an AI-generated symbolic interpretation. Always verify insights with a professional astrologer.
                      </p>
                      <div className="flex items-center justify-center gap-3 flex-wrap">
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={copyReport}
                          className="px-5 py-2.5 rounded-xl text-[13px] font-bold tracking-wider cursor-pointer"
                          style={{
                            background: "rgba(168,85,247,0.12)",
                            border: "1px solid rgba(168,85,247,0.25)",
                            color: "#BFB6E8",
                          }}
                        >
                          {copied ? "✓ Copied" : "Copy Report"}
                        </motion.button>
                        <Link href="/dashboard/oracle">
                          <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            className="px-5 py-2.5 rounded-xl text-[13px] font-bold tracking-wider cursor-pointer"
                            style={{
                              background: "rgba(6,182,212,0.08)",
                              border: "1px solid rgba(6,182,212,0.2)",
                              color: "#67e8f9",
                            }}
                          >
                            Ask the Oracle →
                          </motion.button>
                        </Link>
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={generateReport}
                          className="px-5 py-2.5 rounded-xl text-[13px] font-bold tracking-wider cursor-pointer"
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            color: "#475569",
                          }}
                        >
                          Regenerate
                        </motion.button>
                      </div>
                    </motion.div>
                  )}

                  {/* Bottom padding */}
                  <div className="h-24" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
