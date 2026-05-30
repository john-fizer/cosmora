"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardBg } from "@/components/ui/DashboardBg";
import {
  getActiveProfileId, getOracleMemories, deleteOracleMemory, updateOracleMemory,
} from "@/lib/storage";
import type { OracleMemory, MemoryCategory } from "@/lib/storage";

// ─── Constants ─────────────────────────────────────────────────────────────────

const CAT_META: Record<MemoryCategory, { label: string; color: string; icon: string }> = {
  insight:      { label: "Insight",      color: "#a78bfa", icon: "✦" },
  timing:       { label: "Timing",       color: "#f59e0b", icon: "◷" },
  relocation:   { label: "Relocation",   color: "#32D5FF", icon: "⊕" },
  relationship: { label: "Relationship", color: "#f472b6", icon: "♡" },
  warning:      { label: "Warning",      color: "#ef4444", icon: "⚠" },
  general:      { label: "General",      color: "#64748b", icon: "◈" },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return iso.slice(0, 10); }
}

// ─── Memory card ──────────────────────────────────────────────────────────────

function MemoryCard({
  memory, onDelete, onUpdateCategory,
}: {
  memory: OracleMemory;
  onDelete: (id: string) => void;
  onUpdateCategory: (id: string, cat: MemoryCategory) => void;
}) {
  const [expanded, setExpanded]   = useState(false);
  const [showCats, setShowCats]   = useState(false);
  const [deleted,  setDeleted]    = useState(false);
  const meta = CAT_META[memory.category];

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleted(true);
    setTimeout(() => onDelete(memory.id), 350);
  };

  return (
    <AnimatePresence>
      {!deleted && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          onClick={() => setExpanded(e => !e)}
          style={{
            background: "rgba(4,4,28,0.85)",
            border: `1px solid ${meta.color}22`,
            borderRadius: 16, padding: 16,
            cursor: "pointer", position: "relative",
            backdropFilter: "blur(16px)",
            boxShadow: `0 0 20px ${meta.color}08`,
          }}
        >
          {/* Category badge */}
          <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6 }}>
            <button
              onClick={e => { e.stopPropagation(); setShowCats(v => !v); }}
              style={{
                padding: "2px 8px", borderRadius: 20, fontSize: 8.5,
                background: `${meta.color}18`, border: `1px solid ${meta.color}35`,
                color: meta.color, cursor: "pointer",
              }}
            >
              {meta.icon} {meta.label}
            </button>
            <button
              onClick={handleDelete}
              style={{
                width: 20, height: 20, borderRadius: "50%", fontSize: 9,
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>

          {/* Category switcher */}
          <AnimatePresence>
            {showCats && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                onClick={e => e.stopPropagation()}
                style={{
                  position: "absolute", top: 38, right: 12,
                  background: "rgba(4,4,28,0.97)", border: "1px solid rgba(124,58,237,0.2)",
                  borderRadius: 12, padding: 8, zIndex: 10, display: "flex", flexWrap: "wrap",
                  gap: 4, width: 180,
                }}
              >
                {(Object.entries(CAT_META) as [MemoryCategory, typeof CAT_META[MemoryCategory]][]).map(([id, m]) => (
                  <button key={id} onClick={() => { onUpdateCategory(memory.id, id); setShowCats(false); }}
                    style={{
                      padding: "3px 8px", borderRadius: 20, fontSize: 8,
                      background: memory.category === id ? `${m.color}22` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${memory.category === id ? m.color + "44" : "rgba(255,255,255,0.06)"}`,
                      color: memory.category === id ? m.color : "#475569", cursor: "pointer",
                    }}>
                    {m.icon} {m.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <p style={{ color: "#94a3b8", fontSize: 8, letterSpacing: "0.12em", marginBottom: 6, fontFamily: "'Fragment Mono', monospace" }}>
            {formatDate(memory.createdAt)}
          </p>
          <p style={{ color: "#e2d9f3", fontSize: 13, fontWeight: 500, marginBottom: 8, paddingRight: 100, lineHeight: 1.4 }}>
            {memory.title}
          </p>
          <p style={{
            color: "#64748b", fontSize: 11, lineHeight: 1.6,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: expanded ? 999 : 3,
            WebkitBoxOrient: "vertical",
          } as React.CSSProperties}>
            {memory.content}
          </p>
          {memory.content.length > 200 && (
            <p style={{ color: meta.color, fontSize: 9, marginTop: 6, fontFamily: "'Fragment Mono', monospace" }}>
              {expanded ? "▲ COLLAPSE" : "▼ EXPAND"}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function OracleMemoriesPage() {
  const [memories, setMemories]     = useState<OracleMemory[]>([]);
  const [profileId, setProfileId]   = useState<string | null>(null);
  const [activeFilter, setFilter]   = useState<MemoryCategory | "all">("all");
  const [search, setSearch]         = useState("");

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) return;
    setProfileId(id);
    setMemories(getOracleMemories(id));
  }, []);

  const handleDelete = useCallback((memId: string) => {
    if (!profileId) return;
    deleteOracleMemory(profileId, memId);
    setMemories(prev => prev.filter(m => m.id !== memId));
  }, [profileId]);

  const handleUpdateCat = useCallback((memId: string, cat: MemoryCategory) => {
    if (!profileId) return;
    updateOracleMemory(profileId, memId, { category: cat });
    setMemories(prev => prev.map(m => m.id === memId ? { ...m, category: cat } : m));
  }, [profileId]);

  const filtered = memories.filter(m => {
    if (activeFilter !== "all" && m.category !== activeFilter) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase()) &&
        !m.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = Object.fromEntries(
    (Object.keys(CAT_META) as MemoryCategory[]).map(c => [c, memories.filter(m => m.category === c).length])
  ) as Record<MemoryCategory, number>;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base, #08080F)" }}>
      <Sidebar />
      <DashboardBg />

      <div className="flex-1 flex flex-col overflow-hidden" style={{ marginLeft: 64 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex-shrink-0 flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid rgba(124,58,237,0.1)" }}
        >
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/oracle"
              style={{ color: "#475569", fontSize: 10, letterSpacing: "0.1em", fontFamily: "'Fragment Mono', monospace" }}
            >
              ← ORACLE
            </Link>
            <span style={{ color: "#1e293b" }}>/</span>
            <span style={{ color: "#7c3aed", fontSize: 10, letterSpacing: "0.1em", fontFamily: "'Fragment Mono', monospace" }}>
              MEMORIES
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: "#334155", fontSize: 10, fontFamily: "'Fragment Mono', monospace" }}>
              {memories.length} saved
            </span>
          </div>
        </motion.div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left sidebar: filters */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex-shrink-0 flex flex-col gap-1 p-4"
            style={{ width: 180, borderRight: "1px solid rgba(124,58,237,0.08)" }}
          >
            <p className="text-[8px] tracking-[0.2em] mb-3" style={{ color: "#334155", fontFamily: "'Fragment Mono', monospace" }}>
              FILTER
            </p>
            <button
              onClick={() => setFilter("all")}
              style={{
                padding: "7px 12px", borderRadius: 10, textAlign: "left",
                background: activeFilter === "all" ? "rgba(124,58,237,0.12)" : "transparent",
                border: `1px solid ${activeFilter === "all" ? "rgba(124,58,237,0.3)" : "transparent"}`,
                color: activeFilter === "all" ? "#a78bfa" : "#475569",
                fontSize: 10, cursor: "pointer", display: "flex", justifyContent: "space-between",
                fontFamily: "'Fragment Mono', monospace",
              }}
            >
              <span>ALL</span>
              <span style={{ opacity: 0.6 }}>{memories.length}</span>
            </button>
            {(Object.entries(CAT_META) as [MemoryCategory, typeof CAT_META[MemoryCategory]][]).map(([id, m]) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                style={{
                  padding: "7px 12px", borderRadius: 10, textAlign: "left",
                  background: activeFilter === id ? `${m.color}12` : "transparent",
                  border: `1px solid ${activeFilter === id ? m.color + "30" : "transparent"}`,
                  color: activeFilter === id ? m.color : "#475569",
                  fontSize: 10, cursor: "pointer", display: "flex", justifyContent: "space-between",
                  fontFamily: "'Fragment Mono', monospace",
                }}
              >
                <span>{m.icon} {m.label.toUpperCase()}</span>
                <span style={{ opacity: 0.6 }}>{counts[id]}</span>
              </button>
            ))}
          </motion.div>

          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="flex-shrink-0 px-6 py-3" style={{ borderBottom: "1px solid rgba(124,58,237,0.06)" }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search memories…"
                className="w-full max-w-md text-xs px-4 py-2 rounded-xl outline-none"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(124,58,237,0.15)",
                  color: "#e2d9f3",
                  fontFamily: "'Fragment Mono', monospace",
                }}
              />
            </div>

            {/* Memory grid */}
            <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "thin", scrollbarColor: "#1e293b transparent" }}>
              {filtered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center"
                  style={{ paddingTop: 60 }}
                >
                  <div style={{
                    width: 64, height: 64, borderRadius: "50%",
                    background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, color: "#334155", marginBottom: 16,
                  }}>
                    ✦
                  </div>
                  <p style={{ color: "#475569", fontSize: 13, marginBottom: 8 }}>
                    {memories.length === 0 ? "No memories saved yet" : "No memories match this filter"}
                  </p>
                  <p style={{ color: "#334155", fontSize: 11 }}>
                    {memories.length === 0
                      ? "Hover over Oracle responses and click \"+ SAVE TO MEMORY\" to save insights here."
                      : "Try a different filter or search term."}
                  </p>
                  {memories.length === 0 && (
                    <Link
                      href="/dashboard/oracle"
                      style={{
                        marginTop: 20, padding: "8px 20px",
                        background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)",
                        borderRadius: 24, color: "#a78bfa", fontSize: 10,
                        letterSpacing: "0.1em", fontFamily: "'Fragment Mono', monospace",
                        textDecoration: "none",
                      }}
                    >
                      OPEN ORACLE →
                    </Link>
                  )}
                </motion.div>
              ) : (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                  {filtered.map(m => (
                    <div key={m.id} className="break-inside-avoid mb-4">
                      <MemoryCard
                        memory={m}
                        onDelete={handleDelete}
                        onUpdateCategory={handleUpdateCat}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
