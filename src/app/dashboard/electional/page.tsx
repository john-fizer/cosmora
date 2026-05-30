"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { PLANET_SYMBOLS, SIGN_SYMBOLS, ZODIAC_SIGNS } from "@/lib/astrology/types";
import type { ChartData, PlanetName, ZodiacSign } from "@/lib/astrology/types";
import type { TransitsData } from "@/lib/astrology/transits";
import { getActiveProfileId, getProfile, getCachedChart } from "@/lib/storage";
import type { StoredProfile } from "@/lib/storage";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLANET_COLORS: Record<string, string> = {
  Sun: "#fbbf24", Moon: "#c4b5fd", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#8b5cf6",
};

const SIGN_COLORS: Record<ZodiacSign, string> = {
  Aries: "#ef4444", Taurus: "#22c55e", Gemini: "#eab308", Cancer: "#38bdf8",
  Leo: "#f97316", Virgo: "#4ade80", Libra: "#facc15", Scorpio: "#dc2626",
  Sagittarius: "#f59e0b", Capricorn: "#94a3b8", Aquarius: "#06b6d4", Pisces: "#8b5cf6",
};

// Chaldean order
const CHALDEAN: PlanetName[] = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"];
const DAY_RULERS: PlanetName[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

// ─── Activity definitions ─────────────────────────────────────────────────────

interface Activity {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  bestPlanets: PlanetName[];
  avoidPlanets: PlanetName[];
  bestMoonSigns: ZodiacSign[];
  avoidVoid: boolean;
  avoidMoonSigns?: ZodiacSign[];
  tips: string[];
}

const ACTIVITIES: Activity[] = [
  {
    id: "business",
    name: "Business & Career",
    icon: "⬡",
    color: "#fbbf24",
    description: "Starting ventures, signing contracts, making deals",
    bestPlanets: ["Sun", "Jupiter", "Mercury"],
    avoidPlanets: ["Saturn", "Mars"],
    bestMoonSigns: ["Aries", "Leo", "Capricorn", "Taurus"],
    avoidVoid: true,
    avoidMoonSigns: ["Cancer", "Pisces"],
    tips: [
      "Avoid void of course Moon for signings",
      "Jupiter hours favor expansion and luck",
      "Sun hours suit leadership and visibility",
    ],
  },
  {
    id: "romance",
    name: "Love & Romance",
    icon: "♡",
    color: "#f472b6",
    description: "First dates, confessions, deepening bonds",
    bestPlanets: ["Venus", "Moon", "Jupiter"],
    avoidPlanets: ["Saturn", "Mars"],
    bestMoonSigns: ["Taurus", "Libra", "Cancer", "Pisces"],
    avoidVoid: true,
    avoidMoonSigns: ["Aries", "Capricorn", "Scorpio"],
    tips: [
      "Venus hours are ideal for romance",
      "Moon in Libra or Taurus heightens attraction",
      "Avoid Moon in Aries for delicate conversations",
    ],
  },
  {
    id: "legal",
    name: "Legal & Contracts",
    icon: "§",
    color: "#a78bfa",
    description: "Signing documents, court dates, negotiations",
    bestPlanets: ["Mercury", "Jupiter", "Sun"],
    avoidPlanets: ["Mercury", "Saturn"],
    bestMoonSigns: ["Gemini", "Virgo", "Libra", "Capricorn"],
    avoidVoid: true,
    avoidMoonSigns: ["Pisces", "Sagittarius"],
    tips: [
      "Never sign during void of course Moon",
      "Mercury Rx: avoid signing contracts",
      "Libra Moon supports fairness and balance",
    ],
  },
  {
    id: "health",
    name: "Health & Wellness",
    icon: "✚",
    color: "#22c55e",
    description: "Surgery, doctor visits, starting health routines",
    bestPlanets: ["Sun", "Moon", "Jupiter"],
    avoidPlanets: ["Mars", "Saturn"],
    bestMoonSigns: ["Virgo", "Capricorn", "Taurus"],
    avoidVoid: false,
    avoidMoonSigns: ["Aries", "Scorpio", "Pisces"],
    tips: [
      "Avoid surgery on the Moon's sign ruling that body part",
      "Waxing Moon supports building; Waning for healing",
      "Virgo Moon favors health routines and clean eating",
    ],
  },
  {
    id: "travel",
    name: "Travel & Adventure",
    icon: "◈",
    color: "#06b6d4",
    description: "Starting journeys, booking trips, exploration",
    bestPlanets: ["Jupiter", "Mercury", "Sun"],
    avoidPlanets: ["Saturn", "Mars"],
    bestMoonSigns: ["Sagittarius", "Gemini", "Aquarius", "Aries"],
    avoidVoid: false,
    avoidMoonSigns: ["Cancer", "Capricorn"],
    tips: [
      "Jupiter hours favor long distance and foreign travel",
      "Sagittarius Moon expands the spirit of adventure",
      "Gemini Moon suits short trips and local exploration",
    ],
  },
  {
    id: "creative",
    name: "Creative Projects",
    icon: "✦",
    color: "#f59e0b",
    description: "Art, music, writing, inspired work",
    bestPlanets: ["Venus", "Moon", "Neptune", "Jupiter"],
    avoidPlanets: ["Saturn", "Mars"],
    bestMoonSigns: ["Pisces", "Cancer", "Libra", "Leo"],
    avoidVoid: false,
    avoidMoonSigns: ["Capricorn", "Aquarius"],
    tips: [
      "Venus hours inspire artistic flow",
      "Pisces Moon deepens imagination",
      "Moon in Leo brings performative energy",
    ],
  },
  {
    id: "financial",
    name: "Financial Decisions",
    icon: "◎",
    color: "#4ade80",
    description: "Investments, spending, saving, financial planning",
    bestPlanets: ["Jupiter", "Venus", "Sun"],
    avoidPlanets: ["Saturn", "Mars"],
    bestMoonSigns: ["Taurus", "Capricorn", "Virgo"],
    avoidVoid: true,
    avoidMoonSigns: ["Scorpio", "Pisces"],
    tips: [
      "Taurus Moon supports stability and wealth-building",
      "Avoid investing during Saturn hours for risk aversion",
      "Jupiter hours expand financial opportunities",
    ],
  },
  {
    id: "spiritual",
    name: "Spiritual Practice",
    icon: "⊹",
    color: "#818cf8",
    description: "Meditation, ritual, prayer, shadow work",
    bestPlanets: ["Moon", "Saturn", "Neptune", "Jupiter"],
    avoidPlanets: ["Mars", "Sun"],
    bestMoonSigns: ["Pisces", "Scorpio", "Cancer", "Virgo"],
    avoidVoid: false,
    avoidMoonSigns: ["Aries", "Leo"],
    tips: [
      "Saturn hours suit discipline and solitary practice",
      "Moon hours deepen receptivity and intuition",
      "Scorpio Moon intensifies shadow work",
    ],
  },
];

// ─── Planetary Hours ──────────────────────────────────────────────────────────

interface PlanetaryHour {
  planet: PlanetName;
  start: Date;
  end: Date;
  isDay: boolean;
  number: number;
}

function computePlanetaryHours(date: Date, lat = 40.0): PlanetaryHour[] {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * (Math.PI / 180));
  const hourAngle = Math.acos(Math.max(-1, Math.min(1, -Math.tan(lat * Math.PI / 180) * Math.tan(declination * Math.PI / 180))));
  const dayLengthHours = (2 * hourAngle * 180 / Math.PI) / 15;

  const sunriseMins = 12 * 60 - (dayLengthHours / 2) * 60;
  const sunsetMins  = 12 * 60 + (dayLengthHours / 2) * 60;

  const dayStart = new Date(date);
  dayStart.setHours(0, Math.round(sunriseMins), 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(0, Math.round(sunsetMins), 0, 0);

  const dayMs  = dayEnd.getTime() - dayStart.getTime();
  const nightMs = 86400000 - dayMs;
  const dayHourMs   = dayMs  / 12;
  const nightHourMs = nightMs / 12;

  const dow = date.getDay();
  const firstIdx = CHALDEAN.indexOf(DAY_RULERS[dow]);

  const allHours: PlanetaryHour[] = [];
  for (let i = 0; i < 12; i++) {
    const start = new Date(dayStart.getTime() + i * dayHourMs);
    const end   = new Date(dayStart.getTime() + (i + 1) * dayHourMs);
    allHours.push({ planet: CHALDEAN[(firstIdx + i) % 7], start, end, isDay: true, number: i + 1 });
  }
  for (let i = 0; i < 12; i++) {
    const start = new Date(dayEnd.getTime() + i * nightHourMs);
    const end   = new Date(dayEnd.getTime() + (i + 1) * nightHourMs);
    allHours.push({ planet: CHALDEAN[(firstIdx + 12 + i) % 7], start, end, isDay: false, number: i + 13 });
  }
  return allHours;
}

// ─── Score calculation ────────────────────────────────────────────────────────

function scoreWindow(hour: PlanetaryHour, moonSign: ZodiacSign, isVoid: boolean, activity: Activity): number {
  let score = 0;
  if (activity.bestPlanets.includes(hour.planet)) score += 3;
  if (activity.avoidPlanets.includes(hour.planet)) score -= 2;
  if (activity.bestMoonSigns.includes(moonSign)) score += 2;
  if (activity.avoidMoonSigns?.includes(moonSign)) score -= 2;
  if (isVoid && activity.avoidVoid) score -= 3;
  return score;
}

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 4)  return { label: "Excellent", color: "#22c55e" };
  if (score >= 2)  return { label: "Good",      color: "#4ade80" };
  if (score >= 0)  return { label: "Neutral",   color: "#94a3b8" };
  if (score >= -2) return { label: "Caution",   color: "#f97316" };
  return                  { label: "Avoid",     color: "#ef4444" };
}

