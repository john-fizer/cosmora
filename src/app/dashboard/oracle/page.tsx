"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { LiquidMetalOrb } from "@/components/ui/LiquidMetalOrb";
import { PLANET_SYMBOLS, SIGN_SYMBOLS } from "@/lib/astrology/types";
import type { ChartData, PlanetName } from "@/lib/astrology/types";
import {
  getActiveProfileId, getProfile, getCachedChart,
  getChatHistory, pushChatMessage, clearChatHistory,
  getOracleModel, setOracleModel,
} from "@/lib/storage";
import { ORACLE_MODELS, getModelById } from "@/lib/oracle/models";
import { VoiceOracle } from "@/components/oracle/VoiceOracle";
import { InsightPlayer } from "@/components/oracle/InsightPlayer";
import { type VoicePlanet } from "@/lib/oracle/voice";
import { useStreamingTTS } from "@/lib/oracle/streamingTTS";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
  id: number;
}

type OrbState = "idle" | "thinking" | "speaking";

interface ToolCallEvent {
  id: string;
  name: string;
  done: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLANET_COLORS: Partial<Record<PlanetName, string>> = {
  Sun: "#fbbf24", Moon: "#c4b5fd", Mercury: "#a78bfa", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#f59e0b", Saturn: "#94a3b8",
  Uranus: "#06b6d4", Neptune: "#3b82f6", Pluto: "#8b5cf6",
};

const ORACLE_PROMPT_CATEGORIES = [
  {
    label: "NATAL",
    color: "#a78bfa",
    prompts: [
      "What is my greatest natural gift in this chart?",
      "What does my Moon sign reveal about my emotional needs?",
      "Describe the tension between my Sun and Rising signs.",
      "What house themes dominate my life path?",
    ],
  },
  {
    label: "TIMING",
    color: "#f59e0b",
    prompts: [
      "What are the most important transits affecting me right now?",
      "What karmic lessons am I working through this year?",
      "How does my current profection year shape this period?",
    ],
  },
  {
    label: "GUIDANCE",
    color: "#22c55e",
    prompts: [
      "What energy surrounds me right now?",
      "Where should I focus my energy this month?",
      "What am I being called to release or transform?",
      "What opportunity is the cosmos pointing me toward?",
    ],
  },
  {
    label: "PATTERNS",
    color: "#06b6d4",
    prompts: [
      "What major aspect configurations are in my chart?",
      "Do I have a Grand Trine and what does it mean?",
      "Explain any T-squares or oppositions in my chart.",
      "What does my chart shape reveal about me?",
    ],
  },
] as const;

const ORACLE_PROMPTS = ORACLE_PROMPT_CATEGORIES.flatMap(c => c.prompts);

// ─── Floating insight card ────────────────────────────────────────────────────

function InsightCard({ planet, sign, house, color, delay, onClick }: {
  planet: string; sign: string; house: number; color: string; delay: number; onClick?: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.03, borderColor: `${color}60` }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="hud-panel rounded-xl px-3 py-2 flex items-center gap-2.5 w-full text-left cursor-pointer"
      style={{ minWidth: 110, transition: "border-color 0.2s" }}
    >
      <span className="text-base" style={{ color }}>{PLANET_SYMBOLS[planet as PlanetName] ?? "✦"}</span>
      <div className="flex-1">
        <p className="text-[8px] font-bold tracking-widest" style={{ color: "#64748b" }}>{planet.toUpperCase()}</p>
        <p className="text-[10px] font-medium" style={{ color }}>
          {SIGN_SYMBOLS[sign as keyof typeof SIGN_SYMBOLS] ?? ""} {sign} · H{house}
        </p>
      </div>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 flex-shrink-0 opacity-30">
        <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.button>
  );
}

// ─── Tool call card ───────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, { label: string; icon: string }> = {
  check_planet_placement: { label: "Scanning planet placement", icon: "⊕" },
  identify_aspects:       { label: "Mapping aspect patterns",   icon: "⚷" },
  calculate_timing:       { label: "Reading profection timing", icon: "⏳" },
  assess_chart_pattern:   { label: "Analyzing chart geometry",  icon: "✦" },
};

