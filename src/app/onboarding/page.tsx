"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { saveProfile, setActiveProfileId, setCachedChart, generateId } from "@/lib/storage";
import { SIGN_SYMBOLS, PLANET_SYMBOLS } from "@/lib/astrology/types";
import type { ChartData, ZodiacSign } from "@/lib/astrology/types";
import { SignGlyph, PlanetGlyph } from "@/components/ui/AstroGlyph";

interface GeoResult {
  displayName: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  timezone: string;
}

const CONFIDENCE_OPTIONS = [
  { value: "exact", label: "Exact — from birth certificate" },
  { value: "approximate", label: "Approximate — family memory" },
  { value: "unknown", label: "Unknown" },
  { value: "rectified", label: "Rectified estimate" },
];

const HOUSE_SYSTEMS = [
  { value: "whole_sign", label: "Whole Sign (recommended)" },
  { value: "placidus", label: "Placidus" },
  { value: "equal", label: "Equal House" },
  { value: "porphyry", label: "Porphyry" },
];

const ASTRO_MODES = [
  { value: "traditional", label: "Traditional Hellenistic" },
  { value: "modern", label: "Modern Psychological" },
  { value: "blended", label: "Blended (recommended)" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [revealChart, setRevealChart] = useState<ChartData | null>(null);

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [confidence, setConfidence] = useState("exact");
  const [locationQuery, setLocationQuery] = useState("");
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<GeoResult | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [houseSystem, setHouseSystem] = useState("whole_sign");
  const [astrologyMode, setAstrologyMode] = useState("blended");

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLocationSearch = (q: string) => {
    setLocationQuery(q);
    setSelectedLocation(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) { setGeoResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setGeoLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setGeoResults(data);
      } catch {
        setGeoResults([]);
      } finally {
        setGeoLoading(false);
      }
    }, 400);
  };

  const handleSave = async () => {
    if (!name || !birthDate || !selectedLocation) {
      setError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // Calculate chart (stateless API — no DB)
      const chartRes = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthDate,
          birthTime: birthTime || "12:00",
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          timezone: selectedLocation.timezone || "UTC",
          houseSystem,
        }),
      });
      if (!chartRes.ok) throw new Error("Chart calculation failed");
      const chart = await chartRes.json();

      // Save profile and chart to localStorage
      const id = generateId();
      const profile = {
        id,
        name,
        birthDate,
        birthTime: birthTime || "12:00",
        birthPlace: selectedLocation.displayName,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        timezone: chart.timezone ?? selectedLocation.timezone ?? "UTC",
        birthTimeConfidence: confidence,
        houseSystem,
        astrologyMode,
        createdAt: new Date().toISOString(),
      };

      saveProfile(profile);
      setCachedChart(id, chart);
      setActiveProfileId(id);

      setRevealChart(chart as ChartData);
      setSaving(false);
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  };

  const steps = [
    {
      title: "Who are we reading for?",
      subtitle: "Enter the name for this chart — yours or someone you're studying.",
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold tracking-widest mb-2" style={{ color: "#94a3b8" }}>
              CHART NAME *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Aurora, John, Client 1..."
              className="w-full px-4 py-3 rounded-xl text-[14px] cosmic-input"
              autoFocus
            />
          </div>
        </div>
      ),
      valid: () => name.trim().length > 0,
    },
    {
      title: "When were you born?",
      subtitle: "Enter the birth date and time as precisely as you know it.",
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold tracking-widest mb-2" style={{ color: "#94a3b8" }}>
              BIRTH DATE *
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-[14px] cosmic-input"
              style={{ colorScheme: "dark" }}
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold tracking-widest mb-2" style={{ color: "#94a3b8" }}>
              BIRTH TIME
            </label>
            <input
              type="time"
              value={birthTime}
              onChange={e => setBirthTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-[14px] cosmic-input"
              style={{ colorScheme: "dark" }}
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold tracking-widest mb-2" style={{ color: "#94a3b8" }}>
              TIME CONFIDENCE
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CONFIDENCE_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setConfidence(o.value)}
                  className="px-3 py-2 rounded-xl text-[13px] font-medium text-left cursor-pointer transition-all duration-150"
                  style={{
                    background: confidence === o.value ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.04)",
                    border: confidence === o.value ? "1px solid rgba(124,58,237,0.5)" : "1px solid rgba(255,255,255,0.08)",
                    color: confidence === o.value ? "#c4b5fd" : "#94a3b8",
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
      valid: () => birthDate.length > 0,
    },
    {
      title: "Where were you born?",
      subtitle: "Search for the birth city — we'll look up the coordinates automatically.",
      content: (
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-[13px] font-bold tracking-widest mb-2" style={{ color: "#94a3b8" }}>
              BIRTHPLACE *
            </label>
            <input
              type="text"
              value={locationQuery}
              onChange={e => handleLocationSearch(e.target.value)}
              placeholder="Search city or town..."
              className="w-full px-4 py-3 rounded-xl text-[14px] cosmic-input"
            />
            {geoLoading && (
              <div className="absolute right-3 top-10">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 rounded-full border-2 border-t-transparent"
                  style={{ borderColor: "#7c3aed" }}
                />
              </div>
            )}
            {geoResults.length > 0 && !selectedLocation && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20"
                style={{
                  background: "rgba(4,4,32,0.95)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  backdropFilter: "blur(20px)",
                }}
              >
                {geoResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedLocation(r); setLocationQuery(r.city || r.displayName.split(",")[0]); setGeoResults([]); }}
                    className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors cursor-pointer"
                    style={{ borderBottom: i < geoResults.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                  >
                    <p className="text-[14px] font-medium" style={{ color: "#e2e8f0" }}>
                      {r.city || r.displayName.split(",")[0]}
                    </p>
                    <p className="text-[13px] mt-0.5 truncate" style={{ color: "#64748b" }}>{r.displayName}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </div>
          {selectedLocation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5" className="w-5 h-5 flex-shrink-0">
                <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <div className="min-w-0">
                <p className="text-[14px] font-medium truncate" style={{ color: "#c4b5fd" }}>
                  {selectedLocation.city || selectedLocation.displayName.split(",")[0]}
                </p>
                <p className="text-[13px]" style={{ color: "#64748b" }}>
                  {selectedLocation.latitude.toFixed(4)}°, {selectedLocation.longitude.toFixed(4)}° · {selectedLocation.timezone}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      ),
      valid: () => selectedLocation !== null,
    },
    {
      title: "Choose your system",
      subtitle: "Select the house system and interpretation mode for this chart.",
      content: (
        <div className="space-y-6">
          <div>
            <label className="block text-[13px] font-bold tracking-widest mb-3" style={{ color: "#94a3b8" }}>
              HOUSE SYSTEM
            </label>
            <div className="space-y-2">
              {HOUSE_SYSTEMS.map(hs => (
                <button
                  key={hs.value}
                  onClick={() => setHouseSystem(hs.value)}
                  className="w-full px-4 py-3 rounded-xl text-left text-[14px] font-medium cursor-pointer transition-all duration-150"
                  style={{
                    background: houseSystem === hs.value ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.03)",
                    border: houseSystem === hs.value ? "1px solid rgba(124,58,237,0.5)" : "1px solid rgba(255,255,255,0.07)",
                    color: houseSystem === hs.value ? "#c4b5fd" : "#94a3b8",
                  }}
                >
                  {hs.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-bold tracking-widest mb-3" style={{ color: "#94a3b8" }}>
              INTERPRETATION MODE
            </label>
            <div className="space-y-2">
              {ASTRO_MODES.map(m => (
                <button
                  key={m.value}
                  onClick={() => setAstrologyMode(m.value)}
                  className="w-full px-4 py-3 rounded-xl text-left text-[14px] font-medium cursor-pointer transition-all duration-150"
                  style={{
                    background: astrologyMode === m.value ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.03)",
                    border: astrologyMode === m.value ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.07)",
                    color: astrologyMode === m.value ? "#fbbf24" : "#94a3b8",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
      valid: () => true,
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  // Chart reveal screen
  if (revealChart) {
    const sun   = revealChart.planets.find(p => p.name === "Sun");
    const moon  = revealChart.planets.find(p => p.name === "Moon");
    const asc   = revealChart.houses[0];
    const prof  = revealChart.annualProfection;

    const SIGN_COLORS: Record<string, string> = {
      Aries:"#ef4444", Taurus:"#22c55e", Gemini:"#eab308", Cancer:"#38bdf8",
      Leo:"#f97316", Virgo:"#4ade80", Libra:"#facc15", Scorpio:"#dc2626",
      Sagittarius:"#f59e0b", Capricorn:"#94a3b8", Aquarius:"#06b6d4", Pisces:"#8b5cf6",
    };
    const PLANET_COLORS: Record<string, string> = {
      Sun: "#fbbf24", Moon: "#c4b5fd", Mercury: "#a78bfa", Venus: "#f472b6",
      Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
      Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#8b5cf6",
    };

    const reveals = [
      { label: "SUN", symbol: "☉", color: "#fbbf24", value: `${sun?.sign ?? "?"}`, subtext: `House ${sun?.house ?? "?"} · ${sun?.dignity ? sun.dignity.charAt(0).toUpperCase() + sun.dignity.slice(1) : "Peregrine"}`, signColor: SIGN_COLORS[sun?.sign ?? ""] ?? "#94a3b8" },
      { label: "MOON", symbol: "☽", color: "#c4b5fd", value: `${moon?.sign ?? "?"}`, subtext: `House ${moon?.house ?? "?"} · ${moon?.dignity ? moon.dignity.charAt(0).toUpperCase() + moon.dignity.slice(1) : "Peregrine"}`, signColor: SIGN_COLORS[moon?.sign ?? ""] ?? "#94a3b8" },
      { label: "RISING", symbol: "↑", color: "#06b6d4", value: `${asc?.sign ?? "?"}`, subtext: "Ascendant sign", signColor: SIGN_COLORS[asc?.sign ?? ""] ?? "#94a3b8" },
      { label: "LORD OF YEAR", symbol: PLANET_SYMBOLS[prof.lordOfYear as keyof typeof PLANET_SYMBOLS] ?? "?", color: PLANET_COLORS[prof.lordOfYear] ?? "#f59e0b", value: prof.lordOfYear, subtext: `Age ${prof.age} · H${prof.activatedHouse} activated`, signColor: PLANET_COLORS[prof.lordOfYear] ?? "#f59e0b" },
    ];

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#00000f" }}>
        <DashboardBg />
        <div
          className="fixed pointer-events-none rounded-full"
          style={{ width: 700, height: 700, left: "50%", top: "50%", transform: "translate(-50%,-50%)", background: "radial-gradient(ellipse, rgba(124,58,237,0.09), transparent 65%)", filter: "blur(80px)" }}
        />

        <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: "0 0 50px rgba(124,58,237,0.5)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.2" className="w-9 h-9">
                <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
                <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
              </svg>
            </motion.div>
            <p className="text-[13px] font-bold tracking-[0.25em] mb-3" style={{ color: "#7c3aed" }}>CHART COMPLETE</p>
            <h2 className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#f1f5f9", letterSpacing: "-0.02em" }}>
              Welcome, {name}.
            </h2>
            <p className="text-[14px] mt-2" style={{ color: "#475569" }}>Here&apos;s what we found in your chart.</p>
          </motion.div>

          {/* Reveals */}
          <div className="w-full space-y-3">
            {reveals.map((r, i) => (
              <motion.div
                key={r.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.18, duration: 0.5, ease: "easeOut" }}
                className="flex items-center gap-4 rounded-2xl px-5 py-4"
                style={{
                  background: `${r.color}08`,
                  border: `1px solid ${r.color}20`,
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${r.color}14`, border: `1px solid ${r.color}30` }}>
                  <span style={{ fontSize: "1.25rem", color: r.color, filter: `drop-shadow(0 0 8px ${r.color})` }}>{r.symbol}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold tracking-[0.18em]" style={{ color: "#334155" }}>{r.label}</p>
                  <p className="text-base font-bold flex items-center gap-1.5" style={{ color: r.signColor, fontFamily: "'Cormorant Garamond', serif" }}>
                    <SignGlyph sign={r.value as ZodiacSign} size={16} />{r.value}
                  </p>
                </div>
                <p className="text-[14px] text-right flex-shrink-0" style={{ color: "#475569" }}>{r.subtext}</p>
              </motion.div>
            ))}
          </div>

          {/* Sect badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="flex items-center gap-3 px-4 py-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span style={{ color: revealChart.sect === "day" ? "#fbbf24" : "#c4b5fd", fontSize: "1.1rem" }}>
              {revealChart.sect === "day" ? "☀" : "☽"}
            </span>
            <span className="text-[13px] font-medium" style={{ color: "#64748b" }}>
              {revealChart.sect === "day" ? "Day chart — Sun above the horizon at birth" : "Night chart — Sun below the horizon at birth"}
            </span>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, duration: 0.5 }}
            className="w-full"
          >
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 0 50px rgba(124,58,237,0.5)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/dashboard")}
              className="w-full py-4 rounded-2xl text-base font-bold tracking-wider cursor-pointer"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5, #06b6d4)", color: "white", border: "1px solid rgba(124,58,237,0.4)" }}
            >
              Enter My Cosmos →
            </motion.button>
            <p className="text-center text-[14px] mt-3" style={{ color: "#1e293b" }}>
              All data stored locally on your device
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#00000f" }}>
      <DashboardBg />

      {/* Nebula orb */}
      <div
        className="fixed pointer-events-none rounded-full"
        style={{
          width: 600, height: 600,
          left: "20%", top: "10%",
          background: "radial-gradient(ellipse, rgba(124,58,237,0.1), transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-5 h-5">
              <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <span className="font-bold tracking-widest gradient-text">COSMORA</span>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{
                background: i <= step ? "linear-gradient(90deg, #7c3aed, #06b6d4)" : "rgba(255,255,255,0.08)",
              }}
            />
          ))}
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8 relative"
          style={{
            background: "rgba(4,4,32,0.85)",
            border: "1px solid rgba(99,102,241,0.2)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* HUD corner brackets */}
          <div style={{ position: "absolute", top: 12, left: 12, width: 14, height: 14, borderTop: "1.5px solid rgba(6,182,212,0.5)", borderLeft: "1.5px solid rgba(6,182,212,0.5)" }} />
          <div style={{ position: "absolute", top: 12, right: 12, width: 14, height: 14, borderTop: "1.5px solid rgba(6,182,212,0.5)", borderRight: "1.5px solid rgba(6,182,212,0.5)" }} />
          <div style={{ position: "absolute", bottom: 12, left: 12, width: 14, height: 14, borderBottom: "1.5px solid rgba(6,182,212,0.5)", borderLeft: "1.5px solid rgba(6,182,212,0.5)" }} />
          <div style={{ position: "absolute", bottom: 12, right: 12, width: 14, height: 14, borderBottom: "1.5px solid rgba(6,182,212,0.5)", borderRight: "1.5px solid rgba(6,182,212,0.5)" }} />
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-[13px] font-bold tracking-widest mb-2" style={{ color: "#7c3aed" }}>
                STEP {step + 1} OF {steps.length}
              </p>
              <h2
                className="text-2xl font-bold mb-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#f1f5f9" }}
              >
                {current.title}
              </h2>
              <p className="text-[14px] mb-6" style={{ color: "#64748b" }}>{current.subtitle}</p>
              {current.content}
            </motion.div>
          </AnimatePresence>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-[13px] px-3 py-2 rounded-lg"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
            >
              {error}
            </motion.p>
          )}

          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-5 py-3 rounded-xl text-[14px] font-medium cursor-pointer transition-all duration-150"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#94a3b8",
                }}
              >
                Back
              </button>
            )}
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(124,58,237,0.4)" }}
              whileTap={{ scale: 0.98 }}
              onClick={isLast ? handleSave : () => { if (current.valid()) { setError(""); setStep(s => s + 1); } else setError("Please complete this step."); }}
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-[14px] font-bold tracking-wider cursor-pointer transition-all duration-150 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                color: "white",
                border: "1px solid rgba(124,58,237,0.5)",
              }}
            >
              {saving ? "Calculating chart..." : isLast ? "Calculate My Chart →" : "Continue"}
            </motion.button>
          </div>
        </div>

        <p className="text-center text-[13px] mt-4" style={{ color: "#334155" }}>
          Your data is stored locally on your device.
        </p>
      </motion.div>
    </div>
  );
}
