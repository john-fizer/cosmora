"use client";

import { useState, useRef, useEffect } from "react";
import { LoopingVideo } from "@/components/ui/LoopingVideo";
import { getActiveProfileId, getCachedChart, getProfile, getOraclePersona } from "@/lib/storage";
import type { ChartData } from "@/lib/astrology/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedWindow {
  startDate: string;
  endDate: string;
  label: string;
  midpointDate: string;
  isPast: boolean;
  isFuture: boolean;
}

interface Profection {
  age: number;
  activatedHouse: number;
  activatedSign: string;
  lordOfYear: string;
}

interface TransitAspect {
  transitPlanet: string;
  transitSign: string;
  natalPlanet: string;
  natalSign: string;
  natalHouse: number;
  type: string;
  orb: number;
  exact: boolean;
  applying: boolean;
}

interface ZRPeriod {
  sign: string;
  years: number;
  start: string;
  end: string;
  derivedHouse: number;
  isLooseningOfBonds: boolean;
}

interface TemporalResult {
  window: ParsedWindow;
  profection: Profection;
  skyAtTime: { name: string; sign: string; signDegree: number; retrograde: boolean }[];
  significantAspects: TransitAspect[];
  allAspects: TransitAspect[];
  zrFortune: { l1: ZRPeriod | null; l2: ZRPeriod | null };
  zrSpirit: { l1: ZRPeriod | null; l2: ZRPeriod | null };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ASPECT_GLYPHS: Record<string, string> = {
  conjunction: "☌", opposition: "☍", trine: "△", square: "□",
  sextile: "⚹", quincunx: "⚻",
};

const ASPECT_COLORS: Record<string, string> = {
  conjunction: "#C8A55B", opposition: "#FF6B6B", trine: "#4ADE80",
  square: "#FF6B6B", sextile: "#60A5FA", quincunx: "#A78BFA",
};

const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇",
  NorthNode: "☊", Chiron: "⚷",
};

const SIGN_GLYPHS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

const OUTER_PLANETS = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${s.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${fmt(e)}`;
  }
  return `${fmt(s)} — ${fmt(e)}`;
}

// ─── Stars background ─────────────────────────────────────────────────────────

function StarField() {
  const stars = Array.from({ length: 120 }, (_, i) => ({
    x: (Math.sin(i * 37.4) * 0.5 + 0.5) * 100,
    y: (Math.cos(i * 19.7) * 0.5 + 0.5) * 100,
    size: (Math.sin(i * 7.3) * 0.5 + 0.5) * 2 + 0.5,
    opacity: (Math.cos(i * 13.1) * 0.5 + 0.5) * 0.6 + 0.1,
    delay: (i % 12) * 0.4,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size,
            opacity: s.opacity,
            animation: `twinkle ${3 + s.delay}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Aspect badge ─────────────────────────────────────────────────────────────

function AspectRow({ a }: { a: TransitAspect }) {
  const color = ASPECT_COLORS[a.type] ?? "#aaa";
  const glyph = ASPECT_GLYPHS[a.type] ?? "·";
  const isOuter = OUTER_PLANETS.includes(a.transitPlanet);
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors group">
      <span style={{ color }} className="w-4 text-center text-xs font-bold shrink-0">{glyph}</span>
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <span className={`text-sm font-medium ${isOuter ? "text-amber-300" : "text-slate-300"}`}>
          {PLANET_GLYPHS[a.transitPlanet] ?? ""} {a.transitPlanet}
        </span>
        <span className="text-slate-500 text-xs">{a.type}</span>
        <span className="text-slate-400 text-sm">
          {PLANET_GLYPHS[a.natalPlanet] ?? ""} natal {a.natalPlanet}
        </span>
        <span className="text-slate-600 text-xs ml-auto">H{a.natalHouse}</span>
      </div>
      <span className="text-slate-600 text-xs shrink-0">{a.orb.toFixed(1)}°</span>
    </div>
  );
}

// ─── Planet chip ──────────────────────────────────────────────────────────────

