"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { ChartData } from "@/lib/astrology/types";
import { getOraclePersona } from "@/lib/storage";
import { REPORT_TYPES } from "@/lib/reports/types";
import type { Report, ReportType } from "@/lib/reports/types";
import { listReports, saveReport, createReportShell } from "@/lib/reports/storage";

// Shared "generate the real report" CTA, embeddable on any technique page (ZR,
// Transits, Compatibility, ...) so each feature's deep-dive view links straight
// into the app's actual multi-technique report system instead of reinventing
// its own one-off synthesis.
export function FullReportCard({
  reportTypeId, chart, profileId, partnerChart, partnerName, titleOverride,
  extraBody, picker, canGenerate = true,
}: {
  reportTypeId: ReportType;
  chart: ChartData;
  profileId: string;
  // Two-chart reports (e.g. compatibility) — pass the second person's chart/name.
  partnerChart?: ChartData;
  partnerName?: string;
  titleOverride?: string;
  // Configurable reports (e.g. full synthesis) — extra fields merged into the
  // generate request, an optional picker UI rendered above the button, and a
  // gate disabling Generate until the picker has a valid selection.
  extraBody?: Record<string, unknown>;
  picker?: React.ReactNode;
  canGenerate?: boolean;
}) {
  const router = useRouter();
  const meta = useMemo(() => REPORT_TYPES.find(r => r.id === reportTypeId)!, [reportTypeId]);

  // A plain derived value, not cached state — re-reads storage whenever the
  // profile/partner changes. We navigate away via router.push right after a
  // successful generation, so this never needs to reflect its own write.
  const existingReport = useMemo(() => {
    const matching = listReports(profileId)
      .filter(r => r.type === reportTypeId && r.status === "ready" && (!partnerName || r.metadata.partnerName === partnerName))
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    return matching[0] ?? null;
  }, [profileId, reportTypeId, partnerName]);
  const [generating, setGenerating] = useState(false);
  const [phase, setPhase] = useState("");

  const isReady = existingReport?.status === "ready" && new Date(existingReport.expiresAt) >= new Date();

  const generate = async () => {
    setGenerating(true);
    setPhase("Starting technique agents...");

    const birthDatetime = (chart as ChartData & { birthDatetime?: string }).birthDatetime ?? "";
    const title = titleOverride ?? meta.title;
    const shell = createReportShell(profileId, meta.id, title, meta.subtitle, meta.expiryDays, birthDatetime, partnerName);
    saveReport(shell);

    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: meta.id,
          chart,
          partnerChart,
          partnerName,
          birthDatetime,
          profileId,
          reportId: shell.id,
          persona: getOraclePersona(),
          ...extraBody,
        }),
      });
      if (!res.ok || !res.body) throw new Error("Generation failed");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

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
            if (evt.type === "technique_start") setPhase(`Analyzing: ${evt.label}...`);
            else if (evt.type === "synthesizing") setPhase("Synthesizing findings...");
            else if (evt.type === "complete") {
              const finalReport: Report = {
                ...shell,
                status: "ready",
                sections: evt.sections,
                headline: evt.headline,
                overallConfidence: evt.overallConfidence,
                techniquesSummary: evt.techniquesSummary,
                metadata: { ...shell.metadata, persona: evt.persona ?? "oracle" },
              };
              saveReport(finalReport);
              router.push(`/dashboard/reports/${shell.id}`);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      setGenerating(false);
    }
  };

  const disabled = generating || !canGenerate;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 mb-5 flex flex-col gap-3"
      style={{ background: `${meta.color}08`, border: `1px solid ${meta.color}25` }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}35`, color: meta.color }}
          >
            {meta.icon}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-bold" style={{ color: "#D4CEBD", fontFamily: "'Cormorant Garamond', serif" }}>
              {isReady ? "Full report ready" : `Full ${titleOverride ?? meta.title} report`}
            </p>
            <p className="text-[13px] truncate" style={{ color: "#64748b" }}>
              {generating ? phase : meta.description}
            </p>
          </div>
        </div>
        {isReady ? (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => router.push(`/dashboard/reports/${existingReport!.id}`)}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-[13px] font-bold tracking-widest cursor-pointer"
            style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}40`, color: meta.color }}
          >
            VIEW REPORT →
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: disabled ? 1 : 1.03 }} whileTap={{ scale: disabled ? 1 : 0.97 }}
            onClick={generate}
            disabled={disabled}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-[13px] font-bold tracking-widest cursor-pointer"
            style={{
              background: disabled ? "rgba(255,255,255,0.04)" : `linear-gradient(135deg, ${meta.color}24, ${meta.color}10)`,
              border: `1px solid ${disabled ? "rgba(255,255,255,0.08)" : meta.color + "50"}`,
              color: disabled ? "rgba(255,255,255,0.3)" : meta.color,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {generating ? "GENERATING…" : "GENERATE FULL REPORT"}
          </motion.button>
        )}
      </div>
      {picker && !isReady && !generating && (
        <div className="pt-1" style={{ borderTop: `1px solid ${meta.color}15` }}>
          {picker}
        </div>
      )}
    </motion.div>
  );
}
