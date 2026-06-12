"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardBg } from "@/components/ui/DashboardBg";
import {
  getActiveProfileId, getMarriageReadings, deleteMarriageReading,
  type MarriageReading,
} from "@/lib/storage";
import type { MarriageNumber } from "@/lib/astrology/marriages";

const MONO = "'Fragment Mono', monospace";
const SERIF = "'Cormorant Garamond', serif";

const ORDINAL: Record<MarriageNumber, string> = { 1: "FIRST", 2: "SECOND", 3: "THIRD", 4: "FOURTH" };

function ReadingRow({ reading, onDelete }: { reading: MarriageReading; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const marriage = reading.significators[0]?.marriage as MarriageNumber | undefined;
  const date = new Date(reading.generatedAt);
  const stamp = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
      className="liquid-glass-cosmos rounded-2xl overflow-hidden"
    >
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-6 py-4 cursor-pointer text-left">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1"
          style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em" }}>
          <span style={{ color: "#C8A55B" }}>
            {marriage ? `✦ ${ORDINAL[marriage]} UNION` : "✦ FULL READING"}
          </span>
          <span style={{ color: "rgba(200,165,91,0.3)" }}>·</span>
          <span style={{ color: "rgba(234,230,244,0.45)" }}>{stamp}</span>
          <span style={{ color: "rgba(200,165,91,0.3)" }}>·</span>
          <span style={{ color: reading.guideMode === "spirit" ? "#7B6FD4" : "#C8A55B" }}>
            {reading.guideMode === "spirit" ? "◈ SPIRIT" : "✦ STAR"}
          </span>
        </div>
        <motion.span animate={{ rotate: open ? 45 : 0 }} style={{ color: "rgba(234,230,244,0.3)", fontSize: 18 }}>+</motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-6 pb-6">
              <div className="space-y-3 text-sm leading-[1.8] mb-5" style={{ color: "rgba(234,230,244,0.65)" }}>
                {reading.finalText.split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>)}
              </div>
              <button
                onClick={onDelete}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.16em", color: "rgba(239,68,68,0.55)" }}>
                REMOVE FROM ARCHIVE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function MarriageArchivePage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [readings, setReadings] = useState<MarriageReading[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = getActiveProfileId();
    setProfileId(id);
    if (id) setReadings(getMarriageReadings(id));
    setReady(true);
  }, []);

  const handleDelete = (readingId: string) => {
    if (!profileId) return;
    deleteMarriageReading(profileId, readingId);
    setReadings(getMarriageReadings(profileId));
  };

  return (
    <div className="min-h-screen">
      <DashboardBg />

      <div className="relative z-10 md:ml-[68px] mb-[60px] md:mb-0 px-5 lg:px-10 py-10 max-w-3xl mx-auto">

        <motion.header initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <Link href="/dashboard/marriages"
            className="inline-block mb-5 hover:opacity-80 transition-opacity"
            style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.2em", color: "rgba(200,165,91,0.6)" }}>
            ← UNIONS
          </Link>
          <h1 className="text-4xl text-white mb-2" style={{ fontWeight: 400, letterSpacing: "-0.02em" }}>
            Reading <em style={{ fontFamily: SERIF, fontStyle: "italic", color: "rgba(234,230,244,0.65)" }}>Archive</em>
          </h1>
          <p className="text-sm" style={{ color: "rgba(234,230,244,0.4)" }}>
            Every marriage reading, preserved for review.
          </p>
        </motion.header>

        {ready && readings.length === 0 && (
          <div className="liquid-glass-cosmos rounded-3xl p-10 text-center">
            <p style={{ fontFamily: SERIF, fontStyle: "italic" }} className="text-xl text-white/50">
              The archive is empty — no readings recorded yet.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <AnimatePresence>
            {readings.map(r => (
              <ReadingRow key={r.id} reading={r} onDelete={() => handleDelete(r.id)} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
