"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PLANET_VOICES, VOICE_PLANET_ORDER, type VoicePlanet } from "@/lib/oracle/voice";
import { useOracleSession } from "@/lib/oracle/useOracleSession";
import { AgentHaloRing } from "@/components/oracle/AgentHaloRing";

interface VoiceOracleProps {
  planet: VoicePlanet;
  enabled: boolean;
  onPlanetChange: (p: VoicePlanet) => void;
  onToggle: () => void;
  onLiveVoice?: (active: boolean) => void;
}

export function VoiceOracle({ planet, enabled, onPlanetChange, onToggle, onLiveVoice }: VoiceOracleProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const profile = PLANET_VOICES[planet];

  const { connect, disconnect, isConnected, agentState, agentVolume, userVolume } = useOracleSession();

  // Connect when enabled, disconnect when disabled
  useEffect(() => {
    if (enabled) {
      void connect(planet);
    } else {
      void disconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // When planet changes while enabled and connected: reconnect
  useEffect(() => {
    if (enabled && isConnected) {
      void disconnect().then(() => connect(planet));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planet]);

  // Notify parent when connection state changes
  useEffect(() => {
    onLiveVoice?.(isConnected);
  }, [isConnected, onLiveVoice]);

  const handleToggle = () => {
    if (!enabled) setPanelOpen(true);
    else setPanelOpen(false);
    onToggle();
  };

  // Determine label text
  const buttonLabel = !enabled ? "VOICE" : isConnected ? "LIVE" : "CONNECTING…";

  // Determine provider label in panel header
  const providerLabel = isConnected ? "VOICE CHANNEL · LIVEKIT" : "VOICE CHANNEL · ELEVENLABS";

  // Determine footer note
  const footerNote = isConnected
    ? "Live voice · bidirectional · LiveKit"
    : "Voice stability & style shift with your chart aspects · ElevenLabs TTS";

  return (
    <div className="relative">
      {/* ── Toggle button ── */}
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={handleToggle}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-bold tracking-wider cursor-pointer"
        style={{
          background: enabled ? `${profile.color}18` : "rgba(255,255,255,0.03)",
          border: `1px solid ${enabled ? (isConnected ? profile.color + "88" : profile.color + "55") : "rgba(255,255,255,0.08)"}`,
          color: enabled ? profile.color : "#475569",
          boxShadow: enabled ? (isConnected ? `0 0 14px ${profile.color}44` : `0 0 10px ${profile.color}28`) : "none",
          transition: "all 0.2s",
        }}
      >
        {enabled ? (
          <AgentHaloRing
            width={48}
            height={32}
            state={agentState}
            color={profile.color}
            agentVolume={agentVolume}
            userVolume={userVolume}
          />
        ) : (
          <span style={{ fontSize: 11, lineHeight: 1 }}>◎</span>
        )}
        <span className="hidden sm:inline">
          {buttonLabel}
        </span>
        {enabled && (
          <motion.button
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={e => { e.stopPropagation(); setPanelOpen(v => !v); }}
            style={{ color: profile.color + "99", marginLeft: 2, lineHeight: 1 }}
          >
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 8, height: 8 }}>
              <path d="M2 3.5l3 3 3-3" strokeLinecap="round" />
            </svg>
          </motion.button>
        )}
      </motion.button>

      {/* ── Planet selector panel ── */}
      <AnimatePresence>
        {panelOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setPanelOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 top-full mt-2 z-50 rounded-2xl"
              style={{
                width: 296,
                background: "rgba(4,4,24,0.98)",
                border: "1px solid rgba(124,58,237,0.18)",
                backdropFilter: "blur(28px)",
                boxShadow: "0 0 50px rgba(0,0,0,0.6), 0 0 20px rgba(124,58,237,0.08)",
              }}
            >
              <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 16, color: profile.color }}>{profile.symbol}</span>
                  <div>
                    <p style={{ fontSize: 8, letterSpacing: 2, color: "#475569", fontWeight: 700 }}>{providerLabel}</p>
                    <p style={{ fontSize: 7, color: profile.color + "99" }}>{profile.voiceName} · {profile.archetype}</p>
                  </div>
                </div>

                <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.2), transparent)" }} />

                {/* 3×3 planet grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  {VOICE_PLANET_ORDER.map(p => {
                    const prof = PLANET_VOICES[p];
                    const active = p === planet;
                    return (
                      <motion.button
                        key={p}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { onPlanetChange(p); setPanelOpen(false); }}
                        className="flex flex-col items-center gap-1 py-2.5 rounded-xl cursor-pointer relative overflow-hidden"
                        style={{
                          background: active ? `${prof.color}16` : "rgba(255,255,255,0.02)",
                          border: `1px solid ${active ? prof.color + "50" : "rgba(255,255,255,0.06)"}`,
                          boxShadow: active ? `0 0 14px ${prof.color}22` : "none",
                          transition: "all 0.18s",
                        }}
                      >
                        {active && (
                          <motion.div
                            animate={{ x: ["-120%", "120%"] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                            style={{
                              position: "absolute", inset: 0,
                              background: `linear-gradient(90deg, transparent, ${prof.color}18, transparent)`,
                              pointerEvents: "none",
                            }}
                          />
                        )}
                        <span style={{ fontSize: 18, color: prof.color, lineHeight: 1 }}>{prof.symbol}</span>
                        <span style={{ fontSize: 7, letterSpacing: 1, color: active ? prof.color : "#475569", fontWeight: 700, position: "relative" }}>
                          {p.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 6, color: active ? prof.color + "80" : "#334155", letterSpacing: 0.3, position: "relative" }}>
                          {prof.voiceName}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Selected voice description */}
                <div className="px-3 py-2 rounded-xl" style={{ background: `${profile.color}0a`, border: `1px solid ${profile.color}20` }}>
                  <p style={{ fontSize: 8, color: profile.color, fontWeight: 700, letterSpacing: 0.5 }}>
                    {profile.symbol} {profile.planet} — {profile.archetype}
                  </p>
                  <p style={{ fontSize: 7, color: "#64748b", marginTop: 2, lineHeight: 1.4 }}>
                    {profile.description}
                  </p>
                </div>

                <p style={{ fontSize: 7, color: "#1e293b", letterSpacing: 0.3, textAlign: "center" }}>
                  {footerNote}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
