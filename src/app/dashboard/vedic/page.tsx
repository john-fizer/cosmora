"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { getActiveProfileId, getProfile, getCachedChart, getOraclePersona } from "@/lib/storage";
import {
  toSiderealChart, buildVimshottariDasha, buildDivisionalChart, buildCharaKarakas,
  lahiriAyanamsa, DIVISIONAL_NAMES, buildVedicContext,
} from "@/lib/astrology/sidereal";
import type {
  SiderealChart, VimshottariData, DashaPeriod, DashaRuler,
  DivisionalChart, VargaPlacement, CharaKarakas, CharaKaraka,
} from "@/lib/astrology/sidereal";
import type { ChartData } from "@/lib/astrology/types";

const KEY_DIVISIONALS = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60];

const DASHA_COLORS: Record<DashaRuler, string> = {
  Ketu: "#7B6FD4", Venus: "#f472b6", Sun: "#fbbf24", Moon: "#BFB6E8",
  Mars: "#ef4444", Rahu: "#06b6d4", Jupiter: "#f59e0b", Saturn: "#94a3b8", Mercury: "#a78bfa",
};
const DASHA_SYMBOLS: Record<DashaRuler, string> = {
  Ketu: "☋", Venus: "♀", Sun: "☉", Moon: "☽", Mars: "♂",
  Rahu: "☊", Jupiter: "♃", Saturn: "♄", Mercury: "☿",
};
const SIGN_SYMBOLS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};
const PLANET_SYMBOLS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "⛢", Neptune: "♆", Pluto: "♇",
  NorthNode: "☊", SouthNode: "☋", Chiron: "⚷",
};
const PLANET_COLORS: Record<string, string> = {
  Sun: "#fbbf24", Moon: "#BFB6E8", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#7B6FD4",
  NorthNode: "#06b6d4", SouthNode: "#7B6FD4", Chiron: "#a78bfa",
};
const CK_ROLE_COLORS: Record<string, string> = {
  AK: "#fbbf24", AmK: "#f59e0b", BK: "#a78bfa", MK: "#BFB6E8",
  PK: "#f472b6", GK: "#94a3b8", DK: "#06b6d4",
};

const VEDIC_PROMPTS = [
  "What does my Atmakaraka (AK) reveal about my soul's purpose?",
  "How does my Janma nakshatra shape my personality and path?",
  "Explain my current dasha and what life themes it activates.",
  "What does my Navamsha lagna reveal about my inner nature?",
  "How do my 1st and 9th house placements shape my dharma?",
  "What does my Moon nakshatra say about my emotional patterns?",
  "Tell me about the relationship between my Lagna lord and chart.",
  "What divisional chart should I focus on for career (D10)?",
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  id: number;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
function fmtYears(y: number) {
  const yy = Math.floor(y), m = Math.round((y - yy) * 12);
  return m === 0 ? `${yy}y` : `${yy}y ${m}m`;
}
function degStr(d: number) {
  return `${Math.floor(d)}°${Math.round((d % 1) * 60).toString().padStart(2, "0")}′`;
}

function VargaRow({ p, accent }: { p: VargaPlacement; accent?: string }) {
  const col = accent ?? PLANET_COLORS[p.name] ?? "#8899BB";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "28px 100px 1fr", alignItems: "center", gap: 10, padding: "7px 12px", borderRadius: 8, background: "rgba(10,15,35,0.5)" }}>
      <span style={{ color: col, fontSize: 14, textAlign: "center" }}>{PLANET_SYMBOLS[p.name] ?? "✦"}</span>
      <span style={{ color: col, fontSize: 10, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.06em" }}>
        {p.name.replace("NorthNode", "N.Node").replace("SouthNode", "S.Node")}
      </span>
      <span style={{ color: "#C0D4FF", fontSize: 11, fontFamily: "'Fragment Mono', monospace" }}>
        {SIGN_SYMBOLS[p.sign] ?? ""} {degStr(p.signDegree)} {p.sign}
      </span>
    </div>
  );
}

