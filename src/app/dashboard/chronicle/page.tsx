"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { getActiveProfileId, getProfile, getCachedChart, generateId } from "@/lib/storage";
import type { StoredProfile } from "@/lib/storage";
import type { ChartData } from "@/lib/astrology/types";
import {
  EVENT_TYPE_META, DOMAINS, TONES, confidenceForPrecision,
} from "@/lib/chronicle/types";
import type { LifeEvent, Person, ChronicleEventType, DatePrecision, EdgeType, Reflection } from "@/lib/chronicle/types";
import {
  getChronicle, upsertEvent, deleteEvent, upsertPerson, exportChronicle, importChronicle,
} from "@/lib/chronicle/storage";
import type { ChronicleExport } from "@/lib/chronicle/storage";
import { computeSkyState, topTokens } from "@/lib/chronicle/sky-state";
import type { SkyState } from "@/lib/chronicle/sky-state";

const MONO = "'Fragment Mono', monospace";
const SERIF = "'Cormorant Garamond', serif";
const GOLD = "#C8A55B";
const BORDER = "1px solid rgba(40,60,100,0.3)";

const BIO_PROMPTS = [
  "Top 5 turning points", "Major relationships", "Career timeline",
  "Moves & homes", "Health & crisis points", "Spiritual shifts", "Creative milestones",
];

const EDGE_LABELS: Record<EdgeType, string> = { echoes: "echoes", follows: "follows", caused_by: "caused by", part_of: "part of" };

function tokenChip(token: string): string {
  // compact display: T.Saturn.square.Moon.H4 → ♄ □ ☽ H4
  const GLYPH: Record<string, string> = { Sun:"☉",Moon:"☽",Mercury:"☿",Venus:"♀",Mars:"♂",Jupiter:"♃",Saturn:"♄",Uranus:"⛢",Neptune:"♆",Pluto:"♇",Ascendant:"ASC",Midheaven:"MC" };
  const ASP: Record<string, string> = { conj:"☌", sextile:"⚹", square:"□", trine:"△", opp:"☍" };
  const parts = token.split(".");
  if (parts[0] === "T") return `${GLYPH[parts[1]] ?? parts[1]} ${ASP[parts[2]] ?? parts[2]} ${GLYPH[parts[3]] ?? parts[3]} ${parts[4]}`;
  if (parts[0] === "L") return parts.slice(1).join(" ");
  if (parts[0] === "E") return `${parts[1]} eclipse ${parts[2]}d`;
  return token;
}

function fmtDate(e: LifeEvent): string {
  const pre = e.datePrecision === "exact" ? "" : "~";
  const d = e.startsAt.slice(0, e.datePrecision === "year" ? 4 : e.datePrecision === "month" ? 7 : 10);
  return e.endsAt ? `${pre}${d} → ${e.endsAt.slice(0, 10)}` : `${pre}${d}`;
}

// ─── Chip toggle row ─────────────────────────────────────────────────────────
function ChipRow({ options, selected, onToggle, color }: {
  options: readonly string[]; selected: string[]; onToggle: (v: string) => void; color: string;
}) {
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {options.map(o => {
        const on = selected.includes(o);
        return (
          <button key={o} onClick={() => onToggle(o)} style={{
            padding: "3px 10px", borderRadius: 16, cursor: "pointer",
            background: on ? `${color}18` : "transparent",
            border: `1px solid ${on ? color + "50" : "rgba(40,60,100,0.35)"}`,
            color: on ? color : "#445577", fontSize: 9, fontFamily: MONO, letterSpacing: "0.08em",
          }}>{o}</button>
        );
      })}
    </div>
  );
}

// ─── Quick-add / edit form ──────────────────────────────────────────────────
interface FormState {
  id?: string;
  title: string; eventType: ChronicleEventType; startsAt: string; endsAt: string;
  datePrecision: DatePrecision; locationName: string;
  domains: string[]; emotionalTone: string[];
  valenceSign: "positive" | "negative" | "mixed"; intensityDots: number;
  narrative: string; people: string[];
}
const emptyForm = (): FormState => ({
  title: "", eventType: "decision", startsAt: "", endsAt: "", datePrecision: "exact",
  locationName: "", domains: [], emotionalTone: [], valenceSign: "positive", intensityDots: 3,
  narrative: "", people: [],
});

