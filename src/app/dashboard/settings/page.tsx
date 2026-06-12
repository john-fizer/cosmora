"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardBg } from "@/components/ui/DashboardBg";
import {
  listProfiles, getProfile, saveProfile, deleteProfile,
  getActiveProfileId, setActiveProfileId, getCachedChart, setCachedChart,
} from "@/lib/storage";
import type { StoredProfile } from "@/lib/storage";
import { PLANET_SYMBOLS, SIGN_SYMBOLS } from "@/lib/astrology/types";
import type { ChartData, PlanetName } from "@/lib/astrology/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUSE_SYSTEMS = [
  { value: "whole_sign", label: "Whole Sign", desc: "Traditional · Recommended for Hellenistic" },
  { value: "placidus",   label: "Placidus",   desc: "Modern standard · Time-based division" },
  { value: "equal",      label: "Equal House", desc: "Simple · Each house exactly 30°" },
  { value: "porphyry",   label: "Porphyry",   desc: "Ancient · Divides quadrants equally" },
];

const ASTRO_MODES = [
  { value: "traditional", label: "Traditional",  desc: "Hellenistic · 7 classical planets" },
  { value: "modern",      label: "Modern",       desc: "Psychological · Outer planets" },
  { value: "blended",     label: "Blended",      desc: "Both systems · Recommended" },
];

const CONFIDENCE_OPTIONS = [
  { value: "exact",        label: "Exact",        desc: "Birth certificate" },
  { value: "approximate",  label: "Approximate",  desc: "Family memory" },
  { value: "unknown",      label: "Unknown",      desc: "Not recorded" },
  { value: "rectified",    label: "Rectified",    desc: "Estimated by astrologer" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-bold tracking-[0.18em] uppercase" style={{ color: "#06b6d4" }}>
          {label}
        </span>
        <div className="h-px w-16" style={{ background: "rgba(6,182,212,0.15)" }} />
      </div>
      {action}
    </div>
  );
}

