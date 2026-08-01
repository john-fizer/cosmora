"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { PLANET_SYMBOLS, SIGN_SYMBOLS, ZODIAC_SIGNS } from "@/lib/astrology/types";
import type { ChartData, PlanetName, ZodiacSign } from "@/lib/astrology/types";
import type { TransitsData, TransitAspect, Ingress } from "@/lib/astrology/transits";
import { getActiveProfileId, getProfile, getCachedChart } from "@/lib/storage";
import type { StoredProfile } from "@/lib/storage";
import { useWarpTo } from "@/components/ui/WarpTransition";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLANET_COLORS: Record<string, string> = {
  Sun: "#fbbf24", Moon: "#BFB6E8", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#7B6FD4",
  NorthNode: "#64748b", Chiron: "#7B6FD4",
};

const SIGN_COLORS: Record<ZodiacSign, string> = {
  Aries: "#ef4444", Taurus: "#22c55e", Gemini: "#eab308", Cancer: "#38bdf8",
  Leo: "#f97316", Virgo: "#4ade80", Libra: "#facc15", Scorpio: "#dc2626",
  Sagittarius: "#f59e0b", Capricorn: "#94a3b8", Aquarius: "#06b6d4", Pisces: "#7B6FD4",
};

const ASPECT_CONFIG: Record<string, { symbol: string; color: string; label: string }> = {
  conjunction: { symbol: "☌", color: "#9C8AC4", label: "Conjunction" },
  opposition:  { symbol: "☍", color: "#ef4444", label: "Opposition" },
  trine:       { symbol: "△", color: "#22c55e", label: "Trine" },
  square:      { symbol: "□", color: "#f59e0b", label: "Square" },
  sextile:     { symbol: "⚹", color: "#06b6d4", label: "Sextile" },
  quincunx:    { symbol: "⚻", color: "#94a3b8", label: "Quincunx" },
};

// Chaldean order: Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon
const CHALDEAN: PlanetName[] = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"];
// Day rulers: Sunday=Sun, Monday=Moon, etc.
const DAY_RULERS: PlanetName[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

const PLANETARY_HOUR_MEANINGS: Partial<Record<PlanetName, { keywords: string; good: string; avoid: string }>> = {
  Sun:     { keywords: "Vitality · Success · Authority", good: "Leadership decisions, health, recognition", avoid: "Humility-requiring tasks" },
  Moon:    { keywords: "Intuition · Home · Nurturing", good: "Travel, emotional conversations, cooking", avoid: "Starting bold new ventures" },
  Mercury: { keywords: "Communication · Learning · Trade", good: "Writing, contracts, networking, study", avoid: "Lazy thinking, rash decisions" },
  Venus:   { keywords: "Love · Beauty · Pleasure", good: "Art, romance, socializing, luxury", avoid: "Conflict, harsh dealings" },
  Mars:    { keywords: "Action · Courage · Drive", good: "Surgery, exercise, confrontation", avoid: "Important negotiations, signing papers" },
  Jupiter: { keywords: "Expansion · Wisdom · Fortune", good: "Spiritual work, travel, publishing, wealth", avoid: "Pettiness, small-minded tasks" },
  Saturn:  { keywords: "Structure · Discipline · Limits", good: "Study, solitary work, long-term plans", avoid: "Social events, new relationships" },
};

// ─── Planetary Hours ──────────────────────────────────────────────────────────

interface PlanetaryHour {
  planet: PlanetName;
  start: Date;
  end: Date;
  isDay: boolean;
  number: number; // 1–24
}

function computePlanetaryHours(date: Date, lat = 40.0): PlanetaryHour[] {
  // Rough sunrise/sunset from latitude and day of year
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * (Math.PI / 180));
  const hourAngle = Math.acos(-Math.tan(lat * Math.PI / 180) * Math.tan(declination * Math.PI / 180));
  const dayLengthHours = (2 * hourAngle * 180 / Math.PI) / 15;

  const noon = new Date(date);
  noon.setHours(12, 0, 0, 0);
  const sunriseMins = 12 * 60 - (dayLengthHours / 2) * 60;
  const sunsetMins  = 12 * 60 + (dayLengthHours / 2) * 60;

  const dayStart = new Date(date);
  dayStart.setHours(0, Math.round(sunriseMins), 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(0, Math.round(sunsetMins), 0, 0);

  const prevMidnight = new Date(date);
  prevMidnight.setHours(0, 0, 0, 0);
  const nextDayStart = new Date(dayStart);
  nextDayStart.setDate(nextDayStart.getDate() + 1);

  // Hour durations
  const dayMs  = dayEnd.getTime()   - dayStart.getTime();
  const nightMs = (86400000) - dayMs;
  const dayHourMs   = dayMs  / 12;
  const nightHourMs = nightMs / 12;

  // First hour planet index for the day
  const dow = date.getDay(); // 0=Sunday
  const dayRuler = DAY_RULERS[dow];
  const firstIdx = CHALDEAN.indexOf(dayRuler);

  const hours: PlanetaryHour[] = [];

  // Previous night hours (midnight to sunrise today)
  // They belong to yesterday's night — ruled from yesterday's sunset
  const prevDate = new Date(date);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDow = prevDate.getDay();
  const prevDayRuler = DAY_RULERS[prevDow];
  const prevFirstIdx = CHALDEAN.indexOf(prevDayRuler);
  // Yesterday's sunset (approx same duration)
  const prevDayStart = new Date(prevMidnight);
  prevDayStart.setDate(prevDayStart.getDate() - 1);
  prevDayStart.setHours(0, Math.round(sunriseMins), 0, 0);
  const prevDayEnd = new Date(prevMidnight);
  prevDayEnd.setDate(prevDayEnd.getDate() - 1);
  prevDayEnd.setHours(0, Math.round(sunsetMins), 0, 0);

  // Build today's 24 hours (12 day + 12 night):
  // Night hours before sunrise = last 12 of prev night cycle
  // Then 12 day hours
  // Then 12 night hours
  const allHours: PlanetaryHour[] = [];

  // Day hours (1-12)
  for (let i = 0; i < 12; i++) {
    const start = new Date(dayStart.getTime() + i * dayHourMs);
    const end   = new Date(dayStart.getTime() + (i + 1) * dayHourMs);
    const planetIdx = (firstIdx + i) % 7;
    allHours.push({ planet: CHALDEAN[planetIdx], start, end, isDay: true, number: i + 1 });
  }

  // Night hours (13-24)
  for (let i = 0; i < 12; i++) {
    const start = new Date(dayEnd.getTime() + i * nightHourMs);
    const end   = new Date(dayEnd.getTime() + (i + 1) * nightHourMs);
    const planetIdx = (firstIdx + 12 + i) % 7;
    allHours.push({ planet: CHALDEAN[planetIdx], start, end, isDay: false, number: i + 13 });
  }

  return allHours;
}

function getCurrentHour(hours: PlanetaryHour[], now: Date): PlanetaryHour | null {
  const t = now.getTime();
  return hours.find(h => t >= h.start.getTime() && t < h.end.getTime()) ?? null;
}

// ─── Moon phase helpers ───────────────────────────────────────────────────────

function getMoonPhase(moonLon: number, sunLon: number): { name: string; illumination: number; angle: number } {
  const angle = ((moonLon - sunLon) + 360) % 360;
  const idx = Math.floor(angle / 45);
  const names = ["New Moon","Waxing Crescent","First Quarter","Waxing Gibbous","Full Moon","Waning Gibbous","Last Quarter","Waning Crescent"];
  const illumination = ((1 - Math.cos(angle * Math.PI / 180)) / 2) * 100;
  return { name: names[idx], illumination, angle };
}

function MoonOrb({ angle, size = 56 }: { angle: number; size?: number }) {
  const r = size / 2 - 2;
  const cx = size / 2, cy = size / 2;
  const isWaxing = angle < 180;
  const termX = Math.cos(angle * Math.PI / 180) * r;
  const moonColor = "#BFB6E8";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="rgba(196,181,253,0.06)" stroke="rgba(196,181,253,0.2)" strokeWidth={1} />
      <clipPath id={`moonClipBrf-${size}`}>
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      <g clipPath={`url(#moonClipBrf-${size})`}>
        <rect x={cx} y={cy - r} width={r} height={r * 2} fill={isWaxing ? "rgba(196,181,253,0.06)" : moonColor} opacity={isWaxing ? 1 : 0.85} />
        <rect x={cx - r} y={cy - r} width={r} height={r * 2} fill={isWaxing ? moonColor : "rgba(196,181,253,0.06)"} opacity={isWaxing ? 0.85 : 1} />
        <ellipse cx={cx} cy={cy} rx={Math.abs(termX)} ry={r}
          fill={angle < 90 || angle > 270 ? "rgba(196,181,253,0.06)" : moonColor}
          opacity={0.85}
        />
      </g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(196,181,253,0.22)" strokeWidth={1} />
    </svg>
  );
}