// ─── Activity Selector ────────────────────────────────────────────────────────

function ActivityCard({ activity, selected, onClick }: {
  activity: Activity;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-2xl cursor-pointer text-center transition-all duration-200"
      style={{
        background: selected ? `${activity.color}18` : "rgba(255,255,255,0.02)",
        border: selected ? `1px solid ${activity.color}45` : "1px solid rgba(255,255,255,0.05)",
        boxShadow: selected ? `0 0 24px ${activity.color}18` : "none",
      }}
    >
      <span className="text-xl" style={{ color: selected ? activity.color : "#475569" }}>{activity.icon}</span>
      <span className="text-[9px] font-bold leading-tight" style={{ color: selected ? activity.color : "#475569" }}>
        {activity.name}
      </span>
    </motion.button>
  );
}

// ─── Hour Timeline ────────────────────────────────────────────────────────────

function HourTimeline({ hours, now, activity, moonSign, isVoid }: {
  hours: PlanetaryHour[];
  now: Date;
  activity: Activity;
  moonSign: ZodiacSign;
  isVoid: boolean;
}) {
  const fmtTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const nowMs = now.getTime();

  // Show only upcoming + current hours for rest of day
  const relevant = hours.filter(h => h.end.getTime() > nowMs - 3600000).slice(0, 18);

  return (
    <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: 480, scrollbarWidth: "thin" }}>
      {relevant.map((h, i) => {
        const isCurrent = nowMs >= h.start.getTime() && nowMs < h.end.getTime();
        const isPast    = h.end.getTime() < nowMs;
        const score     = scoreWindow(h, moonSign, isVoid, activity);
        const { label, color } = getScoreLabel(score);
        const pColor = PLANET_COLORS[h.planet] ?? "#64748b";
        const remaining = isCurrent ? h.end.getTime() - nowMs : null;
        const remMins = remaining !== null ? Math.floor(remaining / 60000) : null;
        const pct = isCurrent && remaining !== null
          ? 1 - remaining / (h.end.getTime() - h.start.getTime())
          : 0;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl relative overflow-hidden"
            style={{
              background: isCurrent
                ? `${color}10`
                : isPast
                ? "transparent"
                : "rgba(255,255,255,0.015)",
              border: isCurrent
                ? `1px solid ${color}30`
                : "1px solid rgba(255,255,255,0.04)",
              opacity: isPast ? 0.3 : 1,
            }}
          >
            {/* Progress bar for current hour */}
            {isCurrent && (
              <div
                className="absolute inset-0 rounded-xl"
                style={{
                  background: `linear-gradient(90deg, ${color}08 0%, ${color}04 ${pct * 100}%, transparent ${pct * 100}%)`,
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Planet glyph */}
            <div
              className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 relative z-10"
              style={{
                background: `${pColor}12`,
                border: `1px solid ${pColor}25`,
                boxShadow: isCurrent ? `0 0 14px ${pColor}30` : "none",
              }}
            >
              <span className="text-base" style={{ color: pColor }}>{PLANET_SYMBOLS[h.planet]}</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold" style={{ color: isCurrent ? pColor : "#64748b" }}>
                  Hour of {h.planet}
                </span>
                {isCurrent && (
                  <span className="text-[7px] font-bold tracking-widest px-1.5 py-0.5 rounded" style={{ background: `${pColor}20`, color: pColor }}>
                    NOW
                  </span>
                )}
                {isCurrent && remMins !== null && (
                  <span className="text-[8px]" style={{ color: "#475569" }}>~{remMins}m left</span>
                )}
              </div>
              <p className="text-[8px]" style={{ color: "#334155" }}>
                {fmtTime(h.start)} – {fmtTime(h.end)} · {h.isDay ? "☀" : "☽"}
              </p>
            </div>

            {/* Score badge */}
            <div className="flex-shrink-0 relative z-10">
              <span
                className="text-[8px] font-bold px-2 py-1 rounded-lg"
                style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}
              >
                {label}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Best Windows summary ─────────────────────────────────────────────────────

function BestWindows({ hours, now, activity, moonSign, isVoid }: {
  hours: PlanetaryHour[];
  now: Date;
  activity: Activity;
  moonSign: ZodiacSign;
  isVoid: boolean;
}) {
  const nowMs = now.getTime();
  const fmtTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  const upcoming = hours
    .filter(h => h.end.getTime() > nowMs)
    .map(h => ({ ...h, score: scoreWindow(h, moonSign, isVoid, activity) }))
    .filter(h => h.score >= 2)
    .slice(0, 4);

  if (upcoming.length === 0) {
    return (
      <div className="rounded-xl px-4 py-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
        <p className="text-xs font-bold mb-1" style={{ color: "#ef4444" }}>No optimal windows today</p>
        <p className="text-[9px]" style={{ color: "#475569" }}>
          Current conditions are not ideal for {activity.name.toLowerCase()}. Consider tomorrow or adjust your timing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {upcoming.map((h, i) => {
        const { label, color } = getScoreLabel(h.score);
        const pColor = PLANET_COLORS[h.planet] ?? "#64748b";
        const isCurrent = nowMs >= h.start.getTime() && nowMs < h.end.getTime();
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              background: `${color}10`,
              border: `1px solid ${color}25`,
              boxShadow: isCurrent ? `0 0 16px ${color}15` : "none",
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            <span className="text-lg flex-shrink-0" style={{ color: pColor }}>{PLANET_SYMBOLS[h.planet]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold" style={{ color: pColor }}>
                Hour of {h.planet}
                {isCurrent && <span className="ml-1.5 text-[8px]" style={{ color }}>· ACTIVE NOW</span>}
              </p>
              <p className="text-[8px]" style={{ color: "#475569" }}>{fmtTime(h.start)} – {fmtTime(h.end)}</p>
            </div>
            <span className="text-[8px] font-bold px-2 py-0.5 rounded" style={{ background: `${color}20`, color }}>{label}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Timing Oracle ────────────────────────────────────────────────────────────

function TimingOracle({
  activity, hourRuler, moonSign, isVoid, score, scoreLabel,
}: {
  activity: Activity;
  hourRuler: PlanetName | null;
  moonSign: ZodiacSign;
  isVoid: boolean;
  score: number;
  scoreLabel: string;
}) {
  const [text, setText]         = useState("");
  const [streaming, setStreaming] = useState(false);
  const [started, setStarted]   = useState(false);
  const prevKeyRef              = useRef("");

  // Reset when activity changes so a fresh reading can be requested
  const key = `${activity.id}-${hourRuler}-${moonSign}-${isVoid}`;
  useEffect(() => {
    if (prevKeyRef.current && prevKeyRef.current !== key) {
      setText(""); setStarted(false);
    }
    prevKeyRef.current = key;
  }, [key]);

  const generate = useCallback(async () => {
    if (streaming || started) return;
    setStarted(true);
    setStreaming(true);
    setText("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: [
              `I want to do: ${activity.name} — ${activity.description}`,
              `Current planetary hour: ${hourRuler ?? "unknown"}`,
              `Moon in ${moonSign}${isVoid ? " (void of course)" : ""}`,
              `Current timing score: ${score > 0 ? "+" : ""}${score} (${scoreLabel})`,
              "Give me a concise, direct timing oracle in 3-4 sentences. Be specific about whether NOW is good or when to wait. Start directly with your advice — no preamble."
            ].join("\n"),
          }],
          systemPrompt: "You are Cosmora's electional astrology oracle. Give sharp, actionable timing advice. Be direct and specific. Under 100 words total.",
        }),
      });
      if (!res.ok || !res.body) { setStreaming(false); return; }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const raw = dec.decode(value, { stream: true });
        for (const line of raw.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data) as { text?: string };
            if (parsed.text) { buf += parsed.text; setText(buf); }
          } catch { /* skip */ }
        }
      }
    } catch { /* silent */ }
    setStreaming(false);
  }, [activity, hourRuler, moonSign, isVoid, score, scoreLabel, streaming, started]);

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.15)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <motion.div
            animate={streaming ? { opacity: [0.5, 1, 0.5] } : {}}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: streaming ? "#7c3aed" : "#334155" }}
          />
          <span className="text-[8px] font-bold tracking-widest" style={{ color: "#475569" }}>TIMING ORACLE</span>
        </div>
        {!started && (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={generate}
            className="text-[8px] font-bold tracking-wider px-3 py-1.5 rounded-lg cursor-pointer"
            style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}
          >
            ✦ ASK ORACLE
          </motion.button>
        )}
        {started && !streaming && (
          <button
            onClick={() => { setText(""); setStarted(false); }}
            className="text-[8px] tracking-wider px-3 py-1.5 rounded-lg cursor-pointer"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#475569" }}
          >
            ↺ NEW
          </button>
        )}
      </div>

      {!started && !text && (
        <p className="text-[9px] leading-relaxed" style={{ color: "#334155" }}>
          Get a personalized timing reading for {activity.name.toLowerCase()} based on the current planetary hour, Moon position, and your chart.
        </p>
      )}

      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[9.5px] leading-relaxed"
          style={{ color: "#94a3b8", whiteSpace: "pre-wrap" }}
        >
          {text}
          {streaming && (
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.7, repeat: Infinity }}
              style={{ display: "inline-block", width: 5, height: 10, background: "#7c3aed", borderRadius: 1, marginLeft: 3, verticalAlign: "middle" }}
            />
          )}
        </motion.p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ElectionalPage() {
  const [chart, setChart] = useState<ChartData | null>(null);
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [transitsData, setTransitsData] = useState<TransitsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [selectedActivity, setSelectedActivity] = useState<Activity>(ACTIVITIES[0]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 5000);
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

  const lat = profile?.latitude ?? 40.0;
  const hours = useMemo(() => computePlanetaryHours(now, lat), [now, lat]);

  const moon = transitsData?.transitPlanets.find(p => p.name === "Moon");
  const moonSign: ZodiacSign = moon
    ? (ZODIAC_SIGNS[Math.floor(moon.longitude / 30)] as ZodiacSign)
    : "Aries";

  const moonAspects = (transitsData?.aspects ?? []).filter(a =>
    a.transitPlanet === "Moon" && a.applying && a.daysToExact !== null
  );
  const isVoid = transitsData !== null && moonAspects.length === 0;

  const currentHour = hours.find(h => {
    const t = now.getTime();
    return t >= h.start.getTime() && t < h.end.getTime();
  });

  const dayRuler = DAY_RULERS[now.getDay()];
  const overallScore = currentHour ? scoreWindow(currentHour, moonSign, isVoid, selectedActivity) : 0;
  const { label: overallLabel, color: overallColor } = getScoreLabel(overallScore);

  if (!loading && !chart) {
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
            <p className="text-[10px] font-bold tracking-[0.2em] mb-2" style={{ color: "#334155" }}>NO CHART DATA</p>
            <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "Space Grotesk, sans-serif", color: "#e2e8f0" }}>Cosmic instruments standing by.</h2>
            <p className="text-sm max-w-xs mx-auto" style={{ color: "#475569" }}>Enter your birth data to unlock electional timing and all its cosmic layers.</p>
          </div>
          <Link href="/onboarding">
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="px-6 py-3 rounded-xl text-sm font-bold tracking-wider cursor-pointer"
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
      <div className="nebula-orb" style={{ width: 500, height: 500, left: "-5%", top: "-5%", background: "rgba(34,197,94,0.04)", filter: "blur(100px)" }} />
      <div className="nebula-orb" style={{ width: 400, height: 400, right: "5%", bottom: "10%", background: "rgba(124,58,237,0.05)", filter: "blur(90px)" }} />

      <Sidebar />

      <div className="flex-1 flex flex-col min-h-0 min-w-0 md:ml-[68px] mb-[60px] md:mb-0 relative z-10 overflow-x-hidden">

        {/* Top bar */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-shrink-0 flex items-center justify-between px-5 py-3 gap-4"
          style={{
            borderBottom: "1px solid rgba(34,197,94,0.12)",
            background: "rgba(2,2,18,0.8)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <motion.button
                whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                style={{ color: "#64748b" }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
                Dashboard
              </motion.button>
            </Link>
            <span style={{ color: "#1e293b" }}>/</span>
            <span className="text-xs font-bold tracking-widest" style={{ background: "linear-gradient(135deg, #22c55e, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ELECTIONAL TIMING
            </span>
          </div>

          {/* Current sky conditions */}
          <div className="flex items-center gap-3">
            {currentHour && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: `${PLANET_COLORS[currentHour.planet]}12`, border: `1px solid ${PLANET_COLORS[currentHour.planet]}25` }}>
                <span className="text-sm" style={{ color: PLANET_COLORS[currentHour.planet] }}>{PLANET_SYMBOLS[currentHour.planet]}</span>
                <span className="text-[8px] font-bold" style={{ color: PLANET_COLORS[currentHour.planet] }}>Hour of {currentHour.planet}</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: `${SIGN_COLORS[moonSign]}10`, border: `1px solid ${SIGN_COLORS[moonSign]}20` }}>
              <span className="text-sm" style={{ color: SIGN_COLORS[moonSign] }}>{SIGN_SYMBOLS[moonSign]}</span>
              <span className="text-[8px] font-bold" style={{ color: SIGN_COLORS[moonSign] }}>☽ {moonSign}</span>
              {isVoid && <span className="text-[7px] font-bold" style={{ color: "#f97316" }}>VoC</span>}
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 rounded-full border-2 border-t-transparent"
              style={{ borderColor: "#22c55e" }}
            />
            <p className="text-xs tracking-widest" style={{ color: "#475569" }}>LOADING SKY DATA</p>
          </div>
        ) : (
          <div className="flex-1 flex min-h-0 overflow-hidden">

            {/* Left: activity selector + details */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              <div className="px-5 py-5 space-y-6">

                {/* Activity grid */}
                <div>
                  <p className="text-[8px] font-bold tracking-widest mb-3" style={{ color: "#334155" }}>SELECT ACTIVITY</p>
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                    {ACTIVITIES.map(activity => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        selected={selectedActivity.id === activity.id}
                        onClick={() => setSelectedActivity(activity)}
                      />
                    ))}
                  </div>
                </div>

                {/* Current rating card */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedActivity.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-2xl p-5"
                    style={{
                      background: `${selectedActivity.color}06`,
                      border: `1px solid ${selectedActivity.color}20`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl" style={{ color: selectedActivity.color }}>{selectedActivity.icon}</span>
                          <p className="text-sm font-bold" style={{ color: "#e2e8f0" }}>{selectedActivity.name}</p>
                        </div>
                        <p className="text-xs mb-3" style={{ color: "#475569" }}>{selectedActivity.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedActivity.bestPlanets.slice(0, 3).map(p => (
                            <span key={p} className="flex items-center gap-1 text-[8px] px-2 py-1 rounded-lg" style={{ background: `${PLANET_COLORS[p] ?? "#64748b"}12`, color: PLANET_COLORS[p] ?? "#64748b", border: `1px solid ${PLANET_COLORS[p] ?? "#64748b"}20` }}>
                              {PLANET_SYMBOLS[p]} Best: {p}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Right: current moment rating */}
                      <div className="flex flex-col items-end gap-2">
                        <p className="text-[8px] tracking-widest" style={{ color: "#334155" }}>RIGHT NOW</p>
                        <div
                          className="flex flex-col items-center px-4 py-3 rounded-2xl"
                          style={{
                            background: `${overallColor}10`,
                            border: `1px solid ${overallColor}30`,
                            minWidth: 90,
                          }}
                        >
                          <span className="text-2xl font-bold" style={{ color: overallColor }}>{overallScore > 0 ? "+" : ""}{overallScore}</span>
                          <span className="text-[9px] font-bold tracking-wider mt-0.5" style={{ color: overallColor }}>{overallLabel.toUpperCase()}</span>
                        </div>
                        {isVoid && selectedActivity.avoidVoid && (
                          <span className="text-[8px] px-2 py-1 rounded" style={{ background: "rgba(249,115,22,0.1)", color: "#f97316" }}>
                            ⚠ Moon Void
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tips */}
                    <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${selectedActivity.color}12` }}>
                      <p className="text-[7px] font-bold tracking-widest mb-2" style={{ color: "#334155" }}>TIMING WISDOM</p>
                      <div className="space-y-1">
                        {selectedActivity.tips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-[8px] mt-0.5 flex-shrink-0" style={{ color: selectedActivity.color }}>◈</span>
                            <p className="text-[9px] leading-relaxed" style={{ color: "#475569" }}>{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Best windows */}
                <div>
                  <p className="text-[8px] font-bold tracking-widest mb-3" style={{ color: "#334155" }}>BEST WINDOWS TODAY</p>
                  <BestWindows
                    hours={hours}
                    now={now}
                    activity={selectedActivity}
                    moonSign={moonSign}
                    isVoid={isVoid}
                  />
                </div>

                {/* Moon sign guidance */}
                <div
                  className="rounded-2xl p-4"
                  style={{ background: `${SIGN_COLORS[moonSign]}08`, border: `1px solid ${SIGN_COLORS[moonSign]}20` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base" style={{ color: SIGN_COLORS[moonSign] }}>☽ {SIGN_SYMBOLS[moonSign]}</span>
                    <p className="text-[8px] font-bold tracking-widest" style={{ color: "#334155" }}>
                      MOON IN {moonSign.toUpperCase()}
                      {isVoid && " · VOID OF COURSE"}
                    </p>
                  </div>
                  <p className="text-[9px] leading-relaxed" style={{ color: "#64748b" }}>
                    {selectedActivity.bestMoonSigns.includes(moonSign)
                      ? `Moon in ${moonSign} is favorable for ${selectedActivity.name.toLowerCase()}. The lunar energy supports this type of activity.`
                      : selectedActivity.avoidMoonSigns?.includes(moonSign)
                      ? `Moon in ${moonSign} is less ideal for ${selectedActivity.name.toLowerCase()}. Consider waiting for a more supportive Moon sign.`
                      : `Moon in ${moonSign} is neutral for ${selectedActivity.name.toLowerCase()}. Focus on the planetary hours for timing.`
                    }
                    {isVoid && selectedActivity.avoidVoid && " The void of course Moon makes this a poor time for initiating important matters."}
                  </p>
                </div>

                {/* Timing Oracle */}
                <TimingOracle
                  activity={selectedActivity}
                  hourRuler={currentHour?.planet ?? null}
                  moonSign={moonSign}
                  isVoid={isVoid}
                  score={overallScore}
                  scoreLabel={overallLabel}
                />

              </div>
            </div>

            {/* Right: hour-by-hour timeline */}
            <div
              className="w-80 flex-shrink-0 flex flex-col overflow-hidden"
              style={{ borderLeft: "1px solid rgba(34,197,94,0.1)" }}
            >
              <div
                className="flex-shrink-0 flex items-center gap-2 px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span className="text-[8px] font-bold tracking-widest" style={{ color: "#334155" }}>HOUR-BY-HOUR</span>
                <span className="text-[8px] ml-1" style={{ color: "#1e293b" }}>· {selectedActivity.name}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: "thin" }}>
                <HourTimeline
                  hours={hours}
                  now={now}
                  activity={selectedActivity}
                  moonSign={moonSign}
                  isVoid={isVoid}
                />
              </div>

              {/* Legend */}
              <div
                className="flex-shrink-0 p-3 space-y-1"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                {[
                  { label: "Excellent", color: "#22c55e" },
                  { label: "Good",      color: "#4ade80" },
                  { label: "Neutral",   color: "#94a3b8" },
                  { label: "Caution",   color: "#f97316" },
                  { label: "Avoid",     color: "#ef4444" },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-[7px]" style={{ color: "#334155" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