function OptionButton({
  selected, onClick, label, desc,
}: {
  selected: boolean; onClick: () => void; label: string; desc?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl cursor-pointer text-left cosmic-option${selected ? " selected" : ""}`}
    >
      <div
        className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
        style={{
          border: selected ? "2px solid #7c3aed" : "2px solid rgba(255,255,255,0.15)",
          background: selected ? "rgba(124,58,237,0.3)" : "transparent",
        }}
      >
        {selected && <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
      </div>
      <div>
        <p className="text-[13px] font-semibold" style={{ color: selected ? "#c4b5fd" : "#94a3b8" }}>{label}</p>
        {desc && <p className="text-[13px]" style={{ color: "#334155" }}>{desc}</p>}
      </div>
    </motion.button>
  );
}

const PLANET_COLORS_MINI: Partial<Record<PlanetName, string>> = {
  Sun: "#fbbf24", Moon: "#c4b5fd", Mercury: "#a78bfa",
};

function ProfileCard({
  profile, chart, isActive, onSetActive, onEdit, onDelete, onRecalculate,
}: {
  profile: StoredProfile;
  chart?: ChartData | null;
  isActive: boolean;
  onSetActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRecalculate: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`rounded-2xl p-4 ${isActive ? "liquid-glass-cosmos" : "liquid-glass"}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-[14px] font-bold"
          style={{
            background: isActive
              ? "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(6,182,212,0.3))"
              : "rgba(255,255,255,0.06)",
            color: isActive ? "#c4b5fd" : "#475569",
            border: isActive ? "1px solid rgba(124,58,237,0.35)" : "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {profile.name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-bold" style={{ color: isActive ? "#e2e8f0" : "#94a3b8" }}>
              {profile.name}
            </p>
            {isActive && (
              <span
                className="text-[14px] font-bold tracking-widest px-1.5 py-0.5 rounded"
                style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }}
              >
                ACTIVE
              </span>
            )}
          </div>
          <p className="text-[14px] mt-0.5" style={{ color: "#475569" }}>
            {profile.birthDate} · {profile.birthTime ? profile.birthTime.substring(0, 5) : "Time unknown"}
          </p>
          <p className="text-[14px] truncate" style={{ color: "#334155" }}>{profile.birthPlace}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[13px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#475569" }}>
              {HOUSE_SYSTEMS.find(h => h.value === profile.houseSystem)?.label ?? profile.houseSystem}
            </span>
            <span className="text-[13px] px-1.5 py-0.5 rounded" style={{ background: "rgba(6,182,212,0.06)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.15)" }}>
              {profile.timezone}
            </span>
          </div>
          {/* Mini chart summary */}
          {chart && (() => {
            const sun  = chart.planets.find(p => p.name === "Sun");
            const moon = chart.planets.find(p => p.name === "Moon");
            const asc  = chart.houses[0];
            return (
              <div className="flex items-center gap-3 mt-2 pt-2 flex-wrap" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                {[
                  { label: "☉", value: sun  ? `${SIGN_SYMBOLS[sun.sign]}  ${sun.sign.substring(0,3)}` : "—",  color: "#fbbf24" },
                  { label: "☽", value: moon ? `${SIGN_SYMBOLS[moon.sign]} ${moon.sign.substring(0,3)}` : "—",  color: "#c4b5fd" },
                  { label: "ASC", value: asc ? `${SIGN_SYMBOLS[asc.sign]} ${asc.sign.substring(0,3)}`  : "—",  color: "#06b6d4" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center gap-1">
                    <span className="text-[13px] font-bold" style={{ color: "#334155" }}>{label}</span>
                    <span className="text-[13px] font-medium" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          {!isActive && (
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={onSetActive}
              className="text-[13px] font-bold tracking-widest px-2.5 py-1 rounded-lg cursor-pointer"
              style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}
            >
              SET ACTIVE
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onRecalculate}
            className="text-[13px] font-bold tracking-widest px-2.5 py-1 rounded-lg cursor-pointer"
            style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", color: "#06b6d4" }}
          >
            RECALC
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onEdit}
            className="text-[13px] font-bold tracking-widest px-2.5 py-1 rounded-lg cursor-pointer"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}
          >
            EDIT
          </motion.button>
          {confirmDelete ? (
            <div className="flex gap-1">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { onDelete(); setConfirmDelete(false); }}
                className="text-[13px] font-bold px-2 py-1 rounded-lg cursor-pointer"
                style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
              >
                CONFIRM
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setConfirmDelete(false)}
                className="text-[13px] px-2 py-1 rounded-lg cursor-pointer"
                style={{ background: "rgba(255,255,255,0.04)", color: "#475569", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                ✕
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setConfirmDelete(true)}
              className="text-[13px] font-bold tracking-widest px-2.5 py-1 rounded-lg cursor-pointer"
              style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444" }}
            >
              DELETE
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Edit profile panel ───────────────────────────────────────────────────────

function EditPanel({
  profile, chart, onSave, onCancel,
}: {
  profile: StoredProfile;
  chart: ChartData | null;
  onSave: (updated: StoredProfile) => Promise<void>;
  onCancel: () => void;
}) {
  const [houseSystem, setHouseSystem] = useState(profile.houseSystem);
  const [astrologyMode, setAstrologyMode] = useState(profile.astrologyMode);
  const [confidence, setConfidence] = useState(profile.birthTimeConfidence);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const needsRecalc = houseSystem !== profile.houseSystem;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave({ ...profile, houseSystem, astrologyMode, birthTimeConfidence: confidence });
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(99,102,241,0.2)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[13px] font-bold" style={{ color: "#e2e8f0" }}>Editing: {profile.name}</p>
          <p className="text-[14px]" style={{ color: "#475569" }}>{profile.birthDate} · {profile.birthPlace}</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onCancel}
          className="text-[13px] px-2.5 py-1 rounded-lg cursor-pointer"
          style={{ background: "rgba(255,255,255,0.04)", color: "#475569", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          Cancel
        </motion.button>
      </div>

      <div className="space-y-5">
        {/* House System */}
        <div>
          <p className="text-[13px] font-bold tracking-widest mb-2" style={{ color: "#64748b" }}>
            HOUSE SYSTEM
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {HOUSE_SYSTEMS.map(h => (
              <OptionButton
                key={h.value}
                selected={houseSystem === h.value}
                onClick={() => setHouseSystem(h.value)}
                label={h.label}
                desc={h.desc}
              />
            ))}
          </div>
          {needsRecalc && (
            <p className="text-[13px] mt-1.5" style={{ color: "#f59e0b" }}>
              Changing house system will recalculate your chart.
            </p>
          )}
        </div>

        {/* Astrology Mode */}
        <div>
          <p className="text-[13px] font-bold tracking-widest mb-2" style={{ color: "#64748b" }}>
            ASTROLOGY MODE
          </p>
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-3">
            {ASTRO_MODES.map(m => (
              <OptionButton
                key={m.value}
                selected={astrologyMode === m.value}
                onClick={() => setAstrologyMode(m.value)}
                label={m.label}
                desc={m.desc}
              />
            ))}
          </div>
        </div>

        {/* Birth Time Confidence */}
        <div>
          <p className="text-[13px] font-bold tracking-widest mb-2" style={{ color: "#64748b" }}>
            BIRTH TIME CONFIDENCE
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {CONFIDENCE_OPTIONS.map(c => (
              <OptionButton
                key={c.value}
                selected={confidence === c.value}
                onClick={() => setConfidence(c.value)}
                label={c.label}
                desc={c.desc}
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="text-[13px] px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </p>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl text-[14px] font-bold tracking-wider cursor-pointer disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            color: "white",
            boxShadow: "0 0 24px rgba(124,58,237,0.3)",
          }}
        >
          {saving ? (needsRecalc ? "Recalculating chart…" : "Saving…") : (needsRecalc ? "Save & Recalculate Chart" : "Save Changes")}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Clear all data button (with confirmation) ────────────────────────────────

function ClearAllButton({ onConfirm }: { onConfirm: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
      <p className="flex-1 text-[13px]" style={{ color: "#f87171" }}>This wipes all profiles, charts, and chat history from this device. Cannot be undone.</p>
      <div className="flex gap-2 flex-shrink-0">
        <motion.button whileTap={{ scale: 0.95 }} onClick={onConfirm}
          className="text-[13px] font-bold px-2.5 py-1 rounded-lg cursor-pointer"
          style={{ background: "rgba(239,68,68,0.25)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
          WIPE
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setConfirm(false)}
          className="text-[13px] px-2.5 py-1 rounded-lg cursor-pointer"
          style={{ background: "rgba(255,255,255,0.05)", color: "#475569", border: "1px solid rgba(255,255,255,0.08)" }}>
          Cancel
        </motion.button>
      </div>
    </div>
  ) : (
    <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
      onClick={() => setConfirm(true)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer text-left"
      style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
      <svg viewBox="0 0 20 20" fill="none" stroke="#ef4444" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0">
        <path d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" />
      </svg>
      <div>
        <p className="text-[13px] font-semibold" style={{ color: "#f87171" }}>Clear All Data</p>
        <p className="text-[13px]" style={{ color: "#334155" }}>Permanently wipes all profiles, charts, and chat history from this device.</p>
      </div>
    </motion.button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<StoredProfile[]>([]);
  const [chartMap, setChartMap] = useState<Record<string, ChartData | null>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const importRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const reload = useCallback(() => {
    const profs = listProfiles();
    setProfiles(profs);
    setActiveId(getActiveProfileId());
    const charts: Record<string, ChartData | null> = {};
    profs.forEach(p => { charts[p.id] = getCachedChart(p.id); });
    setChartMap(charts);
  }, []);

  useEffect(() => {
    reload();
    setLoading(false);
  }, [reload]);

  const handleSetActive = (id: string) => {
    setActiveProfileId(id);
    setActiveId(id);
    showToast("Active profile updated");
  };

  const handleDelete = (id: string) => {
    deleteProfile(id);
    reload();
    if (id === editingId) setEditingId(null);
    showToast("Profile deleted");
  };

  const handleRecalculate = async (profile: StoredProfile) => {
    showToast("Recalculating chart…");
    try {
      const res = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthDate: profile.birthDate,
          birthTime: profile.birthTime,
          latitude: profile.latitude,
          longitude: profile.longitude,
          timezone: profile.timezone,
          houseSystem: profile.houseSystem,
        }),
      });
      if (!res.ok) throw new Error("Calculation failed");
      const chart: ChartData = await res.json();
      // Update stored timezone with what the API resolved
      const updatedProfile = { ...profile, timezone: chart.timezone ?? profile.timezone };
      saveProfile(updatedProfile);
      setCachedChart(profile.id, chart);
      reload();
      showToast(`Chart recalculated · ${chart.sect} sect · tz: ${chart.timezone}`);
    } catch (e) {
      showToast(`Error: ${String(e)}`);
    }
  };

  const handleSignOut = () => {
    // Clear active profile selection (keeps profile data for next visit)
    localStorage.removeItem("cosmora_active_profile");
    router.push("/onboarding");
  };

  const handleClearAll = () => {
    // Wipe everything from localStorage
    const keys = Object.keys(localStorage).filter(k => k.startsWith("cosmora_"));
    keys.forEach(k => localStorage.removeItem(k));
    router.push("/onboarding");
  };

  const handleExportData = () => {
    const data = {
      version: 1,
      exportDate: new Date().toISOString(),
      profiles: profiles.map(p => ({ profile: p, chart: getCachedChart(p.id) })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cosmora-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${profiles.length} profile(s)`);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(data.profiles)) throw new Error("Invalid format");
        let count = 0;
        for (const { profile, chart } of data.profiles) {
          if (profile?.id && profile?.name) {
            saveProfile(profile as StoredProfile);
            if (chart) setCachedChart(profile.id, chart as ChartData);
            count++;
          }
        }
        reload();
        showToast(`Imported ${count} profile(s)`);
      } catch {
        showToast("Import failed — invalid backup file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSave = async (updated: StoredProfile) => {
    const original = getProfile(updated.id);
    const needsRecalc = original?.houseSystem !== updated.houseSystem;

    if (needsRecalc) {
      // Recalculate chart with new house system
      const res = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthDate: updated.birthDate,
          birthTime: updated.birthTime,
          latitude: updated.latitude,
          longitude: updated.longitude,
          timezone: updated.timezone,
          houseSystem: updated.houseSystem,
        }),
      });
      if (!res.ok) throw new Error("Failed to recalculate chart");
      const chart: ChartData = await res.json();
      setCachedChart(updated.id, chart);
    }

    saveProfile(updated);
    reload();
    setEditingId(null);
    showToast(needsRecalc ? "Profile saved & chart recalculated" : "Profile saved");
  };

  const editingProfile = editingId ? profiles.find(p => p.id === editingId) ?? null : null;
  const editingChart = editingId ? getCachedChart(editingId) : null;

  return (
    <div className="h-screen flex overflow-hidden">
      <DashboardBg />


      <div className="flex-1 flex flex-col min-h-0 min-w-0 md:ml-[68px] mb-[60px] md:mb-0 relative z-10 overflow-x-hidden">

        {/* Top bar */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-3 liquid-glass"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
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
            <span className="text-[13px] font-bold tracking-widest gradient-text">SETTINGS</span>
          </div>

          <Link href="/onboarding">
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.18em] px-3 py-1.5 rounded-lg cursor-pointer cosmic-option selected"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              ADD PROFILE
            </motion.button>
          </Link>
        </motion.div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          <div className="px-4 md:px-6 py-5 max-w-2xl mx-auto space-y-8">

            {/* Profiles section */}
            <div>
              <SectionHeader
                label="Profiles"
                action={
                  <span className="text-[13px]" style={{ color: "#334155" }}>
                    {profiles.length} profile{profiles.length !== 1 ? "s" : ""}
                  </span>
                }
              />

              {!loading && profiles.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-[14px] mb-4" style={{ color: "var(--text-2)" }}>No profiles yet</p>
                  <Link href="/onboarding">
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                      className="px-6 py-3 rounded-xl text-[14px] font-medium tracking-wide cursor-pointer cosmic-btn-primary"
                    >
                      Create First Profile →
                    </motion.button>
                  </Link>
                </div>
              )}

              <div className="space-y-3">
                <AnimatePresence>
                  {profiles.map(profile => (
                    <div key={profile.id}>
                      <ProfileCard
                        profile={profile}
                        chart={chartMap[profile.id]}
                        isActive={profile.id === activeId}
                        onSetActive={() => handleSetActive(profile.id)}
                        onEdit={() => setEditingId(editingId === profile.id ? null : profile.id)}
                        onDelete={() => handleDelete(profile.id)}
                        onRecalculate={() => handleRecalculate(profile)}
                      />
                      <AnimatePresence>
                        {editingId === profile.id && editingProfile && (
                          <motion.div
                            key="edit"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 overflow-hidden"
                          >
                            <EditPanel
                              profile={editingProfile}
                              chart={editingChart}
                              onSave={handleSave}
                              onCancel={() => setEditingId(null)}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* App info section */}
            <div>
              <SectionHeader label="About" />
              <div className="rounded-2xl p-4 space-y-3 liquid-glass">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center liquid-glass-cosmos">
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="white" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[14px] font-bold" style={{ color: "#e2e8f0" }}>Cosmora</p>
                    <p className="text-[14px]" style={{ color: "#334155" }}>
                      Precision astrology · Hellenistic foundations
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  {[
                    { label: "Ephemeris", value: "astronomy-engine" },
                    { label: "Accuracy", value: "IAU VSOP87" },
                    { label: "Storage", value: "Local device only" },
                    { label: "AI Model", value: "Claude (Anthropic)" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[14px] tracking-widest mb-0.5" style={{ color: "#1e293b" }}>{label.toUpperCase()}</p>
                      <p className="text-[14px] font-medium" style={{ color: "#475569" }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Privacy & storage */}
            <div>
              <SectionHeader label="Privacy & Storage" />
              <div className="rounded-xl p-4 mb-3 liquid-glass">
                <p className="text-[14px] leading-relaxed" style={{ color: "#475569" }}>
                  Everything is stored <strong style={{ color: "#06b6d4" }}>on this device only</strong> — your browser&apos;s localStorage. No birth data, charts, or chat history is ever sent to or stored on any server. AI chat sends only the current message and recent chat history to the Claude API per request.
                </p>
              </div>

              {/* Export / Import */}
              <div className="flex gap-2 flex-wrap">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleExportData}
                  disabled={profiles.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold tracking-widest cursor-pointer disabled:opacity-40"
                  style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                    <path d="M8 10V3M5 7l3 3 3-3M3 12h10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  EXPORT BACKUP
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => importRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold tracking-widest cursor-pointer"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                    <path d="M8 6v7M5 9l3-3 3 3M3 12h10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  IMPORT BACKUP
                </motion.button>

                <input
                  ref={importRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </div>
            </div>

            {/* Sign out / Clear data */}
            <div>
              <SectionHeader label="Session" />
              <div className="space-y-2">
                <motion.button
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer text-left"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <svg viewBox="0 0 20 20" fill="none" stroke="#64748b" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0">
                    <path d="M3 3h7a1 1 0 011 1v2M3 3v14a1 1 0 001 1h6M3 3l14 7-14 7" />
                  </svg>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "#94a3b8" }}>Switch Profile / Sign Out</p>
                    <p className="text-[13px]" style={{ color: "#334155" }}>Returns to onboarding. Your profiles stay saved on this device.</p>
                  </div>
                </motion.button>

                <ClearAllButton onConfirm={handleClearAll} />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-24 md:bottom-6 left-1/2 z-[100]"
          >
            <div
              className="px-4 py-2.5 rounded-xl text-[13px] font-medium"
              style={{
                background: "rgba(4,4,28,0.95)",
                border: "1px solid rgba(124,58,237,0.3)",
                color: "#a78bfa",
                backdropFilter: "blur(20px)",
                boxShadow: "0 0 20px rgba(124,58,237,0.2)",
              }}
            >
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