// ─── AI Morning Report ────────────────────────────────────────────────────────

function MorningReport({ chart, transitsData, profile }: {
  chart: ChartData;
  transitsData: TransitsData;
  profile: StoredProfile;
}) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [started, setStarted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Synchronous re-entrancy lock. `streaming`/`text` state alone can't gate
  // generate() against React Strict Mode's dev-only double-invoke of mount
  // effects: both invocations read the same pre-render state closure before
  // either state update flushes, so a state-only guard lets both through and
  // fires two concurrent /api/chat streams that interleave into `text`.
  const inFlightRef = useRef(false);

  const generate = useCallback(() => {
    if (inFlightRef.current || streaming || text) return;
    inFlightRef.current = true;
    setStarted(true);
    setStreaming(true);

    const moon = transitsData.transitPlanets.find(p => p.name === "Moon");
    const sun  = transitsData.transitPlanets.find(p => p.name === "Sun");
    const moonPhase = moon && sun ? getMoonPhase(moon.longitude, sun.longitude) : null;

    const topAspects = transitsData.aspects
      .filter(a => a.applying || a.exact)
      .slice(0, 5)
      .map(a => `${a.transitPlanet}${a.transitRetrograde ? " Rx" : ""} ${a.type} natal ${a.natalPlanet} (orb ${a.orb.toFixed(1)}°${a.exact ? " — EXACT" : ""})`)
      .join("; ");

    const ingresses = transitsData.ingresses.slice(0, 3)
      .map(i => `${i.planet} → ${i.toSign} in ${i.daysUntil}d`)
      .join("; ");

    const now = new Date();
    const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const fullDate = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    const prompt = `You are Cosmora, a traditional astrologer delivering a brief, vivid morning cosmic briefing.

PERSON: ${profile.name}
DATE: ${dayName}, ${fullDate}
NATAL: Sun ${chart.planets.find(p => p.name === "Sun")?.sign ?? "?"} H${chart.planets.find(p => p.name === "Sun")?.house ?? "?"}, Moon ${chart.planets.find(p => p.name === "Moon")?.sign ?? "?"}, Rising ${ZODIAC_SIGNS[Math.floor(chart.ascendant / 30)]}
PROFECTION: Age ${chart.annualProfection.age} · H${chart.annualProfection.activatedHouse} · Lord ${chart.annualProfection.lordOfYear}

CURRENT SKY:
- Moon: ${moon?.sign ?? "?"} H${moon?.house ?? "?"}${moon?.retrograde ? " Rx" : ""} — ${moonPhase?.name ?? ""} (${moonPhase?.illumination.toFixed(0) ?? "?"}% illuminated)
- Top applying transits: ${topAspects || "None in tight orb"}
- Upcoming ingresses: ${ingresses || "None imminent"}

Write a personal morning cosmic briefing for ${profile.name}. 3 tight paragraphs:
1. Today's overall tone and dominant sky energy — vivid, atmospheric, specific to the date
2. Most significant transit(s) affecting ${profile.name} personally and what they mean for today
3. One concrete recommendation for how to work with today's cosmic weather

Be specific, poetic but grounded. Max 200 words total. Avoid generic phrases. Plain prose only — no markdown (no **bold**, no *asterisks*); this text is displayed as-is, so emphasize through word choice, not symbols.`;

    // Own this call's controller by local reference, not just via abortRef:
    // if this stream gets cancelled (Strict Mode's phantom double-invoke
    // aborts the first of two calls), its rejection still fires async,
    // *after* the second call has already overwritten abortRef.current. The
    // aborted call must recognize its own cancellation and bail silently
    // instead of touching state that the surviving stream now owns.
    const controller = new AbortController();
    abortRef.current = controller;
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt }),
      signal: controller.signal,
    }).then(async (res) => {
      if (controller.signal.aborted) return;
      if (!res.ok || !res.body) { setStreaming(false); inFlightRef.current = false; return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (controller.signal.aborted) return;
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const payload = part.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const d = JSON.parse(payload) as { text?: string };
            if (d.text) setText(prev => prev + d.text);
          } catch { /* noop */ }
        }
      }
      setStreaming(false);
      inFlightRef.current = false;
    }).catch(() => {
      if (controller.signal.aborted) return;
      setStreaming(false);
      inFlightRef.current = false;
    });
  }, [chart, transitsData, profile, streaming, text]);

  // Auto-generate on mount. Cleanup aborts the in-flight stream AND resets
  // inFlightRef so the effect is properly idempotent: React Strict Mode's
  // dev-only double-invoke (mount → cleanup → mount) cancels the phantom
  // first request and cleanly restarts a single real one, while a genuine
  // unmount (navigating away mid-stream) just cancels for good.
  useEffect(() => {
    generate();
    return () => {
      abortRef.current?.abort();
      inFlightRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(245,158,11,0.03)", border: "1px solid rgba(245,158,11,0.15)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid rgba(245,158,11,0.08)" }}>
        <motion.div
          animate={{ opacity: streaming ? [1, 0.3, 1] : 1 }}
          transition={{ duration: 1.4, repeat: streaming ? Infinity : 0 }}
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: streaming ? "#f59e0b" : "#22c55e" }}
        />
        <span className="text-[13px] font-bold tracking-widest" style={{ color: "#f59e0b" }}>
          ✦ MORNING COSMIC BRIEFING
        </span>
        {streaming && (
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="ml-auto h-px w-16 rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent)" }}
          />
        )}
      </div>

      <div className="px-5 py-5">
        {!text && streaming ? (
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-3 h-3 rounded-full border border-t-transparent flex-shrink-0"
              style={{ borderColor: "#f59e0b" }}
            />
            <span className="text-[14px]" style={{ color: "#475569" }}>Reading the sky for {profile.name}…</span>
          </div>
        ) : (
          <div className="space-y-4">
            {text.split("\n\n").filter(Boolean).map((para, i) => (
              <p key={i} className="text-[16px] leading-relaxed" style={{ color: "#94a3b8" }}>
                {para}
                {streaming && i === text.split("\n\n").filter(Boolean).length - 1 && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.7, repeat: Infinity }}
                    className="inline-block ml-0.5 w-0.5 h-3.5 align-middle rounded-full"
                    style={{ background: "#f59e0b" }}
                  />
                )}
              </p>
            ))}
            {!streaming && text && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => { setText(""); generate(); }}
                className="text-[13px] font-bold tracking-widest cursor-pointer px-3 py-1.5 rounded-lg mt-1"
                style={{ background: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}
              >
                REGENERATE
              </motion.button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Planetary Hours Panel ────────────────────────────────────────────────────

function PlanetaryHoursPanel({ lat }: { lat: number }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hours = computePlanetaryHours(now, lat);
  const current = getCurrentHour(hours, now);
  const meaning = current ? PLANETARY_HOUR_MEANINGS[current.planet] : null;

  const remainingMs = current ? current.end.getTime() - now.getTime() : 0;
  const remainMins  = Math.floor(remainingMs / 60000);
  const remainSecs  = Math.floor((remainingMs % 60000) / 1000);

  // Show current + next 5 hours
  const currentIdx = hours.findIndex(h => h === current);
  const visibleHours = hours.slice(Math.max(0, currentIdx - 1), currentIdx + 7);

  const fmtTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(4,4,28,0.6)" }}>
      {/* Current hour hero */}
      {current && (
        <div
          className="flex items-center gap-4 px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: `${PLANET_COLORS[current.planet]}08` }}
        >
          <div
            className="flex items-center justify-center w-12 h-12 rounded-2xl flex-shrink-0"
            style={{
              background: `${PLANET_COLORS[current.planet]}15`,
              border: `1px solid ${PLANET_COLORS[current.planet]}35`,
              boxShadow: `0 0 24px ${PLANET_COLORS[current.planet]}20`,
            }}
          >
            <span className="text-2xl" style={{ color: PLANET_COLORS[current.planet] }}>
              {PLANET_SYMBOLS[current.planet]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold tracking-widest" style={{ color: "#334155" }}>
                {current.isDay ? "DAY" : "NIGHT"} HOUR {current.number <= 12 ? current.number : current.number - 12}
              </span>
              <span className="text-[13px] px-1.5 py-0.5 rounded" style={{ background: `${PLANET_COLORS[current.planet]}15`, color: PLANET_COLORS[current.planet] }}>
                ACTIVE
              </span>
            </div>
            <p className="text-base font-bold mt-0.5" style={{ color: PLANET_COLORS[current.planet] }}>
              Hour of {current.planet}
            </p>
            {meaning && (
              <p className="text-[14px] mt-0.5" style={{ color: "#64748b" }}>{meaning.keywords}</p>
            )}
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-[13px] tracking-widest mb-0.5" style={{ color: "#334155" }}>ENDS IN</p>
            <p className="text-lg font-mono font-bold tabular-nums" style={{ color: PLANET_COLORS[current.planet] }}>
              {String(remainMins).padStart(2, "0")}:{String(remainSecs).padStart(2, "0")}
            </p>
            <p className="text-[13px]" style={{ color: "#334155" }}>{fmtTime(current.end)}</p>
          </div>
        </div>
      )}

      {/* Good for / Avoid */}
      {meaning && (
        <div className="grid grid-cols-2 gap-3 px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div>
            <p className="text-[14px] font-bold tracking-widest mb-1.5" style={{ color: "#22c55e" }}>✓ GOOD FOR</p>
            <p className="text-[14px] leading-relaxed" style={{ color: "#64748b" }}>{meaning.good}</p>
          </div>
          <div>
            <p className="text-[14px] font-bold tracking-widest mb-1.5" style={{ color: "#ef4444" }}>✗ AVOID</p>
            <p className="text-[14px] leading-relaxed" style={{ color: "#64748b" }}>{meaning.avoid}</p>
          </div>
        </div>
      )}

      {/* Hour sequence */}
      <div className="px-4 py-3">
        <p className="text-[13px] font-bold tracking-widest mb-2" style={{ color: "#334155" }}>HOUR SEQUENCE</p>
        <div className="space-y-1">
          {visibleHours.map((h, i) => {
            const isCurrent = h === current;
            const isPast = h.end.getTime() < now.getTime();
            const color = PLANET_COLORS[h.planet] ?? "#64748b";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{
                  background: isCurrent ? `${color}12` : isPast ? "transparent" : "rgba(255,255,255,0.015)",
                  border: isCurrent ? `1px solid ${color}30` : "1px solid transparent",
                  opacity: isPast ? 0.35 : 1,
                }}
              >
                <span className="text-[14px] w-5 text-center flex-shrink-0" style={{ color }}>{PLANET_SYMBOLS[h.planet]}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[14px] font-medium" style={{ color: isCurrent ? color : "#64748b" }}>
                    {h.planet}
                  </span>
                  {isCurrent && <span className="ml-1.5 text-[14px] font-bold tracking-widest" style={{ color }}>NOW</span>}
                </div>
                <span className="text-[13px] font-mono flex-shrink-0" style={{ color: "#334155" }}>
                  {fmtTime(h.start)} – {fmtTime(h.end)}
                </span>
                <span className="text-[14px] w-4 text-right flex-shrink-0" style={{ color: h.isDay ? "#fbbf24" : "#BFB6E8" }}>
                  {h.isDay ? "☀" : "☽"}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Transit Snapshot ─────────────────────────────────────────────────────────

function TransitSnapshot({ aspects, warpTo }: { aspects: TransitAspect[]; warpTo: (href: string) => void }) {
  const top = aspects
    .filter(a => (a.applying || a.exact) && (a.daysToExact === null || a.daysToExact <= 14))
    .sort((a, b) => (a.daysToExact ?? 999) - (b.daysToExact ?? 999))
    .slice(0, 6);

  if (top.length === 0) {
    return <p className="text-[13px]" style={{ color: "#334155" }}>No close applying transits.</p>;
  }

  return (
    <div className="space-y-2">
      {top.map((asp, i) => {
        const tColor = PLANET_COLORS[asp.transitPlanet] ?? "#64748b";
        const nColor = PLANET_COLORS[asp.natalPlanet] ?? "#64748b";
        const cfg = ASPECT_CONFIG[asp.type];
        const days = asp.daysToExact;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => warpTo(`/dashboard/chart/${asp.natalPlanet.toLowerCase()}`)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer"
            style={{
              background: asp.exact ? `${cfg?.color ?? "#64748b"}10` : "rgba(255,255,255,0.02)",
              border: asp.exact ? `1px solid ${cfg?.color ?? "#64748b"}30` : "1px solid rgba(255,255,255,0.05)",
              borderLeft: `2px solid ${cfg?.color ?? "#64748b"}${asp.exact ? "cc" : "50"}`,
            }}
          >
            <span className="text-base flex-shrink-0" style={{ color: tColor }}>{PLANET_SYMBOLS[asp.transitPlanet]}</span>
            <span className="text-lg font-bold flex-shrink-0" style={{ color: cfg?.color ?? "#64748b" }}>{cfg?.symbol}</span>
            <span className="text-base flex-shrink-0" style={{ color: nColor }}>{PLANET_SYMBOLS[asp.natalPlanet]}</span>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate" style={{ color: "#94a3b8" }}>
                {asp.transitPlanet}{asp.transitRetrograde ? " ℞" : ""} {asp.type} natal {asp.natalPlanet}
              </p>
              <p className="text-[13px]" style={{ color: "#475569" }}>
                {SIGN_SYMBOLS[asp.transitSign]} {asp.transitSign} · orb {asp.orb.toFixed(1)}°
              </p>
            </div>

            <div className="flex-shrink-0 text-right">
              {asp.exact ? (
                <span className="text-[13px] font-black px-2 py-1 rounded-lg" style={{ background: `${cfg?.color}20`, color: cfg?.color }}>
                  EXACT
                </span>
              ) : days !== null ? (
                <div>
                  <span className="text-[14px] font-bold" style={{ color: "#22c55e" }}>{days}</span>
                  <span className="text-[13px] ml-0.5" style={{ color: "#334155" }}>d</span>
                </div>
              ) : null}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Upcoming Ingresses ───────────────────────────────────────────────────────

function IngressBadges({ ingresses }: { ingresses: Ingress[] }) {
  const near = ingresses.filter(i => i.daysUntil <= 30).slice(0, 4);
  if (near.length === 0) return <p className="text-[13px]" style={{ color: "#334155" }}>No ingresses in 30 days.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {near.map((ing, i) => {
        const pColor = PLANET_COLORS[ing.planet] ?? "#64748b";
        const sColor = SIGN_COLORS[ing.toSign] ?? "#64748b";
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: `${pColor}0d`, border: `1px solid ${pColor}20` }}
          >
            <span className="text-[14px]" style={{ color: pColor }}>{PLANET_SYMBOLS[ing.planet as PlanetName]}</span>
            <span className="text-[13px]" style={{ color: "#475569" }}>→</span>
            <span className="text-[14px]" style={{ color: sColor }}>{SIGN_SYMBOLS[ing.toSign]}</span>
            <div>
              <p className="text-[13px] font-bold" style={{ color: pColor }}>
                {ing.planet}{ing.retrograde ? " ℞" : ""} → {ing.toSign}
              </p>
              <p className="text-[13px]" style={{ color: "#334155" }}>
                in {ing.daysUntil} day{ing.daysUntil !== 1 ? "s" : ""}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── 7-Day Forecast ──────────────────────────────────────────────────────────

interface ForecastDay {
  date: Date;
  dayRuler: PlanetName;
  moonSign: ZodiacSign;
  dayIngresses: Ingress[];
  isToday: boolean;
}

function buildWeekForecast(now: Date, moonLon: number, ingresses: Ingress[]): ForecastDay[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayRuler = DAY_RULERS[date.getDay()];
    // Moon moves ~13.176° per day
    const approxMoonLon = (moonLon + i * 13.176) % 360;
    const moonSign = ZODIAC_SIGNS[Math.floor(approxMoonLon / 30)] as ZodiacSign;
    const dayIngresses = ingresses.filter(ing => ing.daysUntil === i || ing.daysUntil === i - 1);
    return { date, dayRuler, moonSign, dayIngresses, isToday: i === 0 };
  });
}

const DAY_SHORT = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

function WeekForecast({ now, moonLon, ingresses, warpTo }: {
  now: Date;
  moonLon: number;
  ingresses: Ingress[];
  warpTo: (href: string) => void;
}) {
  const days = buildWeekForecast(now, moonLon, ingresses);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(4,4,28,0.5)" }}
    >
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const rulerColor = PLANET_COLORS[day.dayRuler] ?? "#64748b";
          const moonColor = SIGN_COLORS[day.moonSign];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-col items-center gap-2 py-4 px-1 cursor-pointer transition-all duration-150"
              onClick={() => warpTo("/dashboard/transits")}
              style={{
                background: day.isToday ? "rgba(123,111,212,0.12)" : "transparent",
                borderRight: i < 6 ? "1px solid rgba(255,255,255,0.04)" : "none",
                borderBottom: day.dayIngresses.length > 0 ? `2px solid ${rulerColor}40` : "none",
              }}
            >
              {/* Day name */}
              <span className="text-[14px] font-bold tracking-widest" style={{ color: day.isToday ? "#a78bfa" : "#334155" }}>
                {DAY_SHORT[day.date.getDay()]}
              </span>

              {/* Date number */}
              <span
                className="text-[13px] font-bold"
                style={{ color: day.isToday ? "#e2e8f0" : "#475569" }}
              >
                {day.date.getDate()}
              </span>

              {/* Day ruler */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  background: `${rulerColor}12`,
                  border: `1px solid ${rulerColor}25`,
                  boxShadow: day.isToday ? `0 0 10px ${rulerColor}30` : "none",
                }}
              >
                <span className="text-[14px]" style={{ color: rulerColor }}>{PLANET_SYMBOLS[day.dayRuler]}</span>
              </div>

              {/* Moon sign */}
              <span className="text-[14px]" style={{ color: moonColor }} title={`Moon in ${day.moonSign}`}>
                {SIGN_SYMBOLS[day.moonSign]}
              </span>

              {/* Ingress dots */}
              {day.dayIngresses.length > 0 ? (
                <div className="flex flex-col gap-0.5 items-center">
                  {day.dayIngresses.slice(0, 2).map((ing, j) => (
                    <div
                      key={j}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: PLANET_COLORS[ing.planet] ?? "#64748b" }}
                      title={`${ing.planet} → ${ing.toSign}`}
                    />
                  ))}
                </div>
              ) : (
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div
        className="flex items-center gap-4 px-4 py-2 flex-wrap"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: "rgba(123,111,212,0.2)" }}>
            <span className="text-[13px]" style={{ color: "#a78bfa" }}>☉</span>
          </div>
          <span className="text-[14px]" style={{ color: "#334155" }}>Day ruler</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[14px]" style={{ color: "#BFB6E8" }}>♈</span>
          <span className="text-[14px]" style={{ color: "#334155" }}>Moon sign (approx)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#f59e0b" }} />
          <span className="text-[14px]" style={{ color: "#334155" }}>Planet ingress</span>
        </div>
      </div>
    </div>
  );
}

// ─── Dignity Leaderboard ─────────────────────────────────────────────────────

const DIGNITY_SCORES: Record<string, number> = {
  domicile:   5,
  exaltation: 4,
  triplicity: 3,
  peregrine:  0,
  fall:      -4,
  detriment: -5,
};

const DIGNITY_COLORS: Record<string, string> = {
  domicile:   "#22c55e",
  exaltation: "#fbbf24",
  triplicity: "#06b6d4",
  peregrine:  "#475569",
  fall:       "#f97316",
  detriment:  "#ef4444",
};

const DIGNITY_LABELS: Record<string, string> = {
  domicile:   "Domicile",
  exaltation: "Exalted",
  triplicity: "Triplicity",
  peregrine:  "Peregrine",
  fall:       "Fall",
  detriment:  "Detriment",
};

function DignityLeaderboard({ chart }: { chart: ChartData }) {
  const CORE_PLANETS: PlanetName[] = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn"];
  const scoredPlanets = CORE_PLANETS.map(name => {
    const planet = chart.planets.find(p => p.name === name);
    const dignity = planet?.dignity ?? "peregrine";
    const score = DIGNITY_SCORES[dignity] ?? 0;
    return { name, planet, dignity, score, color: PLANET_COLORS[name] ?? "#64748b" };
  }).sort((a, b) => b.score - a.score);

  const maxAbs = 5;
  const chartStrength = Math.round(scoredPlanets.reduce((s, p) => s + p.score, 0));
  const strengthColor = chartStrength > 8 ? "#22c55e" : chartStrength > 0 ? "#06b6d4" : chartStrength > -8 ? "#f97316" : "#ef4444";
  const strengthLabel = chartStrength > 8 ? "Strong" : chartStrength > 0 ? "Mixed" : chartStrength > -8 ? "Challenged" : "Very Challenged";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(4,4,28,0.6)" }}
    >
      {/* Header with overall score */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <span className="text-[13px] font-bold tracking-widest" style={{ color: "#334155" }}>ESSENTIAL DIGNITIES · 7 TRADITIONAL PLANETS</span>
        <div className="flex items-center gap-2">
          <span className="text-[13px]" style={{ color: "#334155" }}>CHART SCORE</span>
          <span
            className="text-[14px] font-bold px-2 py-0.5 rounded-lg"
            style={{ background: `${strengthColor}15`, color: strengthColor, border: `1px solid ${strengthColor}30` }}
          >
            {chartStrength > 0 ? "+" : ""}{chartStrength} · {strengthLabel}
          </span>
        </div>
      </div>

      {/* Planet bars */}
      <div className="px-5 py-4 space-y-3">
        {scoredPlanets.map((p, i) => {
          const dignity = p.dignity ?? "peregrine";
          const dColor = DIGNITY_COLORS[dignity] ?? "#475569";
          const barWidth = Math.abs(p.score / maxAbs) * 100;
          const isPositive = p.score >= 0;
          return (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3"
            >
              {/* Planet */}
              <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                <span className="text-base" style={{ color: p.color }}>{PLANET_SYMBOLS[p.name]}</span>
                <span className="text-[13px] font-medium" style={{ color: "#64748b" }}>{p.name}</span>
              </div>

              {/* Bar */}
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 relative h-5 rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ delay: i * 0.05 + 0.3, duration: 0.5, ease: "easeOut" }}
                    className="absolute top-0 bottom-0 rounded-lg"
                    style={{
                      [isPositive ? "left" : "right"]: 0,
                      background: `linear-gradient(90deg, ${dColor}60, ${dColor})`,
                      boxShadow: `0 0 8px ${dColor}40`,
                    }}
                  />
                  {/* Center line */}
                  <div className="absolute inset-y-0 left-1/2 w-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                </div>

                {/* Score + dignity label */}
                <div className="flex-shrink-0 flex items-center gap-2 w-28">
                  <span
                    className="text-[13px] font-bold w-6 text-right tabular-nums"
                    style={{ color: dColor }}
                  >
                    {p.score > 0 ? "+" : ""}{p.score}
                  </span>
                  <span
                    className="text-[13px] px-1.5 py-0.5 rounded"
                    style={{ background: `${dColor}12`, color: dColor }}
                  >
                    {DIGNITY_LABELS[dignity] ?? dignity}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div
        className="flex flex-wrap gap-3 px-5 py-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        {[
          { label: "Domicile +5", color: "#22c55e" },
          { label: "Exalted +4", color: "#fbbf24" },
          { label: "Peregrine 0", color: "#475569" },
          { label: "Fall −4", color: "#f97316" },
          { label: "Detriment −5", color: "#ef4444" },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-[14px]" style={{ color: "#334155" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[13px] font-bold tracking-[0.2em]" style={{ color: "#06b6d4" }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, rgba(6,182,212,0.2), transparent)" }} />
      {sub && <span className="text-[13px]" style={{ color: "#334155" }}>{sub}</span>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BriefingPage() {
  const warpTo = useWarpTo();
  const [chart, setChart] = useState<ChartData | null>(null);
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [transitsData, setTransitsData] = useState<TransitsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setLoading(false); return; }
    const prof = getProfile(id);
    const cached = getCachedChart(id);
    setProfile(prof);
    setChart(cached);

    if (cached) {
      fetch("/api/transits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ natal: cached, date: new Date().toISOString() }),
      }).then(r => r.ok ? r.json() : null).then(d => {
        if (d) setTransitsData(d as TransitsData);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const moon = transitsData?.transitPlanets.find(p => p.name === "Moon");
  const sun  = transitsData?.transitPlanets.find(p => p.name === "Sun");
  const moonPhase = moon && sun ? getMoonPhase(moon.longitude, sun.longitude) : null;

  // Void of Course
  const moonAspects = (transitsData?.aspects ?? []).filter(a =>
    a.transitPlanet === "Moon" && a.applying && a.daysToExact !== null
  );
  const isVoid = transitsData !== null && moonAspects.length === 0;

  // Planetary Hours (use profile lat if available)
  const lat = profile?.latitude ?? 40.0;

  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });

  if (!loading && !chart) {
    return (
      <div className="h-screen flex overflow-hidden">
        <DashboardBg />
        <div className="nebula-orb" style={{ width: 500, height: 500, left: "20%", top: "5%", background: "rgba(123,111,212,0.07)", filter: "blur(100px)" }} />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 md:ml-[68px] mb-[60px] md:mb-0 px-6">
          <motion.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-2xl flex items-center justify-center"
            style={{ width: 72, height: 72, background: "linear-gradient(135deg, rgba(123,111,212,0.22), rgba(6,182,212,0.14))", border: "1px solid rgba(123,111,212,0.35)", boxShadow: "0 0 48px rgba(123,111,212,0.18)" }}
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="14" stroke="rgba(123,111,212,0.6)" strokeWidth="1"/>
              <circle cx="18" cy="18" r="8" stroke="rgba(6,182,212,0.5)" strokeWidth="0.75"/>
              <line x1="18" y1="4" x2="18" y2="32" stroke="rgba(123,111,212,0.35)" strokeWidth="0.75"/>
              <line x1="4" y1="18" x2="32" y2="18" stroke="rgba(123,111,212,0.35)" strokeWidth="0.75"/>
              <circle cx="18" cy="18" r="2.5" fill="rgba(6,182,212,0.8)"/>
            </svg>
          </motion.div>
          <div className="text-center">
            <p className="text-[14px] font-bold tracking-[0.2em] mb-2" style={{ color: "#334155" }}>NO CHART DATA</p>
            <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "Space Grotesk, sans-serif", color: "#e2e8f0" }}>Cosmic instruments standing by.</h2>
            <p className="text-[15px] max-w-xs mx-auto" style={{ color: "#475569" }}>Enter your birth data to unlock your daily briefing and all its cosmic layers.</p>
          </div>
          <Link href="/onboarding">
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="px-6 py-3 rounded-xl text-[14px] font-bold tracking-wider cursor-pointer"
              style={{ background: "linear-gradient(135deg, #7B6FD4, #7B6FD4)", color: "white", border: "1px solid rgba(123,111,212,0.4)" }}
            >
              Begin Your Chart →
            </motion.button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <DashboardBg />
      <div className="nebula-orb" style={{ width: 600, height: 600, left: "-5%", top: "-10%", background: "rgba(245,158,11,0.04)", filter: "blur(120px)" }} />
      <div className="nebula-orb" style={{ width: 400, height: 400, right: "5%", bottom: "0%", background: "rgba(123,111,212,0.05)", filter: "blur(90px)" }} />


      <div className="flex-1 flex flex-col min-h-0 min-w-0 md:ml-[68px] mb-[60px] md:mb-0 relative z-10 overflow-x-hidden">

        {/* Top bar */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-shrink-0 flex items-center justify-between px-5 py-3 gap-4"
          style={{
            borderBottom: "1px solid rgba(245,158,11,0.12)",
            background: "rgba(2,2,18,0.8)",
            backdropFilter: "blur(20px)",
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
            <span className="text-[13px] font-bold tracking-widest" style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              DAILY BRIEFING
            </span>
          </div>

          {/* Live clock */}
          <div className="text-right hidden md:block">
            <p className="text-[13px] font-mono font-bold tabular-nums" style={{ color: "#475569" }}>{timeStr}</p>
            <p className="text-[13px] tracking-widest" style={{ color: "#1e293b" }}>{dayName.toUpperCase()} · {dateStr.toUpperCase()}</p>
          </div>
        </motion.div>

        {/* Main scroll area */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 rounded-full border-2 border-t-transparent"
              style={{ borderColor: "#f59e0b" }}
            />
            <p className="text-[13px] tracking-widest" style={{ color: "#475569" }}>READING THE SKY</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            <div className="px-5 py-5 max-w-4xl mx-auto space-y-8">

              {/* ─── Hero: Moon + Profection ─────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid md:grid-cols-3 gap-4"
              >
                {/* Moon phase card */}
                {moon && moonPhase && (
                  <div
                    className="md:col-span-1 rounded-2xl p-5 flex flex-col items-center gap-3"
                    style={{
                      background: "rgba(196,181,253,0.04)",
                      border: "1px solid rgba(196,181,253,0.12)",
                    }}
                  >
                    <MoonOrb angle={moonPhase.angle} size={72} />
                    <div className="text-center">
                      <p className="text-[14px] font-bold" style={{ color: "#BFB6E8" }}>{moonPhase.name}</p>
                      <p className="text-[13px] mt-0.5" style={{ color: "#475569" }}>
                        {moonPhase.illumination.toFixed(0)}% illuminated
                      </p>
                      <p className="text-[13px] mt-0.5" style={{ color: "#64748b" }}>
                        ☽ {SIGN_SYMBOLS[moon.sign]} {moon.sign} H{moon.house}
                      </p>
                    </div>
                    {/* Void indicator */}
                    <div
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{
                        background: isVoid ? "rgba(249,115,22,0.08)" : "rgba(34,197,94,0.06)",
                        border: `1px solid ${isVoid ? "rgba(249,115,22,0.25)" : "rgba(34,197,94,0.15)"}`,
                      }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: isVoid ? "#f97316" : "#22c55e" }} />
                      <div>
                        <p className="text-[13px] font-bold" style={{ color: isVoid ? "#f97316" : "#22c55e" }}>
                          {isVoid ? "Void of Course" : "Moon Active"}
                        </p>
                        <p className="text-[14px]" style={{ color: "#475569" }}>
                          {isVoid ? "Avoid major decisions" : `${moonAspects.length} applying aspects`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Today's context: profection + sect */}
                {chart && (
                  <div
                    className="md:col-span-2 rounded-2xl p-5 flex flex-col justify-between"
                    style={{
                      background: "rgba(123,111,212,0.06)",
                      border: "1px solid rgba(123,111,212,0.15)",
                    }}
                  >
                    <div>
                      <p className="text-[13px] font-bold tracking-widest mb-2" style={{ color: "#7B6FD4" }}>
                        TODAY'S CONTEXT
                      </p>
                      <div className="flex items-start gap-4 flex-wrap">
                        <div>
                          <p className="text-[13px] tracking-widest mb-1" style={{ color: "#334155" }}>PROFECTION YEAR</p>
                          <p className="text-[14px] font-bold" style={{ color: "#a78bfa" }}>
                            Age {chart.annualProfection.age} · House {chart.annualProfection.activatedHouse}
                          </p>
                          <p className="text-[13px]" style={{ color: "#64748b" }}>
                            Lord: {PLANET_SYMBOLS[chart.annualProfection.lordOfYear]} {chart.annualProfection.lordOfYear}
                          </p>
                        </div>
                        <div>
                          <p className="text-[13px] tracking-widest mb-1" style={{ color: "#334155" }}>SECT</p>
                          <p className="text-[14px] font-bold" style={{ color: chart.sect === "day" ? "#fbbf24" : "#BFB6E8" }}>
                            {chart.sect === "day" ? "☀ Day Chart" : "☽ Night Chart"}
                          </p>
                        </div>
                        {sun && (
                          <div>
                            <p className="text-[13px] tracking-widest mb-1" style={{ color: "#334155" }}>SUN NOW</p>
                            <p className="text-[14px] font-bold" style={{ color: "#fbbf24" }}>
                              ☉ {SIGN_SYMBOLS[sun.sign]} {sun.sign}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Active transit planets row */}
                    {transitsData && (
                      <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(123,111,212,0.08)" }}>
                        <p className="text-[13px] tracking-widest mb-2" style={{ color: "#334155" }}>SKY SNAPSHOT</p>
                        <div className="flex flex-wrap gap-2">
                          {transitsData.transitPlanets.slice(0, 7).map(p => {
                            const color = PLANET_COLORS[p.name] ?? "#64748b";
                            return (
                              <div
                                key={p.name}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                                style={{ background: `${color}10`, border: `1px solid ${color}20` }}
                              >
                                <span className="text-[14px]" style={{ color }}>{PLANET_SYMBOLS[p.name as PlanetName]}</span>
                                <span className="text-[13px]" style={{ color: SIGN_COLORS[p.sign] }}>{SIGN_SYMBOLS[p.sign]}</span>
                                {p.retrograde && <span className="text-[14px]" style={{ color: "#f97316" }}>℞</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* ─── Morning Report (AI) ─────────────────────────────────── */}
              {chart && transitsData && profile && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <MorningReport chart={chart} transitsData={transitsData} profile={profile} />
                </motion.div>
              )}

              {/* ─── Planetary Hours ─────────────────────────────────────── */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <SectionLabel label="PLANETARY HOURS" sub="Traditional Chaldean timing" />
                <PlanetaryHoursPanel lat={lat} />
              </motion.div>

              {/* ─── Applying Transits ───────────────────────────────────── */}
              {transitsData && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                  <SectionLabel label="APPLYING TRANSITS" sub="Personal transits within 14 days" />
                  <TransitSnapshot aspects={transitsData.aspects} warpTo={warpTo} />
                </motion.div>
              )}

              {/* ─── Upcoming Ingresses ──────────────────────────────────── */}
              {transitsData && transitsData.ingresses.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <SectionLabel label="UPCOMING SIGN CHANGES" sub="Next 30 days" />
                  <IngressBadges ingresses={transitsData.ingresses} />
                </motion.div>
              )}

              {/* ─── 7-Day Forecast ─────────────────────────────────────── */}
              {transitsData && moon && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }}>
                  <SectionLabel label="7-DAY FORECAST" sub="Day rulers · Moon signs · Ingresses" />
                  <WeekForecast
                    now={now}
                    moonLon={moon.longitude}
                    ingresses={transitsData.ingresses}
                    warpTo={warpTo}
                  />
                </motion.div>
              )}

              {/* ─── Dignity Leaderboard ────────────────────────────────── */}
              {chart && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
                  <SectionLabel label="CHART STRENGTH" sub="Essential dignities of the 7 traditional planets" />
                  <DignityLeaderboard chart={chart} />
                </motion.div>
              )}

              {/* ─── Quick Links ─────────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="pb-6"
              >
                <SectionLabel label="EXPLORE" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Full Transits", href: "/dashboard/transits", icon: "⊙", color: "#7B6FD4" },
                    { label: "Oracle Chat",   href: "/dashboard/oracle",   icon: "◈", color: "#9C8AC4" },
                    { label: "Timeline",      href: "/dashboard/timeline",  icon: "◷", color: "#06b6d4" },
                    { label: "Natal Chart",   href: "/dashboard/chart",    icon: "◎", color: "#fbbf24" },
                  ].map(item => (
                    <Link key={item.href} href={item.href}>
                      <motion.div
                        whileHover={{ y: -3, boxShadow: `0 0 24px ${item.color}20` }}
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-2.5 px-4 py-3 rounded-xl cursor-pointer"
                        style={{ background: `${item.color}0d`, border: `1px solid ${item.color}20` }}
                      >
                        <span className="text-lg" style={{ color: item.color }}>{item.icon}</span>
                        <span className="text-[13px] font-semibold" style={{ color: "#94a3b8" }}>{item.label}</span>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </motion.div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