function ToolCallCard({ toolCall }: { toolCall: ToolCallEvent }) {
  const meta = TOOL_LABELS[toolCall.name] ?? { label: toolCall.name, icon: "⊕" };
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 ml-10 px-3 py-2 rounded-xl"
      style={{
        background: "rgba(6,182,212,0.04)",
        border: `1px solid ${toolCall.done ? "rgba(0,229,255,0.2)" : "rgba(6,182,212,0.18)"}`,
        maxWidth: 340,
      }}
    >
      <div style={{ flexShrink: 0 }}>
        {toolCall.done ? (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{ fontSize: 10, color: "#00e5ff" }}
          >
            ✓
          </motion.span>
        ) : (
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{ fontSize: 10, color: "#06b6d4" }}
          >
            {meta.icon}
          </motion.span>
        )}
      </div>
      <span style={{
        fontSize: 9,
        letterSpacing: 1.5,
        fontFamily: "'Share Tech Mono', monospace",
        color: toolCall.done ? "rgba(0,229,255,0.6)" : "rgba(6,182,212,0.7)",
        textTransform: "uppercase",
      }}>
        {meta.label}
      </span>
      {!toolCall.done && (
        <motion.div
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute",
            left: 0, top: 0, bottom: 0,
            width: "40%",
            background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.06), transparent)",
            borderRadius: "inherit",
            pointerEvents: "none",
          }}
        />
      )}
    </motion.div>
  );
}

// ─── Oracle message bubble ────────────────────────────────────────────────────

function OracleBubble({ message, isStreaming, voicePlanet, chartAspects, autoPlay }: {
  message: Message;
  isStreaming?: boolean;
  voicePlanet?: VoicePlanet;
  chartAspects?: import("@/lib/astrology/types").Aspect[];
  autoPlay?: boolean;
}) {
  const isOracle = message.role === "assistant";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35 }}
      className={`flex gap-3 ${isOracle ? "flex-row" : "flex-row-reverse"}`}
    >
      {isOracle && (
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5"
          style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)", boxShadow: "0 0 12px rgba(124,58,237,0.5)" }}>
          ✦
        </div>
      )}
      <div className="flex flex-col gap-0">
        <div
          className="relative max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed"
          style={isOracle ? {
            background: "rgba(4,4,28,0.9)",
            border: "1px solid rgba(124,58,237,0.25)",
            backdropFilter: "blur(20px)",
            color: "#cbd5e1",
            borderTopLeftRadius: 4,
            boxShadow: "0 0 20px rgba(124,58,237,0.06)",
          } : {
            background: "rgba(124,58,237,0.18)",
            border: "1px solid rgba(168,85,247,0.35)",
            color: "#e2d9f3",
            borderTopRightRadius: 4,
          }}
        >
          {isOracle && isStreaming && (
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.05), transparent)",
                borderRadius: "inherit", pointerEvents: "none",
              }}
            />
          )}
          <span style={{ whiteSpace: "pre-wrap" }}>{message.content}</span>
          {isOracle && isStreaming && (
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.7, repeat: Infinity }}
              className="inline-block ml-1 w-0.5 h-3.5 align-middle rounded-full"
              style={{ background: "#7c3aed" }}
            />
          )}
          {isOracle && (
            <div style={{ position: "absolute", top: 0, right: 0, width: 8, height: 8,
              borderTop: "1.5px solid rgba(6,182,212,0.5)", borderRight: "1.5px solid rgba(6,182,212,0.5)" }} />
          )}
        </div>
        {/* Per-message playback — only on completed assistant messages */}
        {isOracle && !isStreaming && message.content && voicePlanet && (
          <InsightPlayer
            text={message.content}
            messageId={message.id}
            planet={voicePlanet}
            aspects={chartAspects}
            autoPlay={autoPlay}
          />
        )}
      </div>
    </motion.div>
  );
}

// ─── A/B/C follow-up suggestions ─────────────────────────────────────────────

function FollowUpSuggestions({ suggestions, onSelect }: {
  suggestions: string[];
  onSelect: (s: string) => void;
}) {
  const labels = ["A", "B", "C"];
  if (suggestions.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="flex flex-col gap-2 ml-10"
    >
      <p className="text-[8px] font-bold tracking-[0.2em]" style={{ color: "#475569" }}>
        CONTINUE THE READING
      </p>
      {suggestions.map((s, i) => (
        <motion.button
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.06 * i }}
          whileHover={{ x: 4, borderColor: "rgba(124,58,237,0.4)" }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(s)}
          className="flex items-start gap-2.5 text-left px-3 py-2 rounded-xl cursor-pointer transition-all duration-200"
          style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.14)" }}
        >
          <span
            className="flex-shrink-0 w-4 h-4 rounded-md text-[8px] font-black flex items-center justify-center mt-0.5"
            style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}
          >
            {labels[i]}
          </span>
          <span className="text-[10px] leading-snug" style={{ color: "#94a3b8" }}>{s}</span>
        </motion.button>
      ))}
    </motion.div>
  );
}