function PlanetChip({ p }: { p: { name: string; sign: string; signDegree: number; retrograde: boolean } }) {
  return (
    <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1.5 border border-white/10">
      <span className="text-amber-400 text-sm">{PLANET_GLYPHS[p.name] ?? p.name[0]}</span>
      <div>
        <div className="text-xs text-slate-300 font-medium leading-none">{p.name}</div>
        <div className="text-xs text-slate-500 leading-none mt-0.5">
          {p.signDegree.toFixed(1)}° {SIGN_GLYPHS[p.sign]}{p.sign}
          {p.retrograde && <span className="text-amber-500 ml-0.5">℞</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TemporalOraclePage() {
  const [chart, setChart] = useState<ChartData | null>(null);
  const [query, setQuery] = useState("");
  const [memory, setMemory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TemporalResult | null>(null);
  const [reading, setReading] = useState("");
  const [readingLoading, setReadingLoading] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const readingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pid = getActiveProfileId();
    if (pid) setChart(getCachedChart(pid));
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || !chart) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setReading("");

    try {
      const res = await fetch("/api/temporal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ natal: chart, dateQuery: query }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleReading() {
    if (!result || !chart) return;
    setReadingLoading(true);
    setReading("");

    const persona = getOraclePersona();
    const { window: w, profection, significantAspects, zrFortune, skyAtTime } = result;

    const keyPlanets = skyAtTime
      .filter(p => ["Sun", "Moon", "Jupiter", "Saturn"].includes(p.name))
      .map(p => `${p.name} in ${p.sign}${p.retrograde ? " ℞" : ""}`)
      .join(", ");

    const topAspects = significantAspects.slice(0, 4)
      .map(a => `${a.transitPlanet} ${a.type} natal ${a.natalPlanet} (H${a.natalHouse}, orb ${a.orb.toFixed(1)}°)`)
      .join("; ");

    const zrCtx = zrFortune.l1 ? `ZR Fortune: ${zrFortune.l1.sign} L1${zrFortune.l2 ? ` / ${zrFortune.l2.sign} L2` : ""}${zrFortune.l2?.isLooseningOfBonds ? " (LOOSENING OF BONDS)" : ""}` : "";

    const prompt = `You are reading the cosmic record for a specific time in this native's life.

TIME WINDOW: ${w.label} (${w.isPast ? "past" : w.isFuture ? "future" : "present"})
NATIVE'S AGE: ${profection.age}
ANNUAL PROFECTION: Age ${profection.age} → House ${profection.activatedHouse} (${profection.activatedSign}), lord of year: ${profection.lordOfYear}
KEY PLANETS AT THIS TIME: ${keyPlanets}
SIGNIFICANT ACTIVATIONS: ${topAspects || "none major"}
${zrCtx}
${memory ? `\nNATIVE'S MEMORY / EXPERIENCE: "${memory}"` : ""}

Write a 200–280 word oracle reading that:
1. Opens by naming what the cosmos was orchestrating during this window
2. Connects the specific activations to what was being renegotiated in the native's life
3. If a memory was shared, weave it in — explain WHY those experiences made sense cosmically
4. ${w.isFuture ? "Since this is a FUTURE window, speak prophetically — what is being prepared, what to lean into, what to be ready for" : "Close with what seed was planted in this period that the native is still harvesting today"}
Speak as the living memory of the cosmos. Present tense for past events (the cosmos doesn't experience time linearly). Do not use generic phrases.`;

    try {
      const res = await fetch("/api/oracle/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, maxTokens: 500, persona }),
      });
      if (!res.ok) throw new Error("Stream failed");
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
        setReading(text);
        readingRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    } catch (err) {
      setReading("The archive is silent for this moment. Try again.");
    } finally {
      setReadingLoading(false);
    }
  }

  if (!chart) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        No chart loaded. Complete onboarding first.
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      <LoopingVideo
        src="https://d8j0ntlcm91z4.cloudfront.net/user_3EJVjiEA4WaVDp4iCvA6Qzd9BpD/hf_20260603_160202_ae2861ec-6ea8-4772-81ff-0036e51bfdca.mp4"
        opacity={0.7}
      />
      <div className="fixed inset-0" style={{ zIndex: 3, background: "rgba(3,4,18,0.45)" }} />

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; } 50% { opacity: 0.8; }
        }
        @keyframes portalPulse {
          0%, 100% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.15), 0 0 80px rgba(139, 92, 246, 0.05); }
          50% { box-shadow: 0 0 60px rgba(139, 92, 246, 0.3), 0 0 120px rgba(139, 92, 246, 0.1); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .result-card { animation: fadeSlideUp 0.5s ease forwards; }
        .result-card:nth-child(2) { animation-delay: 0.1s; opacity: 0; }
        .result-card:nth-child(3) { animation-delay: 0.2s; opacity: 0; }
        .result-card:nth-child(4) { animation-delay: 0.3s; opacity: 0; }
        .portal-ring { animation: portalPulse 4s ease-in-out infinite; }
      `}</style>

      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
        <div
          className="absolute w-full h-32 bg-gradient-to-b from-transparent via-violet-400 to-transparent"
          style={{ animation: "scanline 8s linear infinite" }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-32">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
            <span className="text-violet-400 text-xs tracking-[0.4em] font-light">TEMPORAL ORACLE</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-violet-500/30 to-transparent" />
          </div>
          <h1 className="text-4xl font-thin tracking-widest text-white mb-3" style={{ fontFamily: "Georgia, serif" }}>
            Navigate the<br />
            <span className="text-violet-300">Cosmic Archive</span>
          </h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
            The sky remembers everything. Enter any moment — past or future — and read what the cosmos was arranging.
          </p>
        </div>

        {/* Portal search */}
        <form onSubmit={handleSearch} className="mb-12">
          <div
            className="portal-ring relative rounded-2xl border border-violet-500/20 bg-black/40 backdrop-blur-sm p-8 transition-all duration-700"
          >
            {/* Decorative corners */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-violet-500/40" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-violet-500/40" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-violet-500/40" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-violet-500/40" />

            <div className="mb-6">
              <label className="block text-xs tracking-[0.3em] text-slate-500 mb-3">ENTER A TIME</label>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="summer of '99 · when I moved to New York · March 2015 · next year..."
                className="w-full bg-transparent border-0 border-b border-violet-500/30 pb-2 text-lg text-white placeholder-slate-600 focus:outline-none focus:border-violet-400/60 transition-colors"
                style={{ fontFamily: "Georgia, serif" }}
              />
            </div>

            {/* Memory toggle */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowMemory(!showMemory)}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors tracking-widest flex items-center gap-2"
              >
                <span className={`transition-transform ${showMemory ? "rotate-90" : ""}`}>▶</span>
                {showMemory ? "CLOSE MEMORY CONTEXT" : "+ ADD WHAT YOU WERE EXPERIENCING (OPTIONAL)"}
              </button>
              {showMemory && (
                <textarea
                  value={memory}
                  onChange={e => setMemory(e.target.value)}
                  placeholder="Describe what was happening — a feeling, a decision, a memory, a question about what's coming..."
                  className="mt-3 w-full h-20 bg-white/5 rounded-lg border border-white/10 p-3 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-500/40 resize-none"
                />
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 italic">
                Try: "the year I turned 18" · "late 2012" · "2027"
              </span>
              <button
                type="submit"
                disabled={!query.trim() || loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-violet-600/20 border border-violet-500/40 rounded-lg text-violet-300 text-sm tracking-widest hover:bg-violet-600/30 hover:border-violet-400/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-3 h-3 border border-violet-400/50 border-t-violet-400 rounded-full animate-spin" />
                    READING THE ARCHIVE...
                  </>
                ) : (
                  "✦ ENTER THE ARCHIVE"
                )}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="text-red-400 text-sm text-center mb-8 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">

            {/* Time window header */}
            <div className="result-card text-center">
              <div className="inline-block">
                <div className={`text-xs tracking-[0.4em] mb-1 ${result.window.isFuture ? "text-blue-400" : result.window.isPast ? "text-amber-400/70" : "text-green-400"}`}>
                  {result.window.isFuture ? "◈ FUTURE WINDOW" : result.window.isPast ? "◎ PAST RECORD" : "◉ PRESENT WINDOW"}
                </div>
                <h2 className="text-3xl font-thin tracking-wider" style={{ fontFamily: "Georgia, serif" }}>
                  {result.window.label}
                </h2>
                <div className="text-sm text-slate-500 mt-1">
                  {formatDateRange(result.window.startDate, result.window.endDate)}
                  <span className="mx-2">·</span>
                  <span className="text-slate-400">Age {result.profection.age}</span>
                </div>
              </div>
            </div>

            {/* 3-column snapshot */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Profection */}
              <div className="result-card bg-black/40 border border-white/10 rounded-xl p-5 hover:border-violet-500/20 transition-colors">
                <div className="text-xs tracking-[0.3em] text-slate-600 mb-4">ANNUAL PROFECTION</div>
                <div className="text-4xl text-amber-400 font-thin mb-2">
                  H{result.profection.activatedHouse}
                </div>
                <div className="text-sm text-slate-300 mb-1">
                  {SIGN_GLYPHS[result.profection.activatedSign]} {result.profection.activatedSign}
                </div>
                <div className="text-xs text-slate-500">
                  Lord of Year: <span className="text-amber-400/80">{PLANET_GLYPHS[result.profection.lordOfYear] ?? ""} {result.profection.lordOfYear}</span>
                </div>
              </div>

              {/* ZR Fortune */}
              <div className="result-card bg-black/40 border border-white/10 rounded-xl p-5 hover:border-violet-500/20 transition-colors">
                <div className="text-xs tracking-[0.3em] text-slate-600 mb-4">ZODIACAL RELEASING · FORTUNE</div>
                {result.zrFortune.l1 ? (
                  <>
                    <div className="text-2xl text-emerald-400 font-thin mb-1">
                      {SIGN_GLYPHS[result.zrFortune.l1.sign]} {result.zrFortune.l1.sign}
                    </div>
                    <div className="text-xs text-slate-500 mb-2">L1 · H{result.zrFortune.l1.derivedHouse} from Fortune</div>
                    {result.zrFortune.l2 && (
                      <div className="text-xs text-slate-400">
                        L2: {SIGN_GLYPHS[result.zrFortune.l2.sign]} {result.zrFortune.l2.sign}
                        {result.zrFortune.l2.isLooseningOfBonds && (
                          <span className="ml-2 text-amber-400 font-medium">⚡ LOOSENING</span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-slate-600 text-sm">Outside calculable range</div>
                )}
              </div>

              {/* ZR Spirit */}
              <div className="result-card bg-black/40 border border-white/10 rounded-xl p-5 hover:border-violet-500/20 transition-colors">
                <div className="text-xs tracking-[0.3em] text-slate-600 mb-4">ZODIACAL RELEASING · SPIRIT</div>
                {result.zrSpirit.l1 ? (
                  <>
                    <div className="text-2xl text-blue-400 font-thin mb-1">
                      {SIGN_GLYPHS[result.zrSpirit.l1.sign]} {result.zrSpirit.l1.sign}
                    </div>
                    <div className="text-xs text-slate-500 mb-2">L1 · H{result.zrSpirit.l1.derivedHouse} from Spirit</div>
                    {result.zrSpirit.l2 && (
                      <div className="text-xs text-slate-400">
                        L2: {SIGN_GLYPHS[result.zrSpirit.l2.sign]} {result.zrSpirit.l2.sign}
                        {result.zrSpirit.l2.isLooseningOfBonds && (
                          <span className="ml-2 text-amber-400 font-medium">⚡ LOOSENING</span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-slate-600 text-sm">Outside calculable range</div>
                )}
              </div>
            </div>

            {/* Significant activations */}
            {result.significantAspects.length > 0 && (
              <div className="result-card bg-black/40 border border-white/10 rounded-xl p-5">
                <div className="text-xs tracking-[0.3em] text-slate-600 mb-4">SIGNIFICANT ACTIVATIONS AT THIS TIME</div>
                <div className="space-y-0.5">
                  {result.significantAspects.map((a, i) => (
                    <AspectRow key={i} a={a} />
                  ))}
                </div>
              </div>
            )}

            {/* Sky snapshot */}
            <div className="result-card bg-black/40 border border-white/10 rounded-xl p-5">
              <div className="text-xs tracking-[0.3em] text-slate-600 mb-4">
                SKY SNAPSHOT · {new Date(result.window.midpointDate + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {result.skyAtTime
                  .filter(p => !["NorthNode", "Chiron"].includes(p.name))
                  .map((p, i) => <PlanetChip key={i} p={p} />)}
              </div>
            </div>

            {/* Reading panel */}
            <div className="result-card bg-black/60 border border-violet-500/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs tracking-[0.3em] text-slate-500">ORACLE READING</div>
                {!reading && !readingLoading && (
                  <button
                    onClick={handleReading}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600/20 border border-violet-500/30 rounded-lg text-violet-300 text-xs tracking-widest hover:bg-violet-600/30 transition-all"
                  >
                    ✦ GENERATE READING
                  </button>
                )}
                {readingLoading && (
                  <div className="flex items-center gap-2 text-xs text-violet-400/70">
                    <div className="w-3 h-3 border border-violet-400/50 border-t-violet-400 rounded-full animate-spin" />
                    READING THE ARCHIVE...
                  </div>
                )}
              </div>

              {!reading && !readingLoading && (
                <div className="text-center py-8 text-slate-600 text-sm italic">
                  {memory
                    ? "Your memory has been received. Request a reading to hear what the cosmos was arranging."
                    : "Request a reading to hear what the cosmos was orchestrating during this window."}
                </div>
              )}

              {(reading || readingLoading) && (
                <div ref={readingRef} className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap" style={{ fontFamily: "Georgia, serif" }}>
                  {reading}
                  {readingLoading && (
                    <span className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 animate-pulse" />
                  )}
                </div>
              )}
            </div>

            {/* Reset */}
            <div className="text-center">
              <button
                onClick={() => { setResult(null); setReading(""); setQuery(""); setMemory(""); setShowMemory(false); }}
                className="text-xs text-slate-600 hover:text-slate-400 tracking-widest transition-colors"
              >
                ← ENTER ANOTHER TIME
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
