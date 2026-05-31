"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { getActiveProfileId } from "@/lib/storage";
import { REPORT_TYPES } from "@/lib/reports/types";
import type { Report, ReportSection, ReportTypeMeta, SectionFeedback } from "@/lib/reports/types";
import { getReport, saveFeedback, updateReportStatus } from "@/lib/reports/storage";

// ─── Confidence gauge (detailed) ───────────────────────────────────────────────

function ConfidenceMeter({ value, color, label }: { value: number; color: string; label?: string }) {
  const pct = Math.round(value * 100);
  const ticks = 20;
  const filled = Math.round(value * ticks);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", gap: 1.5, alignItems: "flex-end" }}>
        {Array.from({ length: ticks }, (_, i) => {
          const h = 4 + (i / ticks) * 10;
          return (
            <motion.div
              key={i}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.02, duration: 0.3 }}
              style={{
                width: 2, height: h,
                borderRadius: 1,
                background: i < filled ? color : "rgba(255,255,255,0.07)",
                transformOrigin: "bottom",
              }}
            />
          );
        })}
      </div>
      <div>
        <span style={{ color, fontSize: 11, fontFamily: "'Fragment Mono', monospace", fontWeight: "bold" }}>
          {pct}%
        </span>
        {label && (
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 8, fontFamily: "'Fragment Mono', monospace", marginLeft: 4 }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Section card ──────────────────────────────────────────────────────────────

function SectionCard({
  section, index, color, visible,
}: {
  section: ReportSection; index: number; color: string; visible: boolean;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={section.id}
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1], delay: index * 0.12 }}
          style={{
            padding: "32px 36px",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          {/* Section header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              {section.subheading && (
                <p style={{
                  color: color + "99", fontSize: 7.5, letterSpacing: "0.2em",
                  fontFamily: "'Fragment Mono', monospace", marginBottom: 5,
                  textTransform: "uppercase",
                }}>
                  {section.subheading}
                </p>
              )}
              <h3 style={{
                color: "#EDE8DC", fontSize: 22,
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600, lineHeight: 1.15,
              }}>
                {section.heading}
              </h3>
            </div>
            <div style={{ flexShrink: 0, marginLeft: 20 }}>
              <ConfidenceMeter value={section.confidence} color={color} label="confidence" />
            </div>
          </div>

          {/* Time window */}
          {section.timeWindow && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: `${color}0E`, border: `1px solid ${color}25`,
              borderRadius: 4, padding: "3px 10px", marginBottom: 16,
            }}>
              <span style={{ color, fontSize: 7, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.1em" }}>
                ◷ {section.timeWindow.label}
              </span>
            </div>
          )}

          {/* Body text */}
          <div style={{
            color: "rgba(220,212,198,0.82)", fontSize: 15.5,
            fontFamily: "'Cormorant Garamond', serif",
            lineHeight: 1.78,
          }}>
            {section.body.split("\n\n").map((para, i) => (
              <p key={i} style={{ marginBottom: i < section.body.split("\n\n").length - 1 ? "1.1em" : 0 }}>
                {para.trim()}
              </p>
            ))}
          </div>

          {/* Technique tag */}
          <div style={{ marginTop: 18 }}>
            <span style={{
              fontSize: 7, color: "rgba(255,255,255,0.18)",
              fontFamily: "'Fragment Mono', monospace",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 3, padding: "2px 7px", letterSpacing: "0.06em",
            }}>
              {section.technique.replace(/_/g, " ")}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Feedback modal ────────────────────────────────────────────────────────────

function FeedbackModal({
  report, meta, onClose, onSubmit,
}: {
  report: Report;
  meta: ReportTypeMeta;
  onClose: () => void;
  onSubmit: (fb: Omit<import("@/lib/reports/types").ReportFeedback, "id" | "submittedAt" | "qualityFlag">) => void;
}) {
  const [sectionRatings, setSectionRatings] = useState<Record<string, 1 | 2 | 3 | 4 | 5>>({});
  const [overall, setOverall] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const profileId = getActiveProfileId() ?? "";

  const allRated = report.sections.every(s => sectionRatings[s.id]);

  const handleSubmit = () => {
    const sectionFeedback: SectionFeedback[] = report.sections.map(s => ({
      sectionId: s.id,
      accuracy: sectionRatings[s.id] ?? 3,
    }));
    onSubmit({ reportId: report.id, profileId, sectionFeedback, overallAccuracy: overall, notes, consentToTrain: consent });
  };

  const StarRow = ({ value, onChange }: { value: number; onChange: (v: 1 | 2 | 3 | 4 | 5) => void }) => (
    <div style={{ display: "flex", gap: 4 }}>
      {([1, 2, 3, 4, 5] as const).map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{
            fontSize: 16, background: "none", border: "none",
            cursor: "pointer", opacity: n <= value ? 1 : 0.25,
            color: meta.color,
            transition: "opacity 0.15s",
          }}
        >
          ★
        </button>
      ))}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(4,5,14,0.88)",
        backdropFilter: "blur(16px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          width: "100%", maxWidth: 540, maxHeight: "85vh",
          background: "#07080F",
          border: `1px solid ${meta.color}30`,
          borderRadius: 18,
          overflow: "hidden",
          display: "flex", flexDirection: "column",
          boxShadow: `0 0 60px ${meta.color}12`,
        }}
      >
        {/* Header */}
        <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
          <p style={{ color: meta.color, fontSize: 7.5, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 6 }}>
            ACCURACY REVIEW
          </p>
          <h3 style={{ color: "#EDE8DC", fontSize: 20, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>
            How did this reading land?
          </h3>
          <p style={{ color: "rgba(200,190,178,0.45)", fontSize: 12, fontFamily: "'Cormorant Garamond', serif", marginTop: 4, lineHeight: 1.5 }}>
            Your feedback refines the intelligence. Rate each section after the prediction window has passed.
          </p>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", scrollbarWidth: "none" }}>
          {/* Section ratings */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
            {report.sections.map(s => (
              <div key={s.id} style={{
                padding: "12px 16px",
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 10,
              }}>
                <p style={{ color: "#C0B89E", fontSize: 12, fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, marginBottom: 8 }}>
                  {s.heading}
                </p>
                <StarRow value={sectionRatings[s.id] ?? 0} onChange={v => setSectionRatings(p => ({ ...p, [s.id]: v }))} />
              </div>
            ))}
          </div>

          {/* Overall */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 8, letterSpacing: "0.14em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>
              OVERALL ACCURACY
            </p>
            <StarRow value={overall} onChange={setOverall} />
          </div>

          {/* Notes */}
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="What was accurate? What missed? (optional)"
            style={{
              width: "100%", minHeight: 72,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, color: "rgba(200,190,178,0.7)",
              fontSize: 12, fontFamily: "'Cormorant Garamond', serif",
              padding: "10px 12px", resize: "vertical",
              outline: "none", boxSizing: "border-box",
              lineHeight: 1.5, marginBottom: 20,
            }}
          />

          {/* Consent */}
          <div
            onClick={() => setConsent(c => !c)}
            style={{
              display: "flex", gap: 10, alignItems: "flex-start",
              cursor: "pointer", marginBottom: 8, padding: "10px 14px",
              background: consent ? `${meta.color}0A` : "rgba(255,255,255,0.02)",
              border: `1px solid ${consent ? meta.color + "30" : "rgba(255,255,255,0.05)"}`,
              borderRadius: 8,
            }}
          >
            <div style={{
              width: 14, height: 14, borderRadius: 3,
              border: `1px solid ${consent ? meta.color : "rgba(255,255,255,0.2)"}`,
              background: consent ? meta.color : "transparent",
              flexShrink: 0, marginTop: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}>
              {consent && <span style={{ color: "#000", fontSize: 9, lineHeight: 1 }}>✓</span>}
            </div>
            <p style={{ color: "rgba(200,190,178,0.55)", fontSize: 11, fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.5 }}>
              I consent to this feedback being used to improve future readings. My data will be anonymized and stored with a quality flag.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 10, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "10px 0",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, color: "rgba(255,255,255,0.3)",
              fontSize: 8.5, letterSpacing: "0.1em",
              fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
            }}
          >
            SKIP
          </button>
          <button
            onClick={handleSubmit}
            disabled={!allRated}
            style={{
              flex: 2, padding: "10px 0",
              background: allRated ? `linear-gradient(135deg, ${meta.color}28, ${meta.color}14)` : "rgba(255,255,255,0.03)",
              border: `1px solid ${allRated ? meta.color + "50" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 8, color: allRated ? meta.color : "rgba(255,255,255,0.2)",
              fontSize: 8.5, letterSpacing: "0.1em",
              fontFamily: "'Fragment Mono', monospace",
              cursor: allRated ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}
          >
            SUBMIT REVIEW
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main report view ──────────────────────────────────────────────────────────

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [meta, setMeta] = useState<ReportTypeMeta | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const pid = getActiveProfileId();
    if (!pid || !id) return;
    const r = getReport(pid, id);
    if (!r) { router.push("/dashboard/reports"); return; }
    setReport(r);
    setMeta(REPORT_TYPES.find(t => t.id === r.type) ?? null);

    if (r.status === "feedback_given") setFeedbackDone(true);

    // Check if expired and needs feedback
    const expired = new Date(r.expiresAt) < new Date();
    if (expired && r.status === "ready") {
      updateReportStatus(pid, id, "feedback_requested");
      setTimeout(() => setShowFeedback(true), 1500);
    }
  }, [id, router]);

  // Staggered section reveal
  useEffect(() => {
    if (!report?.sections.length) return;
    setVisibleCount(0);
    let i = 0;
    timerRef.current = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= report.sections.length && timerRef.current) {
        clearInterval(timerRef.current);
      }
    }, 150);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [report?.id, report?.sections.length]);

  const handleFeedbackSubmit = (fb: Parameters<typeof saveFeedback>[1]) => {
    const pid = getActiveProfileId();
    if (!pid) return;
    saveFeedback(pid, fb);
    setShowFeedback(false);
    setFeedbackDone(true);
  };

  if (!report || !meta) return null;

  const isExpired = new Date(report.expiresAt) < new Date();
  const expiryFormatted = new Date(report.expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: "#04050E" }}>
      <Sidebar />

      <AnimatePresence>
        {showFeedback && (
          <FeedbackModal
            report={report}
            meta={meta}
            onClose={() => setShowFeedback(false)}
            onSubmit={handleFeedbackSubmit}
          />
        )}
      </AnimatePresence>

      <div style={{ marginLeft: 64 }}>

        {/* ── Report header ── */}
        <div style={{
          padding: "44px 52px 36px",
          background: `linear-gradient(180deg, ${meta.color}08 0%, transparent 100%)`,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

            {/* Breadcrumb */}
            <button
              onClick={() => router.push("/dashboard/reports")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.25)", fontSize: 8,
                fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.12em",
                marginBottom: 20, padding: 0, display: "flex", alignItems: "center", gap: 6,
              }}
            >
              ← REPORTS
            </button>

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
              <div>
                <p style={{
                  color: meta.color, fontSize: 8, letterSpacing: "0.24em",
                  fontFamily: "'Fragment Mono', monospace", marginBottom: 8,
                  textTransform: "uppercase",
                }}>
                  {meta.subtitle}
                </p>
                <h1 style={{
                  color: "#F0EDE8", fontSize: 36,
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600, lineHeight: 1.1, marginBottom: 10,
                }}>
                  {meta.title}
                </h1>
                <p style={{
                  color: "rgba(255,255,255,0.22)", fontSize: 8,
                  fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.1em",
                }}>
                  Generated {new Date(report.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  {" · "}
                  {isExpired ? (
                    <span style={{ color: "#FF8060" }}>Expired {expiryFormatted}</span>
                  ) : (
                    <span>Valid until {expiryFormatted}</span>
                  )}
                </p>
              </div>

              {/* Overall confidence */}
              <div style={{
                padding: "16px 22px",
                background: `${meta.color}0E`,
                border: `1px solid ${meta.color}25`,
                borderRadius: 12,
              }}>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 7.5, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.12em", marginBottom: 8 }}>
                  OVERALL CONFIDENCE
                </p>
                <ConfidenceMeter value={report.overallConfidence} color={meta.color} />
                <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 7.5, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.08em", marginTop: 8 }}>
                  {report.sections.length} technique agents
                </p>
              </div>
            </div>

            {/* Headline */}
            {report.headline && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{
                  marginTop: 24, padding: "18px 24px",
                  background: `linear-gradient(135deg, ${meta.color}0C, rgba(255,255,255,0.02))`,
                  border: `1px solid ${meta.color}20`,
                  borderLeft: `3px solid ${meta.color}80`,
                  borderRadius: "0 10px 10px 0",
                }}
              >
                <p style={{
                  color: "#EDE8DC", fontSize: 17,
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: "italic", lineHeight: 1.65,
                }}>
                  &ldquo;{report.headline}&rdquo;
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* ── Sections ── */}
        <div style={{ maxWidth: 820, padding: "0 52px 40px" }}>
          {report.sections.map((section, i) => (
            <SectionCard
              key={section.id}
              section={section}
              index={i}
              color={meta.color}
              visible={i < visibleCount}
            />
          ))}
        </div>

        {/* ── Footer actions ── */}
        {visibleCount >= report.sections.length && report.sections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              padding: "24px 52px 60px",
              display: "flex", gap: 12, alignItems: "center",
              borderTop: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            {!feedbackDone && !isExpired && (
              <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
                Accuracy review available after {expiryFormatted}
              </p>
            )}
            {!feedbackDone && isExpired && (
              <button
                onClick={() => setShowFeedback(true)}
                style={{
                  padding: "9px 22px",
                  background: `${meta.color}15`,
                  border: `1px solid ${meta.color}40`,
                  borderRadius: 8, color: meta.color,
                  fontSize: 8.5, letterSpacing: "0.12em",
                  fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
                }}
              >
                ★ RATE ACCURACY
              </button>
            )}
            {feedbackDone && (
              <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
                Thank you for your review. Your feedback improves the intelligence.
              </p>
            )}
            <button
              onClick={() => router.push("/dashboard/reports")}
              style={{
                padding: "9px 22px", marginLeft: "auto",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8, color: "rgba(255,255,255,0.3)",
                fontSize: 8.5, letterSpacing: "0.12em",
                fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
              }}
            >
              ← ALL REPORTS
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
