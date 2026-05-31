"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { getActiveProfileId, getProfile, getCachedChart } from "@/lib/storage";
import { REPORT_TYPES } from "@/lib/reports/types";
import type { ReportTypeMeta, Report } from "@/lib/reports/types";
import { listReports, saveReport, createReportShell } from "@/lib/reports/storage";
import type { ChartData } from "@/lib/astrology/types";

// ─── Confidence gauge ──────────────────────────────────────────────────────────

function ConfidenceGauge({ value, color }: { value: number; color: string }) {
  const ticks = 10;
  const filled = Math.round(value * ticks);
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {Array.from({ length: ticks }, (_, i) => (
        <div key={i} style={{
          width: 3, height: i < filled ? 10 : 6,
          borderRadius: 1,
          background: i < filled ? color : "rgba(255,255,255,0.08)",
          transition: "all 0.3s",
          alignSelf: "flex-end",
        }} />
      ))}
      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, marginLeft: 4, fontFamily: "'Fragment Mono', monospace" }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

// ─── Spring config — underdamped, expresses velocity ──────────────────────────
const CARD_SPRING = { type: "spring" as const, stiffness: 280, damping: 20 };

// ─── Report type card ──────────────────────────────────────────────────────────
// Resting state = integral (the compressed whole, folded inward)
// Hover state   = derivative (rate of change at this point, unfolding)