function EventForm({ initial, people, onSave, onCancel, onCreatePerson }: {
  initial: FormState; people: Person[];
  onSave: (f: FormState) => void; onCancel: () => void;
  onCreatePerson: (name: string) => Person;
}) {
  const [f, setF] = useState<FormState>(initial);
  const [newPerson, setNewPerson] = useState("");
  const set = (patch: Partial<FormState>) => setF(prev => ({ ...prev, ...patch }));
  const inputStyle = {
    width: "100%", padding: "8px 10px", background: "rgba(10,15,35,0.7)", border: BORDER,
    borderRadius: 8, color: "#C0D4FF", fontSize: 12, fontFamily: MONO, outline: "none", boxSizing: "border-box" as const,
  };
  const label = (t: string) => (
    <p style={{ color: "#445577", fontSize: 8, fontFamily: MONO, letterSpacing: "0.15em", margin: "12px 0 5px" }}>{t}</p>
  );
  return (
    <div>
      {label("TITLE")}
      <input style={inputStyle} value={f.title} onChange={e => set({ title: e.target.value })} placeholder="What happened" />
      {label("EVENT TYPE")}
      <select style={{ ...inputStyle, cursor: "pointer" }} value={f.eventType} onChange={e => set({ eventType: e.target.value as ChronicleEventType })}>
        {Object.entries(EVENT_TYPE_META).map(([k, m]) => <option key={k} value={k}>{m.glyph} {m.label}</option>)}
      </select>
      {label("DATE PRECISION")}
      <div style={{ display: "flex", gap: 5 }}>
        {(["exact", "month", "year", "period"] as DatePrecision[]).map(p => (
          <button key={p} onClick={() => set({ datePrecision: p })} style={{
            padding: "4px 12px", borderRadius: 16, cursor: "pointer", fontSize: 9, fontFamily: MONO,
            background: f.datePrecision === p ? `${GOLD}18` : "transparent",
            border: `1px solid ${f.datePrecision === p ? GOLD + "50" : "rgba(40,60,100,0.35)"}`,
            color: f.datePrecision === p ? GOLD : "#445577",
          }}>{p.toUpperCase()}</button>
        ))}
      </div>
      {label(f.datePrecision === "period" ? "START DATE" : "DATE")}
      <input type="date" style={inputStyle} value={f.startsAt} onChange={e => set({ startsAt: e.target.value })} />
      {f.datePrecision === "period" && (<>
        {label("END DATE (OPTIONAL)")}
        <input type="date" style={inputStyle} value={f.endsAt} onChange={e => set({ endsAt: e.target.value })} />
      </>)}
      {label("INTENSITY")}
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => set({ intensityDots: n })} style={{
            width: 18, height: 18, borderRadius: "50%", cursor: "pointer", border: `1px solid ${GOLD}60`,
            background: n <= f.intensityDots ? GOLD : "transparent",
          }} />
        ))}
      </div>
      {label("THIS WAS")}
      <div style={{ display: "flex", gap: 5 }}>
        {(["positive", "negative", "mixed"] as const).map(v => (
          <button key={v} onClick={() => set({ valenceSign: v })} style={{
            padding: "4px 12px", borderRadius: 16, cursor: "pointer", fontSize: 9, fontFamily: MONO,
            background: f.valenceSign === v ? "rgba(123,111,212,0.15)" : "transparent",
            border: `1px solid ${f.valenceSign === v ? "#7B6FD4" : "rgba(40,60,100,0.35)"}`,
            color: f.valenceSign === v ? "#BFB6E8" : "#445577",
          }}>{v.toUpperCase()}</button>
        ))}
      </div>
      {label("DOMAINS")}
      <ChipRow options={DOMAINS} selected={f.domains} color="#06b6d4"
        onToggle={v => set({ domains: f.domains.includes(v) ? f.domains.filter(x => x !== v) : [...f.domains, v] })} />
      {label("EMOTIONAL TONE")}
      <ChipRow options={TONES} selected={f.emotionalTone} color="#f472b6"
        onToggle={v => set({ emotionalTone: f.emotionalTone.includes(v) ? f.emotionalTone.filter(x => x !== v) : [...f.emotionalTone, v] })} />
      {label("PEOPLE")}
      <ChipRow options={people.map(p => p.name)} selected={f.people.map(id => people.find(p => p.id === id)?.name ?? "")} color="#a78bfa"
        onToggle={name => {
          const person = people.find(p => p.name === name); if (!person) return;
          set({ people: f.people.includes(person.id) ? f.people.filter(x => x !== person.id) : [...f.people, person.id] });
        }} />
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <input style={{ ...inputStyle, flex: 1 }} value={newPerson} onChange={e => setNewPerson(e.target.value)} placeholder="Add person…" />
        <button onClick={() => { if (newPerson.trim()) { const p = onCreatePerson(newPerson.trim()); set({ people: [...f.people, p.id] }); setNewPerson(""); } }}
          style={{ padding: "0 14px", borderRadius: 8, cursor: "pointer", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.35)", color: "#a78bfa", fontSize: 10, fontFamily: MONO }}>+</button>
      </div>
      {label("LOCATION (OPTIONAL)")}
      <input style={inputStyle} value={f.locationName} onChange={e => set({ locationName: e.target.value })} placeholder="City, place…" />
      {label("YOUR WORDS")}
      <textarea style={{ ...inputStyle, minHeight: 70, fontFamily: SERIF, fontSize: 13, resize: "vertical" }}
        value={f.narrative} onChange={e => set({ narrative: e.target.value })} placeholder="What happened, in your own words — this is preserved verbatim." />
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={() => onSave(f)} disabled={!f.title.trim() || !f.startsAt} style={{
          flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer", fontFamily: MONO, fontSize: 10, letterSpacing: "0.15em",
          background: `${GOLD}18`, border: `1px solid ${GOLD}50`, color: GOLD,
          opacity: !f.title.trim() || !f.startsAt ? 0.4 : 1,
        }}>SAVE EVENT</button>
        <button onClick={onCancel} style={{ padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, fontSize: 10, background: "transparent", border: BORDER, color: "#445577" }}>CANCEL</button>
      </div>
    </div>
  );
}

