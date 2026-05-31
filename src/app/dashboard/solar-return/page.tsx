"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { SIGN_SYMBOLS, PLANET_SYMBOLS, ZODIAC_SIGNS, TRADITIONAL_RULERS } from "@/lib/astrology/types";
import type { ChartData, ZodiacSign, PlanetName } from "@/lib/astrology/types";
import { getActiveProfileId, getProfile, getCachedChart } from "@/lib/storage";
import type { StoredProfile } from "@/lib/storage";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLANET_COLORS: Partial<Record<PlanetName, string>> = {
  Sun: "#fbbf24", Moon: "#c4b5fd", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#8b5cf6",
};

const SIGN_COLORS: Record<ZodiacSign, string> = {
  Aries: "#ef4444", Taurus: "#22c55e", Gemini: "#eab308", Cancer: "#38bdf8",
  Leo: "#f97316", Virgo: "#4ade80", Libra: "#facc15", Scorpio: "#dc2626",
  Sagittarius: "#f59e0b", Capricorn: "#94a3b8", Aquarius: "#06b6d4", Pisces: "#8b5cf6",
};

const HOUSE_THEMES: Record<number, string> = {
  1: "Identity & Appearance", 2: "Money & Resources", 3: "Communication & Mind",
  4: "Home & Family", 5: "Creativity & Romance", 6: "Health & Routines",
  7: "Partnerships", 8: "Transformation & Shared Resources", 9: "Travel & Wisdom",
  10: "Career & Public Role", 11: "Friends & Goals", 12: "Hidden Matters & Rest",
};

function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
}

// ─── SR → Natal cross-chart aspects ──────────────────────────────────────────

const SR_ASPECT_DEFS = [
  { name: "Conjunction", glyph: "☌", angle: 0,   orb: 8, color: "#fbbf24" },
  { name: "Opposition",  glyph: "☍", angle: 180,  orb: 8, color: "#ef4444" },
  { name: "Trine",       glyph: "△", angle: 120,  orb: 7, color: "#22c55e" },
  { name: "Square",      glyph: "□", angle: 90,   orb: 6, color: "#f97316" },
  { name: "Sextile",     glyph: "⚹", angle: 60,   orb: 5, color: "#06b6d4" },
] as const;

type SRAspect = {
  srPlanet: PlanetName;
  natalPlanet: PlanetName;
  type: typeof SR_ASPECT_DEFS[number];
  orb: number;
};

function computeSRNatalAspects(srChart: ChartData, natalChart: ChartData): SRAspect[] {
  const aspects: SRAspect[] = [];
  for (const srP of srChart.planets) {
    for (const natP of natalChart.planets) {
      const diff = ((srP.longitude - natP.longitude) % 360 + 360) % 360;
      const arcDiff = diff > 180 ? 360 - diff : diff;
      for (const def of SR_ASPECT_DEFS) {
        const orb = Math.abs(arcDiff - def.angle);
        if (orb <= def.orb) aspects.push({ srPlanet: srP.name, natalPlanet: natP.name, type: def, orb });
      }
    }
  }
  return aspects.sort((a, b) => a.orb - b.orb);
}

function SRNatalAspects({ srChart, natalChart }: { srChart: ChartData; natalChart: ChartData }) {
  const aspects = useMemo(() => computeSRNatalAspects(srChart, natalChart), [srChart, natalChart]);
  if (aspects.length === 0) return <p className="text-[14px]" style={{ color: "#334155" }}>No cross-chart aspects found.</p>;
  return (
    <div className="space-y-1.5">
      {aspects.slice(0, 24).map((asp, i) => {
        const srColor  = PLANET_COLORS[asp.srPlanet]    ?? "#94a3b8";
        const natColor = PLANET_COLORS[asp.natalPlanet] ?? "#94a3b8";
        return (
          <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-1 w-28 flex-shrink-0">
              <span className="text-[13px]" style={{ color: srColor }}>{PLANET_SYMBOLS[asp.srPlanet]}</span>
              <span className="text-[13px] font-medium" style={{ color: srColor }}>{asp.srPlanet}</span>
              <span className="text-[14px] font-bold ml-1 px-1 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>SR</span>
            </div>
            <div className="flex flex-col items-center w-10 flex-shrink-0">
              <span className="text-base font-bold" style={{ color: asp.type.color }}>{asp.type.glyph}</span>
              <span className="text-[14px]" style={{ color: "#334155" }}>{asp.orb.toFixed(1)}°</span>
            </div>
            <div className="flex items-center gap-1 flex-1">
              <span className="text-[13px]" style={{ color: natColor }}>{PLANET_SYMBOLS[asp.natalPlanet]}</span>
              <span className="text-[13px] font-medium" style={{ color: natColor }}>{asp.natalPlanet}</span>
              <span className="text-[14px] font-bold ml-1 px-1 py-0.5 rounded" style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa" }}>NATAL</span>
            </div>
            <span className="text-[13px] hidden md:block flex-shrink-0" style={{ color: "#334155" }}>{asp.type.name}</span>
          </motion.div>
        );
      })}
      <p className="text-[13px] text-center pt-2" style={{ color: "#334155" }}>
        {aspects.length} cross-chart aspects · sorted by exactness
      </p>
    </div>
  );
}