function ReportTypeCard({
  meta, existingReport, onGenerate, generating,
}: {
  meta: ReportTypeMeta;
  existingReport: Report | null;
  onGenerate: (type: ReportTypeMeta) => void;
  generating: boolean;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  const hasReport = !!existingReport && existingReport.status === "ready";
  const isExpired = existingReport && existingReport.status !== "generating" &&
    new Date(existingReport.expiresAt) < new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{
        opacity: 1, y: 0,
        scale: hovered ? 1.018 : 1,
        boxShadow: hovered
          ? `0 16px 56px ${meta.color}1A, 0 0 0 1px ${meta.color}28`
          : "0 1px 0 rgba(255,255,255,0)",
      }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      transition={CARD_SPRING}
      style={{
        position: "relative",
        background: "rgba(8,10,22,0.94)",
        border: `1px solid ${hovered ? meta.color + "38" : "rgba(255,255,255,0.055)"}`,
        borderRadius: 16,
        padding: "24px 24px 22px",
        cursor: "pointer",
        zIndex: hovered ? 1 : 0,
        overflow: "hidden",
        transition: "border-color 0.22s",
      }}
    >
      {/* Corner radial — blooms on hover */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0.3 }}
        transition={CARD_SPRING}
        style={{
          position: "absolute", top: 0, right: 0,
          width: 120, height: 120, pointerEvents: "none",
          background: `radial-gradient(circle at top right, ${meta.color}14, transparent 65%)`,
          borderRadius: "0 16px 0 0",
        }}
      />

      {/* ── INTEGRAL LAYER — always visible ─────────────────────────────── */}

      {/* Header */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0.72 }}
        transition={CARD_SPRING}
        style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Icon — springs outward on hover */}
          <motion.div
            animate={{ scale: hovered ? 1.08 : 0.9, opacity: hovered ? 1 : 0.75 }}
            transition={CARD_SPRING}
            style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: hovered ? `${meta.color}20` : `${meta.color}0D`,
              border: `1px solid ${hovered ? meta.color + "45" : meta.color + "22"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, color: meta.color,
              fontFamily: "'Cormorant Garamond', serif",
              transition: "background 0.2s, border-color 0.2s",
            }}
          >
            {meta.icon}
          </motion.div>

          <div>
            <motion.p
              animate={{
                opacity: hovered ? 1 : 0.45,
                letterSpacing: hovered ? "0.22em" : "0.16em",
              }}
              transition={CARD_SPRING}
              style={{
                color: meta.color, fontSize: 7.5,
                fontFamily: "'Fragment Mono', monospace", marginBottom: 3,
                textTransform: "uppercase",
              }}
            >
              {meta.subtitle}
            </motion.p>
            <motion.h3
              animate={{
                color: hovered ? "#F4F0EA" : "#C4BFB5",
                fontSize: hovered ? 19 : 17,
              }}
              transition={CARD_SPRING}
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: hovered ? 600 : 400,
                lineHeight: 1.1,
              }}
            >
              {meta.title}
            </motion.h3>
          </div>
        </div>

        {/* Status badge */}
        {hasReport && !isExpired && (
          <motion.div
            animate={{ opacity: hovered ? 1 : 0.5 }}
            transition={CARD_SPRING}
            style={{
              background: `${meta.color}18`, border: `1px solid ${meta.color}35`,
              borderRadius: 20, padding: "3px 10px",
              color: meta.color, fontSize: 7.5,
              fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.1em",
              flexShrink: 0,
            }}
          >
            READY
          </motion.div>
        )}
        {isExpired && (
          <motion.div
            animate={{ opacity: hovered ? 1 : 0.5 }}
            transition={CARD_SPRING}
            style={{
              background: "rgba(255,100,50,0.1)", border: "1px solid rgba(255,100,50,0.3)",
              borderRadius: 20, padding: "3px 10px",
              color: "#FF8060", fontSize: 7.5,
              fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.1em",
              flexShrink: 0,
            }}
          >
            EXPIRED
          </motion.div>
        )}
      </motion.div>

      {/* Technique count — visible at rest, hides as detail tags take over */}
      <motion.div
        animate={{ opacity: hovered ? 0 : 0.28, height: hovered ? 0 : "auto" }}
        transition={CARD_SPRING}
        style={{ overflow: "hidden", marginBottom: hovered ? 0 : 12 }}
      >
        <span style={{
          fontSize: 7.5, color: "rgba(255,255,255,0.4)",
          fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.1em",
        }}>
          {meta.techniques.length} techniques · {meta.expiryDays >= 3650 ? "permanent" : `${meta.expiryDays}d validity`}
        </span>
      </motion.div>

      {/* ── DERIVATIVE LAYER — unfurls on hover ──────────────────────────── */}

      {/* Description — blurred ghost at rest, focuses on hover */}
      <motion.p
        animate={{
          opacity: hovered ? 0.76 : 0.055,
          y: hovered ? 0 : 9,
          filter: hovered ? "blur(0px)" : "blur(3.5px)",
        }}
        transition={{ ...CARD_SPRING, delay: hovered ? 0 : 0 }}
        style={{
          color: "rgba(210,200,188,1)", fontSize: 12.5,
          fontFamily: "'Cormorant Garamond', serif",
          lineHeight: 1.68, marginBottom: 16,
        }}
      >
        {meta.description}
      </motion.p>

      {/* Technique tags — cascades in */}
      <motion.div
        animate={{
          opacity: hovered ? 0.9 : 0.0,
          y: hovered ? 0 : 7,
        }}
        transition={{ ...CARD_SPRING, delay: hovered ? 0.04 : 0 }}
        style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 18 }}
      >
        {meta.techniques.slice(0, 5).map(t => (
          <span key={t} style={{
            fontSize: 6.5, color: "rgba(255,255,255,0.36)",
            fontFamily: "'Fragment Mono', monospace",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 3, padding: "2px 7px",
            letterSpacing: "0.07em",
          }}>
            {t.toLowerCase()}
          </span>
        ))}
        {meta.techniques.length > 5 && (
          <span style={{ fontSize: 6.5, color: "rgba(255,255,255,0.2)", padding: "2px 4px" }}>
            +{meta.techniques.length - 5}
          </span>
        )}
      </motion.div>

      {/* Footer — last to arrive, sharpest derivative */}
      <motion.div
        animate={{
          opacity: hovered ? 1 : 0.0,
          y: hovered ? 0 : 5,
        }}
        transition={{ ...CARD_SPRING, delay: hovered ? 0.07 : 0 }}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <div style={{ display: "flex", gap: 14 }}>
          <span style={{
            color: "rgba(255,255,255,0.28)", fontSize: 7.5,
            fontFamily: "'Fragment Mono', monospace",
          }}>
            ~{meta.estimatedMinutes} min
          </span>
          <span style={{
            color: "rgba(255,255,255,0.28)", fontSize: 7.5,
            fontFamily: "'Fragment Mono', monospace",
          }}>
            {meta.expiryDays >= 3650 ? "permanent" : `${meta.expiryDays}d`}
          </span>
        </div>

        {hasReport && !isExpired ? (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push(`/dashboard/reports/${existingReport!.id}`)}
            style={{
              padding: "6px 16px",
              background: `${meta.color}18`,
              border: `1px solid ${meta.color}40`,
              borderRadius: 7, color: meta.color,
              fontSize: 8, letterSpacing: "0.12em",
              fontFamily: "'Fragment Mono', monospace",
              cursor: "pointer",
            }}
          >
            VIEW REPORT →
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onGenerate(meta)}
            disabled={generating}
            style={{
              padding: "6px 16px",
              background: generating
                ? "rgba(255,255,255,0.04)"
                : `linear-gradient(135deg, ${meta.color}24, ${meta.color}10)`,
              border: `1px solid ${generating ? "rgba(255,255,255,0.08)" : meta.color + "50"}`,
              borderRadius: 7,
              color: generating ? "rgba(255,255,255,0.25)" : meta.color,
              fontSize: 8, letterSpacing: "0.12em",
              fontFamily: "'Fragment Mono', monospace",
              cursor: generating ? "not-allowed" : "pointer",
            }}
          >
            {isExpired ? "REGENERATE" : "GENERATE"}
          </motion.button>
        )}
      </motion.div>

      {/* Bottom accent line — the resting indicator of latent energy */}
      <motion.div
        animate={{ opacity: hovered ? 0 : 0.22, scaleX: hovered ? 0 : 1 }}
        transition={CARD_SPRING}
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 1.5,
          background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)`,
          transformOrigin: "center",
          borderRadius: "0 0 16px 16px",
        }}
      />
    </motion.div>
  );
}