// ─── Expanded sky state view ─────────────────────────────────────────────────
function SkyStateView({ state }: { state: SkyState }) {
  const row = (label: string, value: string) => (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
      <span style={{ color: "#445577", fontSize: 8, fontFamily: MONO, letterSpacing: "0.12em", width: 74, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "#C0D4FF", fontSize: 11, fontFamily: MONO }}>{value}</span>
    </div>
  );
  return (
    <div style={{ background: "rgba(10,15,35,0.5)", border: BORDER, borderRadius: 10, padding: "12px 14px", marginTop: 10 }}>
      <p style={{ color: GOLD, fontSize: 8, fontFamily: MONO, letterSpacing: "0.18em", marginBottom: 8 }}>
        SKY STATE{state.approximate ? " · APPROXIMATE" : ""} · ENCODER v{state.encoderVersion}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {row("DASHA", `${state.dasha.major} / ${state.dasha.antar}`)}
        {row("FIRDARIA", `${state.firdaria.major} / ${state.firdaria.sub}`)}
        {row("ZR FORTUNE", `${state.zrFortune.l1Sign} · L2 ${state.zrFortune.l2Sign}`)}
        {row("PROFECTION", `Year ${state.profection.year} · House ${state.profection.house} · Lord ${state.profection.lordOfYear}`)}
        {state.eclipseProximity && row("ECLIPSE", `${state.eclipseProximity.kind} eclipse ${state.eclipseProximity.daysAway >= 0 ? "+" : ""}${state.eclipseProximity.daysAway}d`)}
      </div>
      {state.transitHits.length > 0 && (<>
        <p style={{ color: "#445577", fontSize: 8, fontFamily: MONO, letterSpacing: "0.15em", margin: "10px 0 6px" }}>TRANSIT HITS</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {state.transitHits.map((h, i) => (
            <div key={i} style={{ display: "flex", gap: 8, fontSize: 10, fontFamily: MONO }}>
              <span style={{ color: "#BFB6E8", width: 200 }}>{h.transitingBody} {h.aspect} {h.natalPoint}</span>
              <span style={{ color: "#445577" }}>orb {h.orb.toFixed(2)}° {h.applying ? "applying" : "separating"} · H{h.natalHouse}</span>
            </div>
          ))}
        </div>
      </>)}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function ChroniclePage() {
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [chart, setChart] = useState<ChartData | null>(null);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<"none" | "add" | "story" | "edit">("none");
  const [editForm, setEditForm] = useState<FormState | null>(null);
  const [storyText, setStoryText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [pending, setPending] = useState<{ events: Record<string, unknown>[]; people: Record<string, unknown>[] } | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sigQuery, setSigQuery] = useState("");
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  const [reflectingOn, setReflectingOn] = useState<string | null>(null);
  const [reflectionText, setReflectionText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = (pid: string) => {
    const data = getChronicle(pid);
    setEvents([...data.events].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
    setPeople(data.people);
  };

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) return;
    const p = getProfile(id);
    const c = getCachedChart(id);
    if (!p || !c) return;
    setProfile(p); setChart(c); reload(id);
  }, []);

  // Sky states for expanded card + signature search (computed on view, never stored)
  const skyStates = useMemo(() => {
    if (!chart || !profile) return new Map<string, SkyState>();
    const map = new Map<string, SkyState>();
    const need = sigQuery ? events : events.filter(e => e.id === expandedId);
    for (const e of need) map.set(e.id, computeSkyState(chart, profile, e.startsAt, e.datePrecision));
    return map;
  }, [chart, profile, events, expandedId, sigQuery]);

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (typeFilter !== "all" && e.eventType !== typeFilter) return false;
      if (sigQuery) {
        const state = skyStates.get(e.id);
        if (!state) return false;
        const terms = sigQuery.toLowerCase().split(/\s+/).filter(Boolean);
        const sig = state.signature.join(" ").toLowerCase();
        if (!terms.every(t => sig.includes(t))) return false;
      }
      return true;
    });
  }, [events, typeFilter, sigQuery, skyStates]);

  const byYear = useMemo(() => {
    const groups = new Map<string, LifeEvent[]>();
    for (const e of filtered) {
      const y = e.startsAt.slice(0, 4);
      if (!groups.has(y)) groups.set(y, []);
      groups.get(y)!.push(e);
    }
    return [...groups.entries()];
  }, [filtered]);

  const pid = profile?.id ?? "";

  const createPerson = (name: string): Person => {
    const p: Person = { id: generateId(), name, relationshipType: "other" };
    upsertPerson(pid, p); reload(pid); return p;
  };

  const saveForm = (f: FormState) => {
    const valence = f.valenceSign === "positive" ? 0.7 : f.valenceSign === "negative" ? -0.7 : 0;
    const ev: LifeEvent = {
      id: f.id ?? generateId(), schemaVersion: 1, title: f.title.trim(), eventType: f.eventType,
      startsAt: f.startsAt, endsAt: f.datePrecision === "period" && f.endsAt ? f.endsAt : undefined,
      datePrecision: f.datePrecision,
      location: f.locationName.trim() ? { name: f.locationName.trim() } : undefined,
      domains: f.domains, emotionalTone: f.emotionalTone,
      emotionalValence: valence, emotionalIntensity: f.intensityDots / 5,
      narrative: f.narrative, people: f.people,
      links: f.id ? (events.find(e => e.id === f.id)?.links ?? []) : [],
      reflections: f.id ? (events.find(e => e.id === f.id)?.reflections ?? []) : [],
      provenance: f.id
        ? (events.find(e => e.id === f.id)?.provenance ?? { source: "manual", confidence: confidenceForPrecision(f.datePrecision) })
        : { source: "manual", confidence: confidenceForPrecision(f.datePrecision) },
      createdAt: f.id ? (events.find(e => e.id === f.id)?.createdAt ?? new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    upsertEvent(pid, ev); reload(pid); setPanel("none"); setEditForm(null);
  };

  const runExtraction = async () => {
    setExtracting(true); setExtractError("");
    try {
      const res = await fetch("/api/chronicle/extract", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: storyText, existingPeople: people.map(p => ({ id: p.id, name: p.name })) }),
      });
      if (!res.ok) { setExtractError("Extraction failed — you can add events manually below."); setExtracting(false); return; }
      const data = await res.json();
      setPending(data);
    } catch { setExtractError("Extraction failed — you can add events manually below."); }
    setExtracting(false);
  };

  const confirmPendingEvent = (raw: Record<string, unknown>, idx: number) => {
    // resolve people names → ids (create if new)
    const names = (raw.peopleNames as string[] | undefined) ?? [];
    const ids: string[] = [];
    for (const name of names) {
      const existing = people.find(p => p.name.toLowerCase() === name.toLowerCase());
      ids.push(existing ? existing.id : createPerson(name).id);
    }
    const precision = (raw.datePrecision as DatePrecision) ?? "year";
    const ev: LifeEvent = {
      id: generateId(), schemaVersion: 1,
      title: String(raw.title ?? "Untitled"), eventType: (raw.eventType as ChronicleEventType) ?? "other",
      startsAt: String(raw.startsAt ?? ""), endsAt: raw.endsAt ? String(raw.endsAt) : undefined,
      datePrecision: precision,
      domains: (raw.domains as string[]) ?? [], emotionalTone: (raw.emotionalTone as string[]) ?? [],
      emotionalValence: Number(raw.emotionalValence ?? 0), emotionalIntensity: Number(raw.emotionalIntensity ?? 0.5),
      narrative: String(raw.sourceText ?? storyText), people: ids, links: [], reflections: [],
      provenance: { source: "ai_extracted", confidence: Number(raw.confidence ?? confidenceForPrecision(precision)) },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    upsertEvent(pid, ev); reload(pid);
    setPending(prev => prev ? { ...prev, events: prev.events.filter((_, i) => i !== idx) } : null);
  };

  const addReflection = (eventId: string, outcome?: Reflection["outcomeConfirmation"]) => {
    const e = events.find(x => x.id === eventId); if (!e || !reflectionText.trim()) return;
    const updated: LifeEvent = {
      ...e, reflections: [...e.reflections, { id: generateId(), date: new Date().toISOString().slice(0, 10), text: reflectionText.trim(), outcomeConfirmation: outcome }],
    };
    upsertEvent(pid, updated); reload(pid); setReflectingOn(null); setReflectionText("");
  };

  const linkEvents = (fromId: string, toId: string, type: EdgeType) => {
    const e = events.find(x => x.id === fromId); if (!e || fromId === toId) return;
    if (e.links.some(l => l.eventId === toId)) return;
    upsertEvent(pid, { ...e, links: [...e.links, { eventId: toId, type }] });
    reload(pid); setLinkingFrom(null);
  };

  const doExport = () => {
    if (!profile) return;
    const blob = new Blob([JSON.stringify(exportChronicle(pid, profile), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cosmora-chronicle-${profile.name}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as ChronicleExport;
        // strategy fixed to keep_local for this slice; conflict-resolution UI comes later
        const { added, conflicts } = importChronicle(pid, parsed, "keep_local");
        reload(pid);
        alert(`Imported ${added} new item(s). ${conflicts} conflict(s) kept local versions.`);
      } catch { alert("Import failed: not a valid Chronicle export."); }
    };
    reader.readAsText(file);
  };

  if (!profile || !chart) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <p style={{ color: "#445577", fontSize: 11, fontFamily: MONO }} className="ml-16">CREATE A PROFILE TO BEGIN YOUR CHRONICLE</p>
      </div>
    );
  }

  const oracleQ = (e: LifeEvent, state?: SkyState) => {
    const tokens = state ? topTokens(state, 4).join(", ") : "";
    return encodeURIComponent(`Tell me about this life event against my chart. Event: "${e.title}" (${fmtDate(e)}). ${e.narrative ? `My words: ${e.narrative.slice(0, 300)}. ` : ""}${tokens ? `Active signatures at the time: ${tokens}.` : ""}`);
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#010810" }}>
      <DashboardBg />
      <div className="absolute inset-0 overflow-y-auto" style={{ left: 64, scrollbarWidth: "none" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px 60px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{ width: 6, height: 28, background: GOLD, borderRadius: 3, boxShadow: `0 0 10px ${GOLD}` }} />
            <h1 style={{ color: "#C0D4FF", fontSize: 22, fontFamily: MONO, letterSpacing: "0.15em", textTransform: "uppercase" }}>Chronicle</h1>
            <span style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}35`, borderRadius: 20, padding: "3px 12px", color: GOLD, fontSize: 9, fontFamily: MONO, letterSpacing: "0.15em" }}>
              {events.length} EVENTS
            </span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button onClick={doExport} style={{ padding: "5px 12px", borderRadius: 8, cursor: "pointer", background: "transparent", border: BORDER, color: "#445577", fontSize: 9, fontFamily: MONO }}>EXPORT</button>
              <button onClick={() => fileRef.current?.click()} style={{ padding: "5px 12px", borderRadius: 8, cursor: "pointer", background: "transparent", border: BORDER, color: "#445577", fontSize: 9, fontFamily: MONO }}>IMPORT</button>
              <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) doImport(e.target.files[0]); e.target.value = ""; }} />
            </div>
          </div>
          <p style={{ color: "#445577", fontSize: 12, fontFamily: SERIF, fontStyle: "italic", paddingLeft: 18, marginBottom: 20 }}>
            Your life as a living graph — every event encoded against the sky
          </p>

          {/* Intake buttons */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={() => { setEditForm(null); setPanel(panel === "add" ? "none" : "add"); }} style={{
              padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em",
              background: panel === "add" ? `${GOLD}18` : "transparent", border: `1px solid ${GOLD}45`, color: GOLD,
            }}>+ ADD EVENT</button>
            <button onClick={() => setPanel(panel === "story" ? "none" : "story")} style={{
              padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em",
              background: panel === "story" ? "rgba(123,111,212,0.15)" : "transparent", border: "1px solid rgba(123,111,212,0.45)", color: "#BFB6E8",
            }}>✦ TELL YOUR STORY</button>
          </div>

          {/* Panels */}
          <AnimatePresence>
            {(panel === "add" || panel === "edit") && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden", marginBottom: 20 }}>
                <div style={{ background: "rgba(10,15,35,0.6)", border: BORDER, borderRadius: 12, padding: 18 }}>
                  <EventForm initial={editForm ?? emptyForm()} people={people}
                    onSave={saveForm} onCancel={() => { setPanel("none"); setEditForm(null); }} onCreatePerson={createPerson} />
                </div>
              </motion.div>
            )}
            {panel === "story" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden", marginBottom: 20 }}>
                <div style={{ background: "rgba(10,15,35,0.6)", border: "1px solid rgba(123,111,212,0.3)", borderRadius: 12, padding: 18 }}>
                  <p style={{ color: "#BFB6E8", fontSize: 9, fontFamily: MONO, letterSpacing: "0.15em", marginBottom: 8 }}>THE REALITY ENGINE LISTENS</p>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                    {BIO_PROMPTS.map(p => (
                      <button key={p} onClick={() => setStoryText(t => t ? `${t}\n\n${p}: ` : `${p}: `)} style={{
                        padding: "3px 10px", borderRadius: 16, cursor: "pointer", background: "transparent",
                        border: "1px solid rgba(123,111,212,0.3)", color: "#7B6FD4", fontSize: 8, fontFamily: MONO,
                      }}>{p}</button>
                    ))}
                  </div>
                  <textarea value={storyText} onChange={e => setStoryText(e.target.value)}
                    placeholder="Write your story in any form — dates, chapters, fragments. The engine extracts the events; you confirm before anything is saved."
                    style={{ width: "100%", minHeight: 130, padding: "10px 12px", background: "rgba(5,8,20,0.7)", border: BORDER, borderRadius: 8, color: "#C0D4FF", fontSize: 13, fontFamily: SERIF, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                  {extractError && <p style={{ color: "#fb7185", fontSize: 10, fontFamily: MONO, marginTop: 8 }}>{extractError}</p>}
                  <button onClick={runExtraction} disabled={extracting || storyText.trim().length < 10} style={{
                    marginTop: 10, padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em",
                    background: "rgba(123,111,212,0.15)", border: "1px solid rgba(123,111,212,0.45)", color: "#BFB6E8",
                    opacity: extracting || storyText.trim().length < 10 ? 0.4 : 1,
                  }}>{extracting ? "READING YOUR STORY…" : "EXTRACT EVENTS"}</button>

                  {/* Confirmation table */}
                  {pending && pending.events.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <p style={{ color: GOLD, fontSize: 9, fontFamily: MONO, letterSpacing: "0.15em", marginBottom: 8 }}>
                        {pending.events.length} EVENT(S) EXTRACTED — CONFIRM EACH BEFORE SAVING
                      </p>
                      {pending.events.map((raw, i) => {
                        const conf = Number(raw.confidence ?? 0.5);
                        return (
                          <div key={i} style={{
                            border: `1px solid ${conf < 0.6 ? "rgba(245,158,11,0.5)" : "rgba(40,60,100,0.35)"}`,
                            borderRadius: 10, padding: "10px 12px", marginBottom: 8, background: "rgba(5,8,20,0.5)",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ color: "#C0D4FF", fontSize: 12, fontFamily: MONO }}>{String(raw.title)}</span>
                              <span style={{ color: "#445577", fontSize: 10, fontFamily: MONO }}>{String(raw.startsAt)} · {String(raw.eventType)}</span>
                              {conf < 0.6 && <span style={{ color: "#f59e0b", fontSize: 8, fontFamily: MONO }}>LOW CONFIDENCE {Math.round(conf * 100)}%</span>}
                              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                                <button onClick={() => confirmPendingEvent(raw, i)} style={{ padding: "3px 12px", borderRadius: 6, cursor: "pointer", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.4)", color: "#4ade80", fontSize: 9, fontFamily: MONO }}>CONFIRM</button>
                                <button onClick={() => setPending(prev => prev ? { ...prev, events: prev.events.filter((_, j) => j !== i) } : null)} style={{ padding: "3px 12px", borderRadius: 6, cursor: "pointer", background: "transparent", border: BORDER, color: "#445577", fontSize: 9, fontFamily: MONO }}>DISCARD</button>
                              </div>
                            </div>
                            {raw.sourceText ? <p style={{ color: "#556688", fontSize: 11, fontFamily: SERIF, fontStyle: "italic", marginTop: 5 }}>&ldquo;{String(raw.sourceText)}&rdquo;</p> : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filters */}
          {events.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{
                padding: "6px 10px", background: "rgba(10,15,35,0.7)", border: BORDER, borderRadius: 8,
                color: "#8899BB", fontSize: 10, fontFamily: MONO, cursor: "pointer", outline: "none",
              }}>
                <option value="all">ALL TYPES</option>
                {Object.entries(EVENT_TYPE_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
              </select>
              <input value={sigQuery} onChange={e => setSigQuery(e.target.value)} placeholder="Signature search: Mars H7…" style={{
                flex: 1, minWidth: 180, padding: "6px 12px", background: "rgba(10,15,35,0.7)", border: BORDER, borderRadius: 8,
                color: "#C0D4FF", fontSize: 10, fontFamily: MONO, outline: "none",
              }} />
            </div>
          )}

          {/* Empty state */}
          {events.length === 0 && panel === "none" && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ color: "#C0D4FF", fontSize: 18, fontFamily: SERIF, fontStyle: "italic", marginBottom: 8 }}>
                Your chart is the source code. Your life is the evidence.
              </p>
              <p style={{ color: "#445577", fontSize: 12, fontFamily: SERIF, fontStyle: "italic" }}>
                Add the first ten events and watch the sky line up.
              </p>
            </div>
          )}

          {/* Timeline */}
          {byYear.map(([year, list]) => (
            <div key={year} style={{ display: "flex", gap: 14, marginBottom: 4 }}>
              {/* Year spine */}
              <div style={{ width: 44, flexShrink: 0, textAlign: "right" }}>
                <span style={{ color: GOLD, fontSize: 11, fontFamily: MONO, letterSpacing: "0.1em" }}>{year}</span>
                <div style={{ width: 1, background: "rgba(40,60,100,0.35)", margin: "6px auto 0", minHeight: 30, height: "calc(100% - 24px)" }} />
              </div>
              {/* Events */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingBottom: 14 }}>
                {list.map(e => {
                  const meta = EVENT_TYPE_META[e.eventType];
                  const expanded = expandedId === e.id;
                  const state = skyStates.get(e.id);
                  return (
                    <motion.div key={e.id} layout style={{
                      background: "rgba(10,15,35,0.55)", borderRadius: 12, cursor: "pointer",
                      border: `1px solid ${expanded ? meta.color + "45" : "rgba(40,60,100,0.3)"}`,
                    }}>
                      <div onClick={() => setExpandedId(expanded ? null : e.id)} style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <span style={{ color: meta.color, fontSize: 14, width: 18, textAlign: "center" }}>{meta.glyph}</span>
                          <span style={{ color: "#C0D4FF", fontSize: 13, fontFamily: MONO }}>{e.title}</span>
                          <span style={{ color: "#445577", fontSize: 10, fontFamily: MONO }}>{fmtDate(e)}</span>
                          <div style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
                            {[1, 2, 3, 4, 5].map(n => (
                              <div key={n} style={{ width: 5, height: 5, borderRadius: "50%", background: n <= Math.round(e.emotionalIntensity * 5) ? (e.emotionalValence >= 0 ? "#4ade80" : "#fb7185") : "rgba(40,60,100,0.4)" }} />
                            ))}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6, paddingLeft: 27 }}>
                          {e.domains.slice(0, 3).map(d => <span key={d} style={{ color: "#06b6d4", fontSize: 8, fontFamily: MONO }}>#{d}</span>)}
                          {e.emotionalTone.slice(0, 3).map(t => <span key={t} style={{ color: "#f472b6", fontSize: 8, fontFamily: MONO }}>{t}</span>)}
                          {e.people.map(pid2 => <span key={pid2} style={{ color: "#a78bfa", fontSize: 8, fontFamily: MONO }}>@{people.find(p => p.id === pid2)?.name ?? "?"}</span>)}
                          {expanded && state && topTokens(state, 3).map(t => (
                            <span key={t} style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}30`, borderRadius: 12, padding: "1px 8px", color: meta.color, fontSize: 8, fontFamily: MONO }}>{tokenChip(t)}</span>
                          ))}
                        </div>
                      </div>

                      <AnimatePresence>
                        {expanded && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: "hidden", padding: "0 14px 12px" }}>
                            {e.narrative && <p style={{ color: "#8899BB", fontSize: 13, fontFamily: SERIF, fontStyle: "italic", lineHeight: 1.7, margin: "4px 0 0 27px" }}>&ldquo;{e.narrative}&rdquo;</p>}
                            {state && <div style={{ marginLeft: 27 }}><SkyStateView state={state} /></div>}

                            {/* Links */}
                            {e.links.length > 0 && (
                              <div style={{ marginLeft: 27, marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {e.links.map(l => (
                                  <span key={l.eventId} style={{ color: "#445577", fontSize: 9, fontFamily: MONO }}>
                                    → {EDGE_LABELS[l.type]}: {events.find(x => x.id === l.eventId)?.title ?? "?"}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Reflections */}
                            {e.reflections.length > 0 && (
                              <div style={{ marginLeft: 27, marginTop: 8 }}>
                                {e.reflections.map(r => (
                                  <p key={r.id} style={{ color: "#556688", fontSize: 11, fontFamily: SERIF, fontStyle: "italic", marginBottom: 3 }}>
                                    {r.date}: {r.text} {r.outcomeConfirmation && <span style={{ fontFamily: MONO, fontSize: 8, color: r.outcomeConfirmation === "confirmed" ? "#4ade80" : "#f59e0b" }}>[{r.outcomeConfirmation}]</span>}
                                  </p>
                                ))}
                              </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: "flex", gap: 6, marginLeft: 27, marginTop: 10, flexWrap: "wrap" }} onClick={ev => ev.stopPropagation()}>
                              <Link href={`/dashboard/oracle?q=${oracleQ(e, state)}`} style={{ textDecoration: "none" }}>
                                <button style={{ padding: "5px 12px", borderRadius: 7, cursor: "pointer", background: "rgba(123,111,212,0.12)", border: "1px solid rgba(123,111,212,0.4)", color: "#BFB6E8", fontSize: 9, fontFamily: MONO }}>✦ ASK THE ORACLE</button>
                              </Link>
                              <button onClick={() => { setReflectingOn(reflectingOn === e.id ? null : e.id); setReflectionText(""); }} style={{ padding: "5px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", border: BORDER, color: "#445577", fontSize: 9, fontFamily: MONO }}>+ REFLECTION</button>
                              <button onClick={() => setLinkingFrom(linkingFrom === e.id ? null : e.id)} style={{ padding: "5px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", border: BORDER, color: "#445577", fontSize: 9, fontFamily: MONO }}>⛓ LINK</button>
                              <button onClick={() => {
                                setEditForm({
                                  id: e.id, title: e.title, eventType: e.eventType, startsAt: e.startsAt, endsAt: e.endsAt ?? "",
                                  datePrecision: e.datePrecision, locationName: e.location?.name ?? "",
                                  domains: e.domains, emotionalTone: e.emotionalTone,
                                  valenceSign: e.emotionalValence > 0.2 ? "positive" : e.emotionalValence < -0.2 ? "negative" : "mixed",
                                  intensityDots: Math.max(1, Math.round(e.emotionalIntensity * 5)), narrative: e.narrative, people: e.people,
                                }); setPanel("edit"); window.scrollTo({ top: 0 });
                              }} style={{ padding: "5px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", border: BORDER, color: "#445577", fontSize: 9, fontFamily: MONO }}>EDIT</button>
                              <button onClick={() => { if (confirm(`Delete "${e.title}"?`)) { deleteEvent(pid, e.id); reload(pid); } }} style={{ padding: "5px 12px", borderRadius: 7, cursor: "pointer", background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 9, fontFamily: MONO }}>DELETE</button>
                            </div>

                            {/* Reflection input */}
                            {reflectingOn === e.id && (
                              <div style={{ marginLeft: 27, marginTop: 10 }} onClick={ev => ev.stopPropagation()}>
                                <textarea value={reflectionText} onChange={ev => setReflectionText(ev.target.value)} placeholder="Looking back at this now…"
                                  style={{ width: "100%", minHeight: 50, padding: "8px 10px", background: "rgba(5,8,20,0.7)", border: BORDER, borderRadius: 8, color: "#C0D4FF", fontSize: 12, fontFamily: SERIF, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                                  <button onClick={() => addReflection(e.id)} style={{ padding: "4px 12px", borderRadius: 6, cursor: "pointer", background: `${GOLD}15`, border: `1px solid ${GOLD}40`, color: GOLD, fontSize: 9, fontFamily: MONO }}>SAVE</button>
                                  <button onClick={() => addReflection(e.id, "confirmed")} style={{ padding: "4px 12px", borderRadius: 6, cursor: "pointer", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.35)", color: "#4ade80", fontSize: 9, fontFamily: MONO }}>SAVE + CONFIRMED OUTCOME</button>
                                  <button onClick={() => addReflection(e.id, "did_not_happen")} style={{ padding: "4px 12px", borderRadius: 6, cursor: "pointer", background: "transparent", border: BORDER, color: "#445577", fontSize: 9, fontFamily: MONO }}>SAVE + DIDN&apos;T HAPPEN</button>
                                </div>
                              </div>
                            )}

                            {/* Link picker */}
                            {linkingFrom === e.id && (
                              <div style={{ marginLeft: 27, marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }} onClick={ev => ev.stopPropagation()}>
                                <p style={{ color: "#445577", fontSize: 8, fontFamily: MONO, letterSpacing: "0.12em" }}>LINK TO (echoes):</p>
                                {events.filter(x => x.id !== e.id).slice(0, 12).map(x => (
                                  <button key={x.id} onClick={() => linkEvents(e.id, x.id, "echoes")} style={{
                                    textAlign: "left", padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                                    background: "transparent", border: BORDER, color: "#8899BB", fontSize: 10, fontFamily: MONO,
                                  }}>{x.title} · {fmtDate(x)}</button>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