// ─── Model selector ───────────────────────────────────────────────────────────

function ModelSelector({ currentModelId, availability, onChange }: {
  currentModelId: string;
  availability: Record<string, { available: boolean }>;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = getModelById(currentModelId);

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-bold tracking-wider cursor-pointer"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: current.color }}
      >
        <span>{current.icon}</span>
        <span className="hidden sm:inline">{current.name}</span>
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-2.5 h-2.5 opacity-40">
          <path d="M3 4.5l3 3 3-3" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl overflow-hidden"
              style={{
                background: "rgba(4,4,28,0.97)",
                border: "1px solid rgba(124,58,237,0.25)",
                backdropFilter: "blur(24px)",
                boxShadow: "0 0 40px rgba(124,58,237,0.15)",
              }}
            >
              <div className="p-2">
                <p className="text-[8px] font-bold tracking-widest px-3 py-2" style={{ color: "#334155" }}>ORACLE MODEL</p>
                {ORACLE_MODELS.map(model => {
                  const isAvailable = availability[model.id]?.available ?? (model.provider === "anthropic");
                  const isActive = model.id === currentModelId;
                  return (
                    <motion.button
                      key={model.id}
                      whileHover={{ background: "rgba(124,58,237,0.08)" }}
                      onClick={() => { if (isAvailable) { onChange(model.id); setOpen(false); } }}
                      disabled={!isAvailable}
                      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: isActive ? "rgba(124,58,237,0.12)" : "transparent",
                        border: isActive ? "1px solid rgba(124,58,237,0.25)" : "1px solid transparent",
                      }}
                    >
                      <span className="text-base mt-0.5 flex-shrink-0" style={{ color: model.color }}>{model.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[10px] font-bold" style={{ color: isActive ? model.color : "#94a3b8" }}>{model.name}</p>
                          {!isAvailable && (
                            <span className="text-[7px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(255,255,255,0.05)", color: "#334155" }}>NEEDS KEY</span>
                          )}
                          {isActive && (
                            <span className="text-[7px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                              style={{ background: `${model.color}20`, color: model.color }}>ACTIVE</span>
                          )}
                        </div>
                        <p className="text-[8px] mt-0.5" style={{ color: "#64748b" }}>{model.tagline}</p>
                        <p className="text-[8px] mt-0.5 leading-snug" style={{ color: "#475569" }}>{model.description}</p>
                      </div>
                    </motion.button>
                  );
                })}
                <div className="px-3 pt-2 pb-1 mt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[7px] leading-relaxed" style={{ color: "#475569" }}>
                    OpenAI & Google models require API keys in .env.local (OPENAI_API_KEY, GOOGLE_AI_KEY).
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main oracle page ─────────────────────────────────────────────────────────