function DashaRow({ p, isAntar = false }: { p: DashaPeriod; isAntar?: boolean }) {
  const ruler = (isAntar ? p.antardasha : p.ruler) as DashaRuler;
  const col = DASHA_COLORS[ruler];
  const now = new Date();
  const totalMs = p.end.getTime() - p.start.getTime();
  const elapsedMs = Math.max(0, Math.min(now.getTime() - p.start.getTime(), totalMs));
  const pct = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0;
  return (
    <div style={{ position: "relative", overflow: "hidden", background: p.isCurrent ? `${col}10` : "rgba(10,15,35,0.4)", border: `1px solid ${p.isCurrent ? col + "45" : "rgba(40,60,100,0.25)"}`, borderRadius: 9, padding: "8px 12px" }}>
      {p.isCurrent && <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${pct}%`, background: `${col}08`, pointerEvents: "none" }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        <span style={{ color: col, fontSize: isAntar ? 12 : 16, width: 22, textAlign: "center" }}>{DASHA_SYMBOLS[ruler]}</span>
        <div style={{ flex: 1 }}>
          <span style={{ color: p.isCurrent ? col : "#C0D4FF", fontSize: isAntar ? 10 : 12, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>{ruler}</span>
          <div style={{ color: "#445577", fontSize: 9, fontFamily: "'Fragment Mono', monospace" }}>{fmtDate(p.start)} — {fmtDate(p.end)} · {fmtYears(p.years)}</div>
        </div>
        {p.isCurrent && <span style={{ color: col, fontSize: 8, fontFamily: "'Fragment Mono', monospace" }}>{Math.round(pct)}%</span>}
      </div>
    </div>
  );
}

type TabKey = "placements" | "navamsha" | "varga" | "karakas" | "dasha" | "oracle";

export default function VedicPage() {
  const [sidereal, setSidereal]   = useState<SiderealChart | null>(null);
  const [rawChart, setRawChart]   = useState<ChartData | null>(null);
  const [ayanamsa, setAyanamsa]   = useState(0);
  const [dasha, setDasha]         = useState<VimshottariData | null>(null);
  const [karakas, setKarakas]     = useState<CharaKarakas | null>(null);
  const [noProfile, setNoProfile] = useState(false);
  const [tab, setTab]             = useState<TabKey>("placements");
  const [selectedD, setSelectedD] = useState(9);

  // Chat oracle state
  const [messages, setMessages]       = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]     = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);
  const [streamText, setStreamText]   = useState("");
  const [msgId, setMsgId]             = useState(0);
  const [vedicCtx, setVedicCtx]       = useState("");
  const [profileName, setProfileName] = useState("Native");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setNoProfile(true); return; }
    const profile = getProfile(id);
    const chart   = getCachedChart(id);
    if (!profile || !chart) { setNoProfile(true); return; }
    const birthDatetime = `${profile.birthDate}T${profile.birthTime}Z`;
    const sc = toSiderealChart(chart, birthDatetime);
    const ay = lahiriAyanamsa(new Date(birthDatetime));
    setSidereal(sc);
    setRawChart(chart);
    setAyanamsa(ay);
    setProfileName(profile.name ?? "Native");
    setVedicCtx(buildVedicContext(chart, birthDatetime));
    const moonP = chart.planets.find(p => p.name === "Moon");
    if (moonP) {
      const moonSidereal = ((moonP.longitude - sc.ayanamsa) % 360 + 360) % 360;
      setDasha(buildVimshottariDasha(moonSidereal, birthDatetime));
    }
    setKarakas(buildCharaKarakas(chart, ay));
  }, []);

  useEffect(() => {
    if (tab === "oracle") bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText, tab]);

  const divisionals = useMemo<Record<number, DivisionalChart>>(() => {
    if (!rawChart) return {};
    const out: Record<number, DivisionalChart> = {};
    for (const n of KEY_DIVISIONALS) out[n] = buildDivisionalChart(rawChart, ayanamsa, n);
    return out;
  }, [rawChart, ayanamsa]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? chatInput).trim();
    if (!content || chatStreaming) return;
    setChatInput("");

    const userMsg: ChatMessage = { role: "user", content, id: msgId };
    setMsgId(n => n + 1);
    setMessages(prev => [...prev, userMsg]);
    setChatStreaming(true);
    setStreamText("");

    // Inject Vedic context on first message only
    const isFirst = messages.length === 0;
    const dashaLine = dasha?.currentMajor
      ? `Current Vimshottari dasha: ${dasha.currentMajor.ruler} major / ${dasha.currentAntar?.antardasha ?? "—"} antardasha.`
      : "";
    const karakaLine = karakas
      ? `Atmakaraka (AK): ${karakas.ak.planet} · Darakaraka (DK): ${karakas.dk.planet}.`
      : "";
    const enriched = isFirst
      ? `[JYOTISH CONTEXT for ${profileName}]\n${vedicCtx}\n${dashaLine}\n${karakaLine}\n---\n${content}`
      : content;

    const history = messages.map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: enriched, history, persona: getOraclePersona() }),
      });
      if (!res.ok || !res.body) { setChatStreaming(false); return; }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") break;
          try { const p = JSON.parse(payload); if (p.text) { acc += p.text; setStreamText(acc); } } catch { /* skip */ }
        }
      }
      const assistantMsg: ChatMessage = { role: "assistant", content: acc, id: msgId + 1 };
      setMsgId(n => n + 2);
      setMessages(prev => [...prev, assistantMsg]);
    } catch { /* silent */ }
    setStreamText("");
    setChatStreaming(false);
  };

  if (noProfile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <div className="text-center ml-16">
          <p style={{ color: "#C8A55B", fontSize: 13, fontFamily: "'Fragment Mono', monospace" }}>BIRTH DATA REQUIRED</p>
          <p style={{ color: "#445577", fontSize: 11, marginTop: 6 }}>Complete your profile in Settings.</p>
        </div>
      </div>
    );
  }
  if (!sidereal) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ width: 40, height: 40, border: "1px solid #1A3A8A", borderTopColor: "#C8A55B", borderRadius: "50%" }} />
      </div>
    );
  }

  const moonPlacement = sidereal.placements.find(p => p.name === "Moon");
  const dashaMajorCol = dasha?.currentMajor ? DASHA_COLORS[dasha.currentMajor.ruler] : "#C8A55B";
  const d9 = divisionals[9];
  const selectedChart = divisionals[selectedD];

  const allChatMessages: ChatMessage[] = chatStreaming
    ? [...messages, { role: "assistant", content: streamText, id: -1 }]
    : messages;

  const TABS: Array<{ key: TabKey; label: string }> = [
    { key: "placements", label: "PLACEMENTS" },
    { key: "navamsha",   label: "NAVAMSHA D9" },
    { key: "varga",      label: "VARGA" },
    { key: "karakas",    label: "KARAKAS" },
    { key: "dasha",      label: "DASHA" },
    { key: "oracle",     label: "✦ ORACLE" },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#010810" }}>
      <DashboardBg />
      <div className="absolute inset-0 overflow-y-auto" style={{ left: 64, scrollbarWidth: "none" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px 48px" }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{ width: 6, height: 28, background: "#a78bfa", borderRadius: 3, boxShadow: "0 0 10px #a78bfa" }} />
              <h1 style={{ color: "#C0D4FF", fontSize: 22, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em", textTransform: "uppercase" }}>Vedic Chart</h1>
              <span style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.35)", borderRadius: 20, padding: "3px 12px", color: "#a78bfa", fontSize: 9, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.15em" }}>
                LAHIRI · {sidereal.ayanamsa.toFixed(2)}°
              </span>
            </div>
            <p style={{ color: "#445577", fontSize: 12, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", paddingLeft: 18 }}>
              Jyotish · Sidereal · 27 Nakshatras · {KEY_DIVISIONALS.length} Divisional Charts · Jaimini Karakas
            </p>
          </div>

          {/* Lagna + Moon spotlight */}
          <div style={{ display: "grid", gridTemplateColumns: moonPlacement ? "1fr 1fr" : "1fr", gap: 14, marginBottom: 22 }}>
            <div style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.12), rgba(5,8,22,0.8))", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 14, padding: "14px 18px" }}>
              <div style={{ color: "#a78bfa", fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 8 }}>LAGNA</div>
              <div style={{ color: "#C0D4FF", fontSize: 17, fontFamily: "'Fragment Mono', monospace" }}>
                {SIGN_SYMBOLS[sidereal.ascendant.sign]} {sidereal.ascendant.signDegree.toFixed(1)}° {sidereal.ascendant.sign}
              </div>
              <div style={{ color: "#8899BB", fontSize: 10, fontFamily: "'Fragment Mono', monospace", marginTop: 4 }}>
                {sidereal.ascendant.nakshatra.nakshatra.name} · P{sidereal.ascendant.nakshatra.pada} · {sidereal.ascendant.nakshatra.nakshatra.lord}
              </div>
            </div>
            {moonPlacement && (
              <div style={{ background: `linear-gradient(135deg, ${dashaMajorCol}12, rgba(5,8,22,0.8))`, border: `1px solid ${dashaMajorCol}30`, borderRadius: 14, padding: "14px 18px" }}>
                <div style={{ color: dashaMajorCol, fontSize: 8, letterSpacing: "0.2em", fontFamily: "'Fragment Mono', monospace", marginBottom: 8 }}>MOON · JANMA NAKSHATRA</div>
                <div style={{ color: "#C0D4FF", fontSize: 17, fontFamily: "'Fragment Mono', monospace" }}>
                  {moonPlacement.nakshatra.nakshatra.name}
                </div>
                <div style={{ color: "#8899BB", fontSize: 10, fontFamily: "'Fragment Mono', monospace", marginTop: 4 }}>
                  P{moonPlacement.nakshatra.pada} · Lord: {moonPlacement.nakshatra.nakshatra.lord} · {moonPlacement.nakshatra.nakshatra.deity}
                </div>
                <div style={{ color: "#556688", fontSize: 11, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", marginTop: 3 }}>
                  &ldquo;{moonPlacement.nakshatra.nakshatra.nature}&rdquo;
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); if (t.key === "oracle") setTimeout(() => inputRef.current?.focus(), 100); }} style={{
                padding: "5px 14px",
                background: tab === t.key ? "rgba(167,139,250,0.12)" : "transparent",
                border: `1px solid ${tab === t.key ? "rgba(167,139,250,0.3)" : "rgba(40,60,100,0.3)"}`,
                borderRadius: 20, color: tab === t.key ? "#C8A55B" : (t.key === "oracle" ? "#a78bfa" : "#445577"),
                fontSize: 9, letterSpacing: "0.12em",
                fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* PLACEMENTS */}
          {tab === "placements" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {sidereal.placements.map((p, i) => {
                const col = PLANET_COLORS[p.name] ?? "#8899BB";
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 90px 130px 1fr 60px 30px", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 9, background: "rgba(10,15,35,0.5)" }}>
                    <span style={{ color: col, fontSize: 14, textAlign: "center" }}>{PLANET_SYMBOLS[p.name] ?? "·"}</span>
                    <span style={{ color: col, fontSize: 10, fontFamily: "'Fragment Mono', monospace" }}>{p.name.replace("NorthNode", "N.Node")}</span>
                    <span style={{ color: "#C0D4FF", fontSize: 11, fontFamily: "'Fragment Mono', monospace" }}>
                      {SIGN_SYMBOLS[p.sign] ?? ""} {p.signDegree.toFixed(1)}° {p.sign}
                    </span>
                    <span style={{ color: "#8899BB", fontSize: 10, fontFamily: "'Fragment Mono', monospace" }}>
                      {p.nakshatra.nakshatra.name} · <span style={{ color: "#a78bfa" }}>P{p.nakshatra.pada}</span> · {p.nakshatra.nakshatra.lord}
                    </span>
                    <span style={{ color: "#556688", fontSize: 9, fontFamily: "'Fragment Mono', monospace" }}>H{p.house}</span>
                    <span style={{ color: "#334466", fontSize: 9, fontFamily: "'Fragment Mono', monospace" }}>{p.retrograde ? "Rx" : ""}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* NAVAMSHA D9 */}
          {tab === "navamsha" && d9 && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <p style={{ color: "#a78bfa", fontSize: 9, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 4 }}>
                  D9 — NAVAMSHA · Soul chart · spouse chart · dharma
                </p>
                <p style={{ color: "#445577", fontSize: 11, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
                  Lagna: {SIGN_SYMBOLS[d9.lagna.sign]} {d9.lagna.sign} · reveals deeper nature beyond the D1
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <VargaRow p={{ ...d9.lagna }} accent="#a78bfa" />
                {d9.planets.map((p, i) => <VargaRow key={i} p={p} />)}
              </div>
            </div>
          )}

          {/* VARGA BROWSER */}
          {tab === "varga" && (
            <div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                {KEY_DIVISIONALS.map(n => (
                  <button key={n} onClick={() => setSelectedD(n)} style={{
                    padding: "4px 10px",
                    background: selectedD === n ? "rgba(167,139,250,0.18)" : "rgba(10,15,35,0.6)",
                    border: `1px solid ${selectedD === n ? "rgba(167,139,250,0.4)" : "rgba(40,60,100,0.3)"}`,
                    borderRadius: 8, color: selectedD === n ? "#C8A55B" : "#445577",
                    fontSize: 9, letterSpacing: "0.1em",
                    fontFamily: "'Fragment Mono', monospace", cursor: "pointer",
                  }}>
                    D{n}
                  </button>
                ))}
              </div>
              {selectedChart && (
                <div>
                  <p style={{ color: "#a78bfa", fontSize: 9, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>
                    D{selectedD} — {DIVISIONAL_NAMES[selectedD] ?? `D${selectedD}`} · Lagna: {SIGN_SYMBOLS[selectedChart.lagna.sign]} {selectedChart.lagna.sign}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <VargaRow p={{ ...selectedChart.lagna }} accent="#a78bfa" />
                    {selectedChart.planets.map((p, i) => <VargaRow key={i} p={p} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* KARAKAS */}
          {tab === "karakas" && karakas && (
            <div>
              <p style={{ color: "#445577", fontSize: 9, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 14 }}>
                JAIMINI CHARA KARAKAS — ranked by sidereal degree within sign (descending)
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {karakas.all.map((ck: CharaKaraka, i: number) => {
                  const col = CK_ROLE_COLORS[ck.role] ?? "#8899BB";
                  const pCol = PLANET_COLORS[ck.planet] ?? "#8899BB";
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      style={{ background: i === 0 ? `${col}15` : "rgba(10,15,35,0.6)", border: `1px solid ${i === 0 ? col + "40" : "rgba(40,60,100,0.3)"}`, borderRadius: 12, padding: "14px 16px", boxShadow: i === 0 ? `0 0 20px ${col}12` : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <span style={{ color: pCol, fontSize: 20 }}>{PLANET_SYMBOLS[ck.planet] ?? "·"}</span>
                        <div>
                          <div style={{ color: col, fontSize: 10, fontFamily: "'Fragment Mono', monospace", letterSpacing: "0.12em" }}>
                            {ck.role} — {ck.roleLabel}
                          </div>
                          <div style={{ color: pCol, fontSize: 13, fontFamily: "'Fragment Mono', monospace" }}>
                            {ck.planet.replace("NorthNode", "Rahu")}
                          </div>
                        </div>
                      </div>
                      <div style={{ color: "#445577", fontSize: 9, fontFamily: "'Fragment Mono', monospace" }}>
                        {ck.degInSign.toFixed(2)}° in sign
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DASHA */}
          {tab === "dasha" && dasha && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <p style={{ color: "#445577", fontSize: 8, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>MAJOR DASHAS</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {dasha.major.slice(0, 12).map((p, i) => <DashaRow key={i} p={p} />)}
                </div>
              </div>
              <div>
                <p style={{ color: "#445577", fontSize: 8, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 10 }}>
                  ANTARDASHA — {dasha.currentMajor?.ruler?.toUpperCase() ?? "—"}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {dasha.antardasha.map((p, i) => <DashaRow key={i} p={p} isAntar />)}
                </div>
              </div>
            </div>
          )}

          {/* ORACLE CHAT */}
          {tab === "oracle" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

              {/* Messages */}
              <div style={{ minHeight: 320, display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                <AnimatePresence initial={false}>
                  {allChatMessages.length === 0 ? (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ paddingTop: 8 }}>
                      <p style={{ color: "#445577", fontSize: 9, letterSpacing: "0.18em", fontFamily: "'Fragment Mono', monospace", marginBottom: 14 }}>
                        JYOTISH ORACLE — your full sidereal chart is in context
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {VEDIC_PROMPTS.map((prompt, i) => (
                          <motion.button key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                            onClick={() => sendMessage(prompt)}
                            style={{
                              textAlign: "left", padding: "9px 14px",
                              background: "rgba(10,15,35,0.6)",
                              border: "1px solid rgba(40,60,100,0.3)",
                              borderRadius: 10, color: "#8899BB",
                              fontSize: 12, fontFamily: "'Cormorant Garamond', serif",
                              fontStyle: "italic", cursor: "pointer", lineHeight: 1.4,
                            }}>
                            {prompt}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    allChatMessages.map((m) => (
                      <motion.div key={m.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 0 }}>
                        {m.role === "user" ? (
                          <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: 14, borderBottomRightRadius: 4, background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#e2d9f3", fontSize: 13, lineHeight: 1.6 }}>
                            {m.content}
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", maxWidth: "88%" }}>
                            <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, background: "linear-gradient(135deg, #7B6FD4, #06b6d4)", marginTop: 2 }}>✦</div>
                            <div style={{ position: "relative", padding: "10px 14px", borderRadius: 14, borderTopLeftRadius: 4, background: "rgba(4,4,28,0.9)", border: "1px solid rgba(123,111,212,0.2)", color: "#C0D4FF", fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                              {m.content}
                              {m.id === -1 && chatStreaming && (
                                <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.7, repeat: Infinity }}
                                  style={{ display: "inline-block", width: 6, height: 12, background: "#a78bfa", borderRadius: 1, marginLeft: 3, verticalAlign: "middle" }} />
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ position: "sticky", bottom: 0, paddingTop: 8 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 16px", borderRadius: 14, background: "rgba(4,4,28,0.92)", border: "1px solid rgba(167,139,250,0.2)", backdropFilter: "blur(20px)" }}>
                  <motion.div animate={{ opacity: chatStreaming ? [0.5, 1, 0.5] : 1 }} transition={{ duration: 1.2, repeat: chatStreaming ? Infinity : 0 }}
                    style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, background: "linear-gradient(135deg, #7B6FD4, #06b6d4)" }}>✦</motion.div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                    placeholder="Ask about your nakshatras, dashas, divisional charts, karakas…"
                    disabled={chatStreaming}
                    style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}
                  />
                  {chatStreaming ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #a78bfa", borderTopColor: "transparent", flexShrink: 0 }} />
                  ) : (
                    <button onClick={() => sendMessage()} disabled={!chatInput.trim()}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#7B6FD4", opacity: chatInput.trim() ? 1 : 0.3, padding: 0, flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 20, height: 20 }}>
                        <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                </div>
                {messages.length > 0 && !chatStreaming && (
                  <button onClick={() => { setMessages([]); setMsgId(0); }}
                    style={{ marginTop: 8, fontSize: 9, letterSpacing: "0.12em", fontFamily: "'Fragment Mono', monospace", color: "#334466", background: "none", border: "none", cursor: "pointer" }}>
                    CLEAR CONVERSATION
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