// ─── Generation progress overlay ───────────────────────────────────────────────

function GeneratingOverlay({
  meta, progress, onClose,
}: {
  meta: ReportTypeMeta;
  progress: { phase: string; current: number; total: number };
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(4,5,14,0.92)",
        backdropFilter: "blur(20px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          width: 440, padding: 44,
          background: "rgba(10,11,24,0.97)",
          border: `1px solid ${meta.color}30`,
          borderRadius: 20,
          boxShadow: `0 0 80px ${meta.color}15`,
          textAlign: "center",
        }}
      >
        {/* Animated symbol */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          style={{
            width: 64, height: 64,
            border: `1px solid ${meta.color}40`,
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 24, color: meta.color,
            fontFamily: "'Cormorant Garamond', serif",
          }}
        >
          <motion.span animate={{ rotate: -360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }}>
            {meta.icon}
          </motion.span>
        </motion.div>

        <p style={{
          color: meta.color, fontSize: 8, letterSpacing: "0.25em",
          fontFamily: "'Fragment Mono', monospace", marginBottom: 6,
        }}>
          GENERATING REPORT
        </p>
        <h3 style={{
          color: "#F0EDE8", fontSize: 22,
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 600, marginBottom: 24,
        }}>
          {meta.title}
        </h3>

        {/* Progress track */}
        <div style={{ marginBottom: 18 }}>
          <div style={{
            height: 2, background: "rgba(255,255,255,0.06)",
            borderRadius: 1, overflow: "hidden", marginBottom: 10,
          }}>
            <motion.div
              animate={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : "15%" }}
              transition={{ duration: 0.5 }}
              style={{ height: "100%", background: meta.color, borderRadius: 1 }}
            />
          </div>
          <p style={{
            color: "rgba(255,255,255,0.4)", fontSize: 9,
            fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.1em",
          }}>
            {progress.phase}
          </p>
        </div>

        <p style={{
          color: "rgba(200,190,178,0.35)", fontSize: 11,
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: "italic", lineHeight: 1.5,
        }}>
          {meta.techniques.length} astrological techniques running in parallel.<br />
          Cross-referencing for convergence and confidence scoring.
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── History row ───────────────────────────────────────────────────────────────

