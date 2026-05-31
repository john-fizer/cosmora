import type { Report, ReportFeedback, TrainingEntry, QualityFlag, SectionFeedback } from "./types";

const reportsKey  = (pid: string) => `cosmora_reports_${pid}`;
const trainingKey = (pid: string) => `cosmora_training_${pid}`;
const feedbackKey = (pid: string) => `cosmora_feedback_${pid}`;

function uuid(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Reports ───────────────────────────────────────────────────────────────────

export function listReports(profileId: string): Report[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(reportsKey(profileId)) ?? "[]"); } catch { return []; }
}

export function getReport(profileId: string, reportId: string): Report | null {
  return listReports(profileId).find(r => r.id === reportId) ?? null;
}

export function saveReport(report: Report): void {
  if (typeof window === "undefined") return;
  const list = listReports(report.profileId).filter(r => r.id !== report.id);
  // Keep max 50 reports per profile, newest first
  const trimmed = [report, ...list].slice(0, 50);
  localStorage.setItem(reportsKey(report.profileId), JSON.stringify(trimmed));
}

export function updateReportStatus(profileId: string, reportId: string, status: Report["status"]): void {
  const list = listReports(profileId).map(r => r.id === reportId ? { ...r, status } : r);
  localStorage.setItem(reportsKey(profileId), JSON.stringify(list));
}

export function deleteReport(profileId: string, reportId: string): void {
  const list = listReports(profileId).filter(r => r.id !== reportId);
  localStorage.setItem(reportsKey(profileId), JSON.stringify(list));
}

// Returns reports that have passed their expiresAt and haven't been given feedback yet
export function getExpiredPendingFeedback(profileId: string): Report[] {
  const now = new Date();
  return listReports(profileId).filter(r =>
    r.status === "ready" && new Date(r.expiresAt) < now
  );
}

// ─── Feedback ──────────────────────────────────────────────────────────────────

export function listFeedback(profileId: string): ReportFeedback[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(feedbackKey(profileId)) ?? "[]"); } catch { return []; }
}

export function saveFeedback(profileId: string, fb: Omit<ReportFeedback, "id" | "submittedAt" | "qualityFlag">): ReportFeedback {
  const qualityFlag = detectQualityFlag(fb.sectionFeedback, fb.overallAccuracy);
  const full: ReportFeedback = {
    ...fb,
    id: uuid(),
    submittedAt: new Date().toISOString(),
    qualityFlag,
  };
  const list = listFeedback(profileId);
  list.unshift(full);
  localStorage.setItem(feedbackKey(profileId), JSON.stringify(list.slice(0, 200)));

  // Mark the report as feedback_given
  updateReportStatus(profileId, fb.reportId, "feedback_given");

  // If consented, write training entries
  if (fb.consentToTrain) {
    const report = getReport(profileId, fb.reportId);
    if (report) {
      const entries: TrainingEntry[] = fb.sectionFeedback.map(sf => {
        const section = report.sections.find(s => s.id === sf.sectionId);
        return {
          id: uuid(),
          feedbackId: full.id,
          reportType: report.type,
          technique: section?.technique ?? "unknown",
          sectionBody: section?.body ?? "",
          accuracy: sf.accuracy,
          qualityFlag,
          storedAt: new Date().toISOString(),
        };
      });
      appendTrainingEntries(profileId, entries);
    }
  }

  return full;
}

// ─── Training data ─────────────────────────────────────────────────────────────

export function listTrainingEntries(profileId: string): TrainingEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(trainingKey(profileId)) ?? "[]"); } catch { return []; }
}

function appendTrainingEntries(profileId: string, entries: TrainingEntry[]): void {
  const list = listTrainingEntries(profileId);
  const merged = [...entries, ...list].slice(0, 5000);
  localStorage.setItem(trainingKey(profileId), JSON.stringify(merged));
}

// ─── Quality flag heuristics ───────────────────────────────────────────────────

function detectQualityFlag(sections: SectionFeedback[], overall: number): QualityFlag {
  if (!sections.length) return "uncertain";

  const scores = sections.map(s => s.accuracy);
  const allSame = scores.every(s => s === scores[0]);
  const allExtreme = scores.every(s => s === 1 || s === 5);
  const hasNotes = sections.some(s => s.notes && s.notes.trim().length > 10);
  const variance = scores.reduce((acc, s) => acc + (s - overall) ** 2, 0) / scores.length;

  // Suspicious if: all extreme scores, all same, no notes, very low variance
  if (allExtreme && allSame && !hasNotes) return "possibly_sabotaged";
  if (sections.length < 2 && !hasNotes)   return "uncertain";
  if (variance < 0.1 && !hasNotes)        return "uncertain";

  return "reliable";
}

// ─── Utility: create a blank report shell ─────────────────────────────────────

export function createReportShell(
  profileId: string,
  type: import("./types").ReportType,
  title: string,
  subtitle: string,
  expiryDays: number,
  birthDatetime: string,
): Report {
  const now = new Date();
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + expiryDays);

  return {
    id: uuid(),
    profileId,
    type,
    title,
    subtitle,
    generatedAt: now.toISOString(),
    expiresAt: expiry.toISOString(),
    status: "generating",
    sections: [],
    overallConfidence: 0,
    headline: "",
    techniquesSummary: [],
    metadata: {
      birthDatetime,
      chartHash: btoa(birthDatetime).slice(0, 12),
      modelId: "claude-sonnet-4-6",
      generationMs: 0,
    },
  };
}