// ─── Overlay comparison (natal vs SR planet) ──────────────────────────────────

function PlanetCompare({ natalChart, srChart }: { natalChart: ChartData; srChart: ChartData }) {
  const planets: PlanetName[] = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Ascendant" as PlanetName];

  return (
    <div className="space-y-1.5">
      {/* Header */}
      <div className="grid grid-cols-3 gap-2 px-2 mb-2">
        <span className="text-[14px] font-bold tracking-widest" style={{ color: "#334155" }}>PLANET</span>
        <span className="text-[14px] font-bold tracking-widest" style={{ color: "#7c3aed" }}>NATAL</span>
        <span className="text-[14px] font-bold tracking-widest" style={{ color: "#f59e0b" }}>SOLAR RETURN</span>
      </div>
      {natalChart.planets.slice(0, 10).map(np => {
        const srP = srChart.planets.find(p => p.name === np.name);
        if (!srP) return null;
        const color = PLANET_COLORS[np.name] ?? "#94a3b8";
        const signChanged = np.sign !== srP.sign;
        const houseChanged = np.house !== srP.house;
        return (
          <motion.div
            key={np.name}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid grid-cols-3 gap-2 px-3 py-2 rounded-xl"
            style={{
              background: (signChanged || houseChanged) ? "rgba(245,158,11,0.05)" : "rgba(255,255,255,0.02)",
              border: (signChanged || houseChanged) ? "1px solid rgba(245,158,11,0.12)" : "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <span style={{ color }}>{PLANET_SYMBOLS[np.name]}</span>
              <span className="text-[13px] font-medium" style={{ color }}>{np.name}</span>
            </div>
            <div>
              <p className="text-[14px] font-medium" style={{ color: "#94a3b8" }}>
                {SIGN_SYMBOLS[np.sign]} {np.sign.substring(0, 3)} H{np.house}
              </p>
              <p className="text-[13px]" style={{ color: "#334155" }}>{np.signDegree.toFixed(1)}°</p>
            </div>
            <div>
              <p className="text-[14px] font-medium" style={{ color: signChanged ? "#f59e0b" : "#94a3b8" }}>
                {SIGN_SYMBOLS[srP.sign]} {srP.sign.substring(0, 3)} H{srP.house}
              </p>
              <p className="text-[13px]" style={{ color: "#334155" }}>{srP.signDegree.toFixed(1)}°</p>
            </div>
          </motion.div>
        );
      })}

      {/* Ascendant */}
      <div className="grid grid-cols-3 gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(6,182,212,0.04)", border: "1px solid rgba(6,182,212,0.1)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ color: "#06b6d4" }}>ASC</span>
        </div>
        <p className="text-[14px] font-medium" style={{ color: "#94a3b8" }}>
          {SIGN_SYMBOLS[natalChart.houses[0].sign]} {natalChart.houses[0].sign}
        </p>
        <p className="text-[14px] font-medium" style={{ color: "#06b6d4" }}>
          {SIGN_SYMBOLS[srChart.houses[0].sign]} {srChart.houses[0].sign}
        </p>
      </div>
    </div>
  );
}

// ─── SR House emphasis ────────────────────────────────────────────────────────

function HouseEmphasis({ srChart }: { srChart: ChartData }) {
  const houseCount: Record<number, PlanetName[]> = {};
  for (let h = 1; h <= 12; h++) houseCount[h] = [];
  srChart.planets.forEach(p => {
    if (p.house >= 1 && p.house <= 12) houseCount[p.house].push(p.name);
  });

  const emphasized = Object.entries(houseCount)
    .filter(([, planets]) => planets.length >= 2)
    .sort((a, b) => b[1].length - a[1].length);

  if (emphasized.length === 0) {
    return <p className="text-[14px]" style={{ color: "#334155" }}>No heavily occupied houses this year.</p>;
  }

  return (
    <div className="space-y-2">
      {emphasized.map(([house, planets]) => (
        <div
          key={house}
          className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex-shrink-0">
            <p className="text-[13px] font-bold" style={{ color: "#a78bfa" }}>H{house}</p>
            <p className="text-[13px]" style={{ color: "#334155" }}>{planets.length} planets</p>
          </div>
          <div className="flex-1">
            <p className="text-[13px] mb-1" style={{ color: "#64748b" }}>{HOUSE_THEMES[Number(house)]}</p>
            <div className="flex gap-1.5 flex-wrap">
              {planets.map(name => (
                <span key={name} className="text-[13px]" style={{ color: PLANET_COLORS[name as PlanetName] ?? "#94a3b8" }}>
                  {PLANET_SYMBOLS[name as PlanetName]} {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Solar Return Oracle ──────────────────────────────────────────────────────

function SolarReturnOracle({ natalChart, srChart, profile, year }: {
  natalChart: ChartData; srChart: ChartData; profile: StoredProfile | null; year: number;
}) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    const srMoon = srChart.planets.find(p => p.name === "Moon");
    const srSun  = srChart.planets.find(p => p.name === "Sun");
    const srAsc  = srChart.houses[0];
    const srLord = TRADITIONAL_RULERS[srAsc.sign];
    const srLordPlanet = srChart.planets.find(p => p.name === srLord);
    const natalSun  = natalChart.planets.find(p => p.name === "Sun");
    const natalMoon = natalChart.planets.find(p => p.name === "Moon");

    const prompt = `You are an expert traditional astrologer. Interpret the ${year} Solar Return chart for ${profile?.name ?? "this person"}.

SR Ascendant: ${srAsc.sign} (${srAsc.signDegree.toFixed(1)}°)
SR Moon: ${srMoon ? `${srMoon.sign} House ${srMoon.house}${srMoon.retrograde ? " Rx" : ""}` : "unknown"}
SR Sun: ${srSun ? `${srSun.sign} House ${srSun.house}` : "unknown"}
SR Lord of Year: ${srLord}${srLordPlanet ? ` in ${srLordPlanet.sign} House ${srLordPlanet.house}${srLordPlanet.dignity && srLordPlanet.dignity !== "peregrine" ? ` (${srLordPlanet.dignity})` : ""}` : ""}
Chart sect: ${srChart.sect}
Natal Sun: ${natalSun?.sign} H${natalSun?.house} | Natal Moon: ${natalMoon?.sign} H${natalMoon?.house}

Write 3 paragraphs: (1) the overarching yearly theme from the SR Ascendant and its lord — be specific about the house it occupies; (2) the emotional and relational focus from SR Moon; (3) the key opportunity or challenge to navigate this year. Be direct and meaningful. No bullet points.`;

    setStreaming(true);
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, profileId: null }),
    }).then(async (res) => {
      if (!res.ok || !res.body) { setStreaming(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try { const d = JSON.parse(line.slice(6)); if (d.text) setText(prev => prev + d.text); } catch {}
        }
      }
      setStreaming(false);
    }).catch(() => setStreaming(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.04)" }}
    >
      <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(245,158,11,0.1)" }}>
        <p className="text-[13px] font-bold tracking-widest" style={{ color: "#f59e0b" }}>
          ✦ ORACLE — {year} SOLAR RETURN
        </p>
      </div>
      <div className="p-5">
        {streaming && !text && (
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 rounded-full border border-t-transparent flex-shrink-0"
              style={{ borderColor: "#f59e0b" }}
            />
            <span className="text-[13px]" style={{ color: "#475569" }}>Oracle is reading your year…</span>
          </div>
        )}
        {text && (
          <div className="text-[16px] leading-relaxed space-y-3" style={{ color: "#94a3b8" }}>
            {text.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
            {streaming && (
              <span
                className="inline-block w-1 h-4 ml-0.5 rounded-sm"
                style={{ background: "#f59e0b", animation: "pulse 1s infinite" }}
              />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SolarReturnPage() {
  const [natalChart, setNatalChart] = useState<ChartData | null>(null);
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [srChart, setSrChart] = useState<ChartData | null>(null);
  const [srDatetime, setSrDatetime] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "planets" | "aspects" | "houses" | "oracle">("overview");

  // Generate year options: birth year to current + 10
  const birthYear = profile?.birthDate ? parseInt(profile.birthDate.split("-")[0]) : 1990;
  const years = useMemo(() => {
    const curr = new Date().getFullYear();
    return Array.from({ length: curr + 10 - birthYear }, (_, i) => birthYear + i + 1);
  }, [birthYear]);

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setLoadingProfile(false); return; }
    const prof = getProfile(id);
    const cached = getCachedChart(id);
    setProfile(prof);
    setNatalChart(cached);
    setLoadingProfile(false);
  }, []);

  const fetchSolarReturn = async (year: number) => {
    if (!natalChart || !profile) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/solar-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          natalSunLon: natalChart.planets.find(p => p.name === "Sun")?.longitude ?? 0,
          year,
          latitude: profile.latitude,
          longitude: profile.longitude,
          timezone: profile.timezone,
          houseSystem: profile.houseSystem,
        }),
      });
      if (!res.ok) throw new Error("Calculation failed");
      const data = await res.json();
      setSrChart(data.chart);
      setSrDatetime(data.srDatetime);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on profile load for current year
  useEffect(() => {
    if (natalChart && profile) fetchSolarReturn(selectedYear);
  }, [natalChart, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loadingProfile && !natalChart) {
    return (
      <div className="h-screen flex overflow-hidden" style={{ background: "#00000f" }}>
        <DashboardBg />
        <div className="nebula-orb" style={{ width: 500, height: 500, left: "20%", top: "5%", background: "rgba(124,58,237,0.07)", filter: "blur(100px)" }} />
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 md:ml-[68px] mb-[60px] md:mb-0 px-6">
          <motion.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-2xl flex items-center justify-center"
            style={{ width: 72, height: 72, background: "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(6,182,212,0.14))", border: "1px solid rgba(124,58,237,0.35)", boxShadow: "0 0 48px rgba(124,58,237,0.18)" }}
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="14" stroke="rgba(124,58,237,0.6)" strokeWidth="1"/>
              <circle cx="18" cy="18" r="8" stroke="rgba(6,182,212,0.5)" strokeWidth="0.75"/>
              <line x1="18" y1="4" x2="18" y2="32" stroke="rgba(124,58,237,0.35)" strokeWidth="0.75"/>
              <line x1="4" y1="18" x2="32" y2="18" stroke="rgba(124,58,237,0.35)" strokeWidth="0.75"/>
              <circle cx="18" cy="18" r="2.5" fill="rgba(6,182,212,0.8)"/>
            </svg>
          </motion.div>
          <div className="text-center">
            <p className="text-[14px] font-bold tracking-[0.2em] mb-2" style={{ color: "#334155" }}>NO CHART DATA</p>
            <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "Space Grotesk, sans-serif", color: "#e2e8f0" }}>Cosmic instruments standing by.</h2>
            <p className="text-[14px] max-w-xs mx-auto" style={{ color: "#475569" }}>Enter your birth data to unlock your solar return and all its cosmic layers.</p>
          </div>
          <Link href="/onboarding">
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="px-6 py-3 rounded-xl text-[14px] font-bold tracking-wider cursor-pointer"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "white", border: "1px solid rgba(124,58,237,0.4)" }}
            >
              Begin Your Chart →
            </motion.button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#00000f" }}>
      <DashboardBg />
      <div className="nebula-orb" style={{ width: 500, height: 500, right: "0%", top: "-10%", background: "rgba(245,158,11,0.06)", filter: "blur(100px)" }} />
      <div className="nebula-orb" style={{ width: 300, height: 300, left: "5%", bottom: "10%", background: "rgba(124,58,237,0.05)", filter: "blur(80px)" }} />
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-0 min-w-0 md:ml-[68px] mb-[60px] md:mb-0 relative z-10 overflow-x-hidden">

        {/* Top bar */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-3"
          style={{ borderBottom: "1px solid rgba(245,158,11,0.15)", background: "rgba(1,1,14,0.85)", backdropFilter: "blur(20px)" }}>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 text-[13px] font-medium cursor-pointer" style={{ color: "#64748b" }}>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
                Dashboard
              </motion.button>
            </Link>
            <span style={{ color: "#1e293b" }}>/</span>
            <span className="text-[13px] font-bold tracking-widest" style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              SOLAR RETURN
            </span>
            {profile && <><span style={{ color: "#1e293b" }}>/</span><span className="text-[13px]" style={{ color: "#64748b" }}>{profile.name}</span></>}
          </div>

          {srChart && (
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              {(["overview", "planets", "aspects", "houses", "oracle"] as const).map(tab => (
                <motion.button key={tab} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab(tab)}
                  className="px-2.5 py-1 rounded-lg text-[13px] font-bold tracking-widest cursor-pointer transition-all duration-200"
                  style={{
                    background: activeTab === tab ? "rgba(245,158,11,0.2)" : "transparent",
                    color: activeTab === tab ? "#fbbf24" : "#334155",
                    border: activeTab === tab ? "1px solid rgba(245,158,11,0.3)" : "1px solid transparent",
                  }}>
                  {tab.toUpperCase()}
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          <div className="px-4 md:px-6 py-5 max-w-4xl mx-auto">

            {/* Year selector */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-6 flex-wrap">
              <p className="text-[13px] font-bold tracking-widest" style={{ color: "#64748b" }}>SELECT YEAR</p>
              <div className="flex items-center gap-2">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => { const y = selectedYear - 1; setSelectedYear(y); fetchSolarReturn(y); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>
                  ‹
                </motion.button>
                <select
                  value={selectedYear}
                  onChange={e => { const y = Number(e.target.value); setSelectedYear(y); fetchSolarReturn(y); }}
                  className="bg-transparent text-[14px] font-bold cursor-pointer outline-none px-2 py-1 rounded-lg"
                  style={{ color: "#fbbf24", border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.08)" }}
                >
                  {years.map(y => <option key={y} value={y} style={{ background: "#0a0a1a" }}>{y}</option>)}
                </select>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => { const y = selectedYear + 1; setSelectedYear(y); fetchSolarReturn(y); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>
                  ›
                </motion.button>
              </div>
              {loading && (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 rounded-full border border-t-transparent" style={{ borderColor: "#f59e0b" }} />
              )}
              {srDatetime && !loading && (
                <span className="text-[13px]" style={{ color: "#475569" }}>
                  ☉ returns {formatDatetime(srDatetime)}
                </span>
              )}
            </motion.div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl text-[14px]" style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.15)" }}>
                {error}
              </div>
            )}

            <AnimatePresence mode="wait">
              {srChart && natalChart && !loading && (
                <motion.div key={`${selectedYear}-${activeTab}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                  {/* ─── OVERVIEW TAB ──────────────────────────────────────── */}
                  {activeTab === "overview" && (
                    <div className="space-y-5">
                      {/* SR Ascendant + key placements */}
                      <div className="rounded-2xl p-5"
                        style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", boxShadow: "0 0 40px rgba(245,158,11,0.06)" }}>
                        <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#f59e0b" }}>
                          {selectedYear} SOLAR RETURN · KEY PLACEMENTS
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { label: "SR ASC", value: `${SIGN_SYMBOLS[srChart.houses[0].sign]} ${srChart.houses[0].sign}`, color: "#06b6d4" },
                            { label: "SR MC", value: (() => { const mc = srChart.houses[9]; return `${SIGN_SYMBOLS[mc?.sign ?? "Aries"]} ${mc?.sign ?? "—"}`; })(), color: "#a855f7" },
                            { label: "SR MOON", value: (() => { const m = srChart.planets.find(p => p.name === "Moon"); return m ? `${SIGN_SYMBOLS[m.sign]} ${m.sign} H${m.house}` : "—"; })(), color: "#c4b5fd" },
                            { label: "SR SECT", value: srChart.sect.toUpperCase(), color: srChart.sect === "day" ? "#fbbf24" : "#c4b5fd" },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="flex flex-col gap-1">
                              <p className="text-[14px] tracking-widest font-bold" style={{ color: "#334155" }}>{label}</p>
                              <p className="text-[14px] font-bold" style={{ color }}>{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* House emphasis */}
                      <div>
                        <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#64748b" }}>ACTIVATED HOUSES</p>
                        <HouseEmphasis srChart={srChart} />
                      </div>

                      {/* SR Lord of the Year */}
                      {(() => {
                        const srAscSign = srChart.houses[0].sign;
                        const srLord = TRADITIONAL_RULERS[srAscSign];
                        const srLordPlanet = srChart.planets.find(p => p.name === srLord);
                        const color = PLANET_COLORS[srLord] ?? "#94a3b8";
                        return (
                          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <p className="text-[13px] font-bold tracking-widest mb-2" style={{ color: "#64748b" }}>SR LORD OF THE YEAR</p>
                            <div className="flex items-center gap-3">
                              <span className="text-3xl" style={{ color }}>{PLANET_SYMBOLS[srLord]}</span>
                              <div>
                                <p className="text-[14px] font-bold" style={{ color }}>{srLord}</p>
                                {srLordPlanet && (
                                  <p className="text-[14px]" style={{ color: "#475569" }}>
                                    {SIGN_SYMBOLS[srLordPlanet.sign]} {srLordPlanet.sign} · House {srLordPlanet.house}
                                    {srLordPlanet.dignity && srLordPlanet.dignity !== "peregrine" && ` · ${srLordPlanet.dignity}`}
                                    {srLordPlanet.retrograde && " · Rx"}
                                  </p>
                                )}
                                <p className="text-[13px] mt-0.5" style={{ color: "#334155" }}>
                                  Ruler of SR {srAscSign} Ascendant
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Profection × SR connection */}
                      {(() => {
                        const profectionAge = selectedYear - birthYear;
                        const profHouse = (profectionAge % 12) + 1;
                        const profSign  = ZODIAC_SIGNS[profectionAge % 12] as ZodiacSign;
                        const profLord  = TRADITIONAL_RULERS[profSign];
                        const srProfHouseCusp   = srChart.houses[profHouse - 1];
                        const srProfLordPlanet  = srChart.planets.find(p => p.name === profLord);
                        const lordColor = PLANET_COLORS[profLord] ?? "#94a3b8";
                        return (
                          <div className="rounded-2xl p-4" style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.18)" }}>
                            <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#06b6d4" }}>
                              ✦ ANNUAL PROFECTION × SOLAR RETURN
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[14px] tracking-widest font-bold mb-1" style={{ color: "#334155" }}>NATAL PROFECTION YEAR</p>
                                <p className="text-[14px] font-bold" style={{ color: "#06b6d4" }}>Age {profectionAge} → House {profHouse}</p>
                                <p className="text-[13px] mt-0.5" style={{ color: "#475569" }}>{profSign} · {HOUSE_THEMES[profHouse]}</p>
                                <p className="text-[13px] mt-1" style={{ color: "#334155" }}>
                                  Lord: <span style={{ color: lordColor }}>{PLANET_SYMBOLS[profLord]} {profLord}</span>
                                </p>
                              </div>
                              <div>
                                <p className="text-[14px] tracking-widest font-bold mb-1" style={{ color: "#334155" }}>PROFECTION LORD IN SR</p>
                                {srProfLordPlanet ? (
                                  <>
                                    <p className="text-[14px] font-bold" style={{ color: lordColor }}>
                                      {SIGN_SYMBOLS[srProfLordPlanet.sign]} {srProfLordPlanet.sign}
                                    </p>
                                    <p className="text-[13px] mt-0.5" style={{ color: "#475569" }}>
                                      House {srProfLordPlanet.house}
                                      {srProfLordPlanet.dignity && srProfLordPlanet.dignity !== "peregrine" ? ` · ${srProfLordPlanet.dignity}` : ""}
                                      {srProfLordPlanet.retrograde ? " · Rx" : ""}
                                    </p>
                                    {srProfHouseCusp && (
                                      <p className="text-[13px] mt-1" style={{ color: "#334155" }}>
                                        SR H{profHouse}: {SIGN_SYMBOLS[srProfHouseCusp.sign]} {srProfHouseCusp.sign}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-[13px]" style={{ color: "#334155" }}>—</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* SR Stelliums */}
                      {(() => {
                        const stelliums = ZODIAC_SIGNS.map(sign => ({
                          sign: sign as ZodiacSign,
                          planets: srChart.planets.filter(p => p.sign === sign).map(p => p.name as PlanetName),
                        })).filter(s => s.planets.length >= 3);
                        if (stelliums.length === 0) return null;
                        return (
                          <div className="rounded-2xl p-4" style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.18)" }}>
                            <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#a855f7" }}>✦ SR STELLIUMS</p>
                            {stelliums.map(s => {
                              const signColor = SIGN_COLORS[s.sign];
                              return (
                                <div key={s.sign} className="flex items-center gap-3 flex-wrap">
                                  <span className="text-xl" style={{ color: signColor }}>{SIGN_SYMBOLS[s.sign]}</span>
                                  <div>
                                    <p className="text-[14px] font-bold" style={{ color: signColor }}>{s.sign}</p>
                                    <p className="text-[13px]" style={{ color: "#475569" }}>{s.planets.length} planets · concentrated energy</p>
                                  </div>
                                  <div className="flex gap-2 ml-2 flex-wrap">
                                    {s.planets.map(name => (
                                      <span key={name} className="flex items-center gap-0.5 text-[14px]" style={{ color: PLANET_COLORS[name] ?? "#94a3b8" }}>
                                        {PLANET_SYMBOLS[name]}
                                        <span className="text-[13px]">{name}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* ─── PLANETS TAB ───────────────────────────────────────── */}
                  {activeTab === "planets" && (
                    <div>
                      <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#64748b" }}>
                        NATAL vs SOLAR RETURN POSITIONS
                      </p>
                      <PlanetCompare natalChart={natalChart} srChart={srChart} />
                    </div>
                  )}

                  {/* ─── ASPECTS TAB ───────────────────────────────────────── */}
                  {activeTab === "aspects" && (
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-[13px] font-bold tracking-widest" style={{ color: "#64748b" }}>SR → NATAL CROSS-CHART ASPECTS</p>
                          <p className="text-[14px] mt-0.5" style={{ color: "#334155" }}>Where {selectedYear} SR planets land on your natal positions</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {SR_ASPECT_DEFS.map(def => (
                            <span key={def.name} className="flex items-center gap-1 text-[14px]" style={{ color: def.color }}>
                              {def.glyph} {def.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <SRNatalAspects srChart={srChart} natalChart={natalChart} />
                    </div>
                  )}

                  {/* ─── HOUSES TAB ────────────────────────────────────────── */}
                  {activeTab === "houses" && (
                    <div>
                      <p className="text-[13px] font-bold tracking-widest mb-3" style={{ color: "#64748b" }}>
                        SOLAR RETURN HOUSE CUSPS
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {srChart.houses.map(h => {
                          const planetsHere = srChart.planets.filter(p => p.house === h.house);
                          const signColor = SIGN_COLORS[h.sign];
                          return (
                            <motion.div
                              key={h.house}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: h.house * 0.03 }}
                              className="rounded-xl p-3"
                              style={{
                                background: planetsHere.length > 0 ? `${signColor}08` : "rgba(255,255,255,0.02)",
                                border: planetsHere.length > 0 ? `1px solid ${signColor}20` : "1px solid rgba(255,255,255,0.04)",
                              }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[13px] font-bold tracking-wider" style={{ color: "#334155" }}>H{h.house}</span>
                                <span className="text-base" style={{ color: signColor }}>{SIGN_SYMBOLS[h.sign]}</span>
                              </div>
                              <p className="text-[13px] font-medium" style={{ color: signColor }}>{h.sign}</p>
                              <p className="text-[13px]" style={{ color: "#334155" }}>{h.signDegree.toFixed(1)}°</p>
                              {planetsHere.length > 0 && (
                                <div className="flex gap-1 mt-1.5 flex-wrap">
                                  {planetsHere.map(p => (
                                    <span key={p.name} className="text-[13px]" style={{ color: PLANET_COLORS[p.name] ?? "#94a3b8" }}>
                                      {PLANET_SYMBOLS[p.name]}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ─── ORACLE TAB ────────────────────────────────────────── */}
                  {activeTab === "oracle" && (
                    <div>
                      <SolarReturnOracle
                        natalChart={natalChart}
                        srChart={srChart}
                        profile={profile}
                        year={selectedYear}
                      />
                    </div>
                  )}

                </motion.div>
              )}

              {loading && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 gap-4">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-10 h-10 rounded-full border-2 border-t-transparent" style={{ borderColor: "#f59e0b" }} />
                  <p className="text-[13px]" style={{ color: "#475569" }}>Calculating solar return…</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