export default function OraclePage() {
  const [chart, setChart] = useState<ChartData | null>(null);
  const [profileName, setProfileName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [streamText, setStreamText] = useState("");
  const [msgId, setMsgId] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [modelId, setModelId] = useState("claude-opus-4-7");
  const [modelAvailability, setModelAvailability] = useState<Record<string, { available: boolean }>>({});
  const [pendingAutoSeed, setPendingAutoSeed] = useState<string | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCallEvent[]>([]);
  const [voicePlanet, setVoicePlanet]   = useState<VoicePlanet>("Moon");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [liveVoiceActive, setLiveVoiceActive] = useState(false);
  const [autoPlayId, setAutoPlayId]     = useState<number | null>(null);
  const streamTTS = useStreamingTTS(voicePlanet, chart?.aspects ?? []);
  const [dualMode, setDualMode] = useState(false);
  const [dualAgents, setDualAgents] = useState<{
    claudeStatus: "idle" | "thinking" | "done";
    llamaStatus: "idle" | "thinking" | "done";
    claudeText: string;
    llamaText: string;
    synthesizing: boolean;
  }>({ claudeStatus: "idle", llamaStatus: "idle", claudeText: "", llamaText: "", synthesizing: false });
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastUserMsgRef = useRef("");

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) return;
    const profile = getProfile(id);
    if (profile) setProfileName(profile.name);
    const cached = getCachedChart(id);
    if (cached) setChart(cached);
    const history = getChatHistory(id);
    if (history.length > 0) {
      setMessages(history.map((m, i) => ({ ...m, id: i })));
      setMsgId(history.length);
    }
    setModelId(getOracleModel());
  }, []);

  useEffect(() => {
    fetch("/api/models")
      .then(r => r.json())
      .then((d: { availability: Record<string, { available: boolean }> }) => setModelAvailability(d.availability ?? {}))
      .catch(() => {});
  }, []);

  // Capture URL ?q= param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autoQ = params.get("q");
    if (autoQ) setPendingAutoSeed(decodeURIComponent(autoQ));
  }, []);

  // Fire auto-seed once chart + pending are ready
  useEffect(() => {
    if (chart && pendingAutoSeed) {
      const q = pendingAutoSeed;
      setPendingAutoSeed(null);
      setTimeout(() => sendMessage(q), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, pendingAutoSeed]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText, suggestions]);

  const fetchSuggestions = async (userMsg: string, assistantMsg: string) => {
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastUserMessage: userMsg, lastAssistantMessage: assistantMsg }),
      });
      const { suggestions: s } = await res.json() as { suggestions: string[] };
      if (Array.isArray(s) && s.length > 0) setSuggestions(s);
    } catch { /* silently fail */ }
  };

  const sendDualMessage = async (text?: string) => {
    const content = (text ?? query).trim();
    if (!content || orbState !== "idle") return;
    setQuery("");
    setSuggestions([]);
    lastUserMsgRef.current = content;

    const userMsg: Message = { role: "user", content, id: msgId };
    setMsgId(n => n + 1);
    setMessages(prev => [...prev, userMsg]);

    const profileId = getActiveProfileId();
    if (profileId) pushChatMessage(profileId, { role: "user", content });

    setOrbState("thinking");
    setStreamText("");
    setDualAgents({ claudeStatus: "idle", llamaStatus: "idle", claudeText: "", llamaText: "", synthesizing: false });

    try {
      const res = await fetch("/api/dual-oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          chart: chart ?? undefined,
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      setOrbState("speaking");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") {
            const newId = msgId + 1;
            const assistantMsg: Message = { role: "assistant", content: accumulated, id: newId };
            setMsgId(n => n + 1);
            setMessages(prev => [...prev, assistantMsg]);
            if (profileId) pushChatMessage(profileId, { role: "assistant", content: accumulated });
            setStreamText("");
            setOrbState("idle");
            if (voiceEnabled && !liveVoiceActive) setAutoPlayId(newId);
            setDualAgents(prev => ({ ...prev, synthesizing: false }));
            fetchSuggestions(lastUserMsgRef.current, accumulated);
            return;
          }
          try {
            const parsed = JSON.parse(data) as {
              type?: string; agent?: string; text?: string;
            };
            if (parsed.type === "agent_start") {
              setDualAgents(prev => ({
                ...prev,
                claudeStatus: parsed.agent === "claude" ? "thinking" : prev.claudeStatus,
                llamaStatus:  parsed.agent === "llama"  ? "thinking" : prev.llamaStatus,
              }));
            } else if (parsed.type === "agent_done") {
              setDualAgents(prev => ({
                ...prev,
                claudeStatus: parsed.agent === "claude" ? "done" : prev.claudeStatus,
                llamaStatus:  parsed.agent === "llama"  ? "done" : prev.llamaStatus,
                claudeText:   parsed.agent === "claude" ? (parsed.text ?? "") : prev.claudeText,
                llamaText:    parsed.agent === "llama"  ? (parsed.text ?? "") : prev.llamaText,
              }));
            } else if (parsed.type === "synthesizing") {
              setDualAgents(prev => ({ ...prev, synthesizing: true }));
            } else if (parsed.text) {
              accumulated += parsed.text;
              setStreamText(accumulated);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      const errMsg: Message = { role: "assistant", content: `Signal lost: ${String(e)}`, id: msgId + 1 };
      setMsgId(n => n + 1);
      setMessages(prev => [...prev, errMsg]);
      setStreamText("");
      setOrbState("idle");
    }
  };

  const sendMessage = async (text?: string) => {
    const content = (text ?? query).trim();
    if (!content || orbState !== "idle") return;
    setQuery("");
    setSuggestions([]);
    lastUserMsgRef.current = content;

    const userMsg: Message = { role: "user", content, id: msgId };
    setMsgId(n => n + 1);
    setMessages(prev => [...prev, userMsg]);

    const profileId = getActiveProfileId();
    if (profileId) pushChatMessage(profileId, { role: "user", content });

    setOrbState("thinking");
    setStreamText("");
    setToolCalls([]);
    streamTTS.unlock(); // ensure autoplay is unlocked before async work begins
    streamTTS.stop();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          chart: chart ?? undefined,
          history: messages.slice(-12).map(m => ({ role: m.role, content: m.content })),
          modelId,
        }),
      });

      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      setOrbState("speaking");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") {
            const newId2 = msgId + 1;
            const assistantMsg: Message = { role: "assistant", content: accumulated, id: newId2 };
            setMsgId(n => n + 1);
            setMessages(prev => [...prev, assistantMsg]);
            if (profileId) pushChatMessage(profileId, { role: "assistant", content: accumulated });
            setStreamText("");
            setToolCalls([]);
            setOrbState("idle");
            if (voiceEnabled) {
              streamTTS.flush();       // flush any remaining buffer
            } else {
              setAutoPlayId(newId2);   // fallback: post-message InsightPlayer autoplay
            }
            fetchSuggestions(lastUserMsgRef.current, accumulated);
            return;
          }
          try {
            const parsed = JSON.parse(data) as {
              text?: string;
              tool_call?: { id: string; name: string };
              tool_result?: { id: string; name: string };
            };
            if (parsed.text) {
              accumulated += parsed.text;
              setStreamText(accumulated);
              if (voiceEnabled && !liveVoiceActive) streamTTS.feed(parsed.text);
            } else if (parsed.tool_call) {
              setToolCalls(prev => [...prev, { ...parsed.tool_call!, done: false }]);
            } else if (parsed.tool_result) {
              setToolCalls(prev =>
                prev.map(tc => tc.id === parsed.tool_result!.id ? { ...tc, done: true } : tc)
              );
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      const errMsg: Message = { role: "assistant", content: `Signal lost: ${String(e)}`, id: msgId + 1 };
      setMsgId(n => n + 1);
      setMessages(prev => [...prev, errMsg]);
      setStreamText("");
      setOrbState("idle");
    }
  };

  const handleModelChange = (id: string) => {
    setModelId(id);
    setOracleModel(id);
  };

  const allMessages: Message[] = orbState === "speaking"
    ? [...messages, { role: "assistant" as const, content: streamText, id: -1 }]
    : messages;

  const keyPlanets = chart?.planets.slice(0, 5) ?? [];

  const clearHistory = () => {
    const profileId = getActiveProfileId();
    if (profileId) clearChatHistory(profileId);
    setMessages([]);
    setSuggestions([]);
    setMsgId(0);
  };

  const sendDailyBriefing = () => {
    if (!chart) return;
    const sun  = chart.planets.find(p => p.name === "Sun");
    const moon = chart.planets.find(p => p.name === "Moon");
    const asc  = chart.houses[0];
    const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const prompt = `Give me a personalized cosmic briefing for today, ${date}. ${profileName ? `I am ${profileName}.` : ""} My natal Sun is ${sun?.sign} House ${sun?.house}, Moon is ${moon?.sign} House ${moon?.house}, Rising is ${asc?.sign}. 3–4 sentences — specific, poetic, actionable.`;
    sendMessage(prompt);
  };

  const askAboutPlanet = (planet: string, sign: string, house: number) => {
    sendMessage(`Tell me about my ${planet} in ${sign} in House ${house} — what does this placement reveal about how I operate in this area of life?`);
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "#03040a" }}>
      <DashboardBg />
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-0 min-w-0 md:ml-[68px] mb-[60px] md:mb-0 relative z-10">

        {/* ── Header ── */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-shrink-0 flex items-center justify-between px-6 py-3 hud-scan-bar"
          style={{ borderBottom: "1px solid rgba(124,58,237,0.2)", background: "rgba(3,4,10,0.85)", backdropFilter: "blur(24px)" }}
        >
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 text-xs font-medium cursor-pointer" style={{ color: "#64748b" }}>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
                Dashboard
              </motion.button>
            </Link>
            <span style={{ color: "#1e293b" }}>/</span>
            <span className="text-xs font-bold tracking-widest gradient-text">AI ORACLE</span>
            {profileName && <><span style={{ color: "#1e293b" }}>/</span><span className="text-xs font-medium" style={{ color: "#64748b" }}>{profileName}</span></>}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: orbState === "idle" ? "#334155" : orbState === "thinking" ? "#f59e0b" : "#06b6d4", boxShadow: orbState !== "idle" ? `0 0 6px ${orbState === "thinking" ? "#f59e0b" : "#06b6d4"}` : "none" }} />
              <span className="text-[9px] font-bold tracking-widest hidden sm:block"
                style={{ color: orbState === "idle" ? "#334155" : orbState === "thinking" ? "#f59e0b" : "#06b6d4" }}>
                {orbState === "idle" ? "STANDBY" : orbState === "thinking" ? "PROCESSING" : "TRANSMITTING"}
              </span>
            </div>
            {/* Voice Oracle — planet selector */}
            <div className="flex flex-col items-end gap-0.5">
              <VoiceOracle
                planet={voicePlanet}
                enabled={voiceEnabled}
                onPlanetChange={setVoicePlanet}
                onToggle={() => {
                  streamTTS.unlock();
                  setVoiceEnabled(v => !v);
                }}
                onLiveVoice={setLiveVoiceActive}
              />
              {voiceEnabled && streamTTS.activeProvider && (
                <span style={{ fontSize: 7, color: "#475569", letterSpacing: 0.5 }}>
                  via {streamTTS.activeProvider}
                </span>
              )}
            </div>

            {/* Dual Oracle toggle */}
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => setDualMode(v => !v)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-bold tracking-wider cursor-pointer"
              style={{
                background: dualMode ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.03)",
                border: dualMode ? "1px solid rgba(124,58,237,0.5)" : "1px solid rgba(255,255,255,0.08)",
                color: dualMode ? "#a78bfa" : "#475569",
                boxShadow: dualMode ? "0 0 12px rgba(124,58,237,0.3)" : "none",
              }}
              title="Run Claude + Llama in parallel, synthesize results"
            >
              <span style={{ fontSize: 10 }}>⚡</span>
              <span className="hidden sm:inline">DUAL ORACLE</span>
            </motion.button>

            <ModelSelector currentModelId={modelId} availability={modelAvailability} onChange={handleModelChange} />
            {messages.length > 0 && orbState === "idle" && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={clearHistory}
                className="text-[8px] font-bold tracking-widest px-2 py-1 rounded-lg cursor-pointer"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#334155" }}>
                CLEAR
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* ── Main layout ── */}
        <div className="flex-1 flex min-h-0 overflow-hidden">

          {/* ── Left panel ── */}
          <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="flex-shrink-0 hidden md:flex flex-col items-center gap-5 px-6 py-8 overflow-y-auto"
            style={{ width: 320, borderRight: "1px solid rgba(124,58,237,0.12)", background: "rgba(3,4,10,0.5)", scrollbarWidth: "none" }}>

            <div className="flex flex-col items-center gap-3">
              <LiquidMetalOrb state={orbState} size={240} />
              <div className="text-center">
                <p className="text-[10px] font-bold tracking-[0.25em]" style={{ color: "#64748b" }}>COSMORA ORACLE</p>
                <motion.p key={orbState} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-[8px] tracking-widest mt-0.5"
                  style={{ color: orbState === "idle" ? "#475569" : orbState === "thinking" ? "#f59e0b" : "#06b6d4" }}>
                  {orbState === "idle" ? "AWAITING QUERY" : orbState === "thinking" ? "READING THE COSMOS" : "CHANNELING INSIGHT"}
                </motion.p>
              </div>
            </div>

            <div style={{ width: "80%", height: 1, background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.3), transparent)" }} />

            {chart && (
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={sendDailyBriefing}
                disabled={orbState !== "idle"}
                className="w-full py-2.5 rounded-xl text-[9px] font-bold tracking-widest cursor-pointer disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.2))", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}>
                ✦ TODAY&apos;S COSMIC BRIEFING
              </motion.button>
            )}

            <Link href="/dashboard/report" className="w-full">
              <motion.div whileHover={{ scale: 1.02, borderColor: "rgba(196,181,253,0.3)" }}
                className="w-full py-2.5 px-3 rounded-xl flex items-center gap-2 cursor-pointer"
                style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}>
                <span className="text-xs" style={{ color: "#c4b5fd" }}>✦</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] font-bold tracking-widest" style={{ color: "#c4b5fd" }}>NATAL REPORT</p>
                  <p className="text-[8px]" style={{ color: "#334155" }}>Full AI chart interpretation</p>
                </div>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 flex-shrink-0" style={{ color: "#334155" }}>
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
            </Link>

            {keyPlanets.length > 0 && (
              <div className="w-full">
                <p className="text-[8px] font-bold tracking-widest mb-3" style={{ color: "#64748b" }}>KEY PLACEMENTS · click to ask</p>
                <div className="flex flex-col gap-2">
                  {keyPlanets.map((p, i) => (
                    <InsightCard key={p.name} planet={p.name} sign={p.sign} house={p.house}
                      color={PLANET_COLORS[p.name] ?? "#94a3b8"} delay={0.3 + i * 0.06}
                      onClick={orbState === "idle" ? () => askAboutPlanet(p.name, p.sign, p.house) : undefined} />
                  ))}
                </div>
              </div>
            )}

            {ORACLE_PROMPT_CATEGORIES.map(cat => (
              <div key={cat.label} className="w-full">
                <p className="text-[8px] font-bold tracking-widest mb-2" style={{ color: cat.color }}>{cat.label}</p>
                <div className="flex flex-col gap-1.5">
                  {cat.prompts.map((p, i) => (
                    <motion.button key={i} whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}
                      onClick={() => sendMessage(p)} disabled={orbState !== "idle"}
                      className="text-left text-[10px] leading-snug px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-40"
                      style={{ color: "#64748b", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      {p}
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>

          {/* ── Chat panel ── */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5" style={{ scrollbarWidth: "thin" }}>
              {allMessages.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="h-full flex flex-col items-center justify-center text-center gap-4">
                  <div className="md:hidden mb-4"><LiquidMetalOrb state={orbState} size={160} /></div>
                  <p className="text-2xl font-light" style={{ color: "#475569" }}>The cosmos awaits.</p>
                  <p className="text-sm max-w-sm" style={{ color: "#64748b" }}>
                    Ask the Oracle anything about your chart, transits, or the cosmic forces shaping your path.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {chart && (
                      <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={sendDailyBriefing}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider cursor-pointer"
                        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(6,182,212,0.25))", border: "1px solid rgba(124,58,237,0.4)", color: "#a78bfa" }}>
                        ✦ Get Today&apos;s Cosmic Briefing
                      </motion.button>
                    )}
                    {ORACLE_PROMPTS.slice(0, 3).map((p, i) => (
                      <motion.button key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 + i * 0.08 }}
                        whileHover={{ scale: 1.03, borderColor: "rgba(168,85,247,0.5)" }} whileTap={{ scale: 0.97 }}
                        onClick={() => sendMessage(p)}
                        className="px-4 py-2 rounded-xl text-xs cursor-pointer transition-all duration-200"
                        style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", color: "#7c3aed" }}>
                        {p}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <>
                  {allMessages.map((m, i) => (
                    <div key={m.id}>
                      <OracleBubble
                        message={m}
                        isStreaming={m.id === -1 && orbState === "speaking"}
                        voicePlanet={voiceEnabled ? voicePlanet : undefined}
                        chartAspects={chart?.aspects}
                        autoPlay={voiceEnabled && autoPlayId === m.id}
                      />
                      {/* Dual agent research panels */}
                      {m.id === -1 && dualMode && (dualAgents.claudeStatus !== "idle" || dualAgents.llamaStatus !== "idle") && (
                        <div className="mt-3 flex flex-col gap-2">
                          {/* Agent status row */}
                          <div className="flex gap-2 ml-10">
                            {(["claude", "llama"] as const).map(agent => {
                              const status = agent === "claude" ? dualAgents.claudeStatus : dualAgents.llamaStatus;
                              const color = agent === "claude" ? "#a78bfa" : "#f97316";
                              const label = agent === "claude" ? "✦ CLAUDE · Hellenistic" : "⬡ LLAMA · Psychological";
                              return (
                                <motion.div
                                  key={agent}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1"
                                  style={{
                                    background: status === "done" ? `${color}10` : "rgba(255,255,255,0.03)",
                                    border: `1px solid ${status === "done" ? color + "33" : "rgba(255,255,255,0.07)"}`,
                                  }}
                                >
                                  {status === "thinking" ? (
                                    <motion.div
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                      className="w-3 h-3 rounded-full border border-t-transparent flex-shrink-0"
                                      style={{ borderColor: color }}
                                    />
                                  ) : status === "done" ? (
                                    <span style={{ color, fontSize: 10 }}>✓</span>
                                  ) : (
                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)" }} />
                                  )}
                                  <span style={{ fontSize: 9, letterSpacing: 1, fontFamily: "'Share Tech Mono', monospace", color: status === "done" ? color : "#475569" }}>
                                    {label}
                                  </span>
                                </motion.div>
                              );
                            })}
                          </div>

                          {/* Synthesis indicator */}
                          {dualAgents.synthesizing && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="ml-10 flex items-center gap-2 px-3 py-1.5 rounded-lg"
                              style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}
                            >
                              <motion.div
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                                style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", flexShrink: 0 }}
                              />
                              <span style={{ fontSize: 9, letterSpacing: 1.5, fontFamily: "'Share Tech Mono', monospace", color: "#a78bfa" }}>
                                SYNTHESIZING · FINDING CONSENSUS
                              </span>
                            </motion.div>
                          )}
                        </div>
                      )}

                      {/* Tool call cards shown after the streaming assistant message */}
                      {m.id === -1 && !dualMode && toolCalls.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1.5">
                          {toolCalls.map(tc => (
                            <ToolCallCard key={tc.id} toolCall={tc} />
                          ))}
                        </div>
                      )}
                      {m.role === "assistant" && m.id !== -1 && i === allMessages.length - 1 && orbState === "idle" && (
                        <AnimatePresence>
                          {suggestions.length > 0 && (
                            <div className="mt-3">
                              <FollowUpSuggestions suggestions={suggestions} onSelect={(s) => sendMessage(s)} />
                            </div>
                          )}
                        </AnimatePresence>
                      )}
                    </div>
                  ))}
                </>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 px-6 pb-6 pt-3" style={{ borderTop: "1px solid rgba(124,58,237,0.1)" }}>
              <div className="flex items-center gap-3 px-5 py-4 rounded-2xl"
                style={{ background: "rgba(4,4,28,0.8)", border: "1px solid rgba(124,58,237,0.22)", backdropFilter: "blur(20px)", boxShadow: "0 0 30px rgba(124,58,237,0.05)" }}>
                <motion.div
                  animate={{ scale: orbState !== "idle" ? [1, 1.3, 1] : 1, boxShadow: orbState === "thinking" ? ["0 0 8px rgba(245,158,11,0.4)", "0 0 18px rgba(245,158,11,0.7)", "0 0 8px rgba(245,158,11,0.4)"] : orbState === "speaking" ? ["0 0 8px rgba(6,182,212,0.4)", "0 0 18px rgba(6,182,212,0.7)", "0 0 8px rgba(6,182,212,0.4)"] : "0 0 10px rgba(124,58,237,0.4)" }}
                  transition={{ duration: 1.2, repeat: orbState !== "idle" ? Infinity : 0 }}
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}>
                  ✦
                </motion.div>
                <input ref={inputRef} type="text" value={query}
                  onChange={e => { setQuery(e.target.value); if (e.target.value) setSuggestions([]); }}
                  onKeyDown={e => e.key === "Enter" && (dualMode ? sendDualMessage() : sendMessage())}
                  placeholder={dualMode ? "Ask both oracles — consensus awaits…" : chart ? "Ask the Oracle about your chart…" : "Ask the Oracle anything…"}
                  disabled={orbState !== "idle"}
                  className="flex-1 bg-transparent text-sm outline-none disabled:opacity-40"
                  style={{ color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif" }} />
                <AnimatePresence mode="wait">
                  {orbState !== "idle" ? (
                    <motion.div key="spinner" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 rounded-full border-2 border-t-transparent"
                        style={{ borderColor: orbState === "thinking" ? "#f59e0b" : "#06b6d4" }} />
                    </motion.div>
                  ) : (
                    <motion.button key="send" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} onClick={() => dualMode ? sendDualMessage() : sendMessage()}
                      disabled={!query.trim()} className="flex-shrink-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ color: "#7c3aed" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                        <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
              <p className="text-center text-[9px] mt-2" style={{ color: "#1e293b" }}>
                COSMORA ORACLE · {getModelById(modelId).name.toUpperCase()} · SYMBOLIC INTERPRETATION ONLY
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