function HistoryRow({ report, onClick }: { report: Report; onClick: () => void }) {
  const meta = REPORT_TYPES.find(r => r.id === report.type);
  if (!meta) return null;
  const isExpired = new Date(report.expiresAt) < new Date();
  const age = Math.floor((Date.now() - new Date(report.generatedAt).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "12px 16px",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 10, cursor: "pointer",
        transition: "all 0.15s",
      }}
      whileHover={{ background: "rgba(255,255,255,0.04)", borderColor: `${meta.color}30` }}
    >
      <span style={{ fontSize: 16, color: meta.color, width: 24, textAlign: "center" }}>{meta.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: "#D4CEBD", fontSize: 12, fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}>{meta.title}</p>
        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 8, fontFamily: "'Fragment Mono', monospace" }}>
          {age === 0 ? "Today" : `${age}d ago`}
        </p>
      </div>
      <ConfidenceGauge value={report.overallConfidence} color={meta.color} />
      {isExpired && (
        <span style={{ fontSize: 7, color: "#FF8060", fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.08em" }}>EXPIRED</span>
      )}
      <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>→</span>
    </motion.div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const router = useRouter();
  const [profileName, setProfileName] = useState("Your");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [chart, setChart] = useState<ChartData | null>(null);
  const [birthDatetime, setBirthDatetime] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [generatingMeta, setGeneratingMeta] = useState<ReportTypeMeta | null>(null);
  const [genProgress, setGenProgress] = useState({ phase: "Initializing...", current: 0, total: 0 });
  const [noProfile, setNoProfile] = useState(false);

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setNoProfile(true); return; }
    const profile = getProfile(id);
    if (!profile) { setNoProfile(true); return; }
    setProfileId(id);
    setProfileName(profile.name ?? "Your");
    const cached = getCachedChart(id);
    setChart(cached);
    const dt = (cached as ChartData & { birthDatetime?: string })?.birthDatetime ??
      (profile.birthDate && profile.birthTime ? `${profile.birthDate}T${profile.birthTime}:00` : null);
    setBirthDatetime(dt);
    setReports(listReports(id));
  }, []);

  const latestByType = Object.fromEntries(
    REPORT_TYPES.map(rt => {
      const matching = reports.filter(r => r.type === rt.id && r.status !== "generating")
        .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
      return [rt.id, matching[0] ?? null];
    })
  );

  const handleGenerate = async (meta: ReportTypeMeta) => {
    if (!chart || !profileId || !birthDatetime) return;

    const shell = createReportShell(profileId, meta.id, meta.title, meta.subtitle, meta.expiryDays, birthDatetime);
    saveReport(shell);
    setReports(listReports(profileId));
    setGeneratingMeta(meta);
    setGenProgress({ phase: "Starting technique agents...", current: 0, total: meta.techniques.length });

    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: meta.id,
          chart,
          birthDatetime,
          profileId,
          reportId: shell.id,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Generation failed");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let doneCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") break;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "start") {
              setGenProgress({ phase: "Running technique agents...", current: 0, total: evt.totalTechniques });
            } else if (evt.type === "technique_start") {
              setGenProgress(p => ({ ...p, phase: `Analyzing: ${evt.label}...` }));
            } else if (evt.type === "technique_done") {
              doneCount++;
              setGenProgress(p => ({ ...p, current: doneCount }));
            } else if (evt.type === "synthesizing") {
              setGenProgress(p => ({ ...p, phase: "Synthesizing & scoring convergences..." }));
            } else if (evt.type === "complete") {
              const t1 = Date.now();
              const finalReport: Report = {
                ...shell,
                status: "ready",
                sections: evt.sections,
                headline: evt.headline,
                overallConfidence: evt.overallConfidence,
                techniquesSummary: evt.techniquesSummary,
                metadata: {
                  ...shell.metadata,
                  generationMs: t1 - new Date(shell.generatedAt).getTime(),
                },
              };
              saveReport(finalReport);
              setReports(listReports(profileId));
              setGeneratingMeta(null);
              router.push(`/dashboard/reports/${shell.id}`);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      setGeneratingMeta(null);
    }
  };

  if (noProfile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#04050E" }}>
        <Sidebar />
        <div style={{ textAlign: "center", padding: 32 }}>
          <p style={{ color: "#C8A55B", fontSize: 14, fontFamily: "'Cormorant Garamond', serif", marginBottom: 8 }}>
            Birth data required to generate reports.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#04050E" }}>
      <Sidebar />

      <AnimatePresence>
        {generatingMeta && (
          <GeneratingOverlay
            meta={generatingMeta}
            progress={genProgress}
            onClose={() => setGeneratingMeta(null)}
          />
        )}
      </AnimatePresence>

      <div style={{ marginLeft: 64, padding: "0 0 80px" }}>

        {/* ── Header ── */}
        <div style={{
          padding: "52px 52px 40px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p style={{
              color: "#C8A55B", fontSize: 8, letterSpacing: "0.28em",
              fontFamily: "'Fragment Mono', monospace", marginBottom: 12,
              textTransform: "uppercase",
            }}>
              Cosmora Intelligence Reports
            </p>
            <h1 style={{
              color: "#F0EDE8", fontSize: 42,
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 500, lineHeight: 1.1, marginBottom: 12,
            }}>
              {profileName}&rsquo;s<br />
              <span style={{ color: "#C8A55B", fontStyle: "italic" }}>Cosmic Intelligence File</span>
            </h1>
            <p style={{
              color: "rgba(200,190,178,0.5)", fontSize: 14,
              fontFamily: "'Cormorant Garamond', serif",
              maxWidth: 520, lineHeight: 1.6,
            }}>
              Each report is generated by multiple astrological technique agents running in parallel,
              then cross-referenced for convergence and scored for confidence. Precise. Personalized. Unrepeatable.
            </p>
          </motion.div>
        </div>

        <div style={{ padding: "40px 52px", maxWidth: 1200 }}>

          {/* ── Report history ── */}
          {reports.filter(r => r.status !== "generating").length > 0 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
              style={{ marginBottom: 48 }}
            >
              <p style={{
                color: "rgba(255,255,255,0.25)", fontSize: 8, letterSpacing: "0.18em",
                fontFamily: "'Fragment Mono', monospace", marginBottom: 14,
                textTransform: "uppercase",
              }}>
                Intelligence Archive
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 600 }}>
                {reports.filter(r => r.status !== "generating").slice(0, 8).map(r => (
                  <HistoryRow
                    key={r.id} report={r}
                    onClick={() => router.push(`/dashboard/reports/${r.id}`)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Report type catalog ── */}
          <div>
            <p style={{
              color: "rgba(255,255,255,0.25)", fontSize: 8, letterSpacing: "0.18em",
              fontFamily: "'Fragment Mono', monospace", marginBottom: 20,
              textTransform: "uppercase",
            }}>
              Available Reports
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: 16,
            }}>
              {REPORT_TYPES.map((meta, i) => (
                <motion.div
                  key={meta.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 + 0.15 }}
                >
                  <ReportTypeCard
                    meta={meta}
                    existingReport={latestByType[meta.id]}
                    onGenerate={handleGenerate}
                    generating={!!generatingMeta}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
