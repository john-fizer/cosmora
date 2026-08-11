"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { DashboardBg } from "@/components/ui/DashboardBg";
import { getActiveProfileId, getProfile, getCachedChart } from "@/lib/storage";
import type { StoredProfile } from "@/lib/storage";
import type { ChartData } from "@/lib/astrology/types";
import { getChronicle } from "@/lib/chronicle/storage";
import type { LifeEvent } from "@/lib/chronicle/types";
import { computeSkyState } from "@/lib/chronicle/sky-state";
import type { SkyState } from "@/lib/chronicle/sky-state";

// Three.js/R3F must not render during SSR — matches how map/chart pages load their Canvas components.
const ObservatoryCanvas = dynamic(() => import("@/components/three/ObservatoryCanvas"), { ssr: false });

const MONO = "'Fragment Mono', monospace";

export default function ObservatoryPage() {
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [chart, setChart] = useState<ChartData | null>(null);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = getActiveProfileId();
    if (!id) { setLoading(false); return; }
    const p = getProfile(id);
    const c = getCachedChart(id);
    if (!p || !c) { setLoading(false); return; }
    setProfile(p);
    setChart(c);
    setEvents(getChronicle(id).events);
    setLoading(false);
  }, []);

  const skyStates = useMemo(() => {
    const map = new Map<string, SkyState>();
    if (!chart || !profile) return map;
    for (const e of events) map.set(e.id, computeSkyState(chart, profile, e.startsAt, e.datePrecision));
    return map;
  }, [chart, profile, events]);

  const selected = events.find(e => e.id === selectedId) ?? null;
  const selectedSkyState = selectedId ? skyStates.get(selectedId) ?? null : null;

  if (!loading && (!profile || !chart)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#010810" }}>
        <p style={{ color: "#445577", fontSize: 11, fontFamily: MONO }} className="ml-16">
          CREATE A PROFILE TO ENTER THE OBSERVATORY
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <DashboardBg />
      <div className="flex-1 relative md:ml-[68px] mb-[60px] md:mb-0">
        {loading || !chart ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p style={{ color: "#475569", fontSize: 11, fontFamily: MONO, letterSpacing: "0.15em" }}>
              LOADING OBSERVATORY
            </p>
          </div>
        ) : (
          <>
            <ObservatoryCanvas chart={chart} events={events} skyStates={skyStates} onNodeClick={setSelectedId} />

            <div className="absolute top-4 left-4" style={{ zIndex: 10 }}>
              <Link href="/dashboard" style={{ color: "#64748b", fontSize: 12, fontFamily: MONO, textDecoration: "none" }}>
                ← Dashboard
              </Link>
              <p style={{ color: "#C8A55B", fontSize: 13, fontFamily: MONO, letterSpacing: "0.15em", marginTop: 4 }}>
                OBSERVATORY
              </p>
            </div>

            {selected && selectedSkyState && (
              <div
                className="absolute bottom-4 right-4 rounded-2xl p-4"
                style={{
                  zIndex: 10, width: 320, background: "rgba(4,4,28,0.85)",
                  border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>{selected.title}</p>
                  <button
                    onClick={() => setSelectedId(null)}
                    style={{ color: "#475569", fontSize: 12, cursor: "pointer", background: "none", border: "none" }}
                  >
                    ✕
                  </button>
                </div>
                <p style={{ color: "#64748b", fontSize: 12, fontFamily: MONO, marginBottom: 8 }}>{selected.startsAt}</p>
                <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
                  {selected.narrative.slice(0, 220)}{selected.narrative.length > 220 ? "…" : ""}
                </p>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                  <p style={{ color: "#334155", fontSize: 11, fontFamily: MONO, letterSpacing: "0.1em", marginBottom: 4 }}>
                    ACTIVATES
                  </p>
                  {selectedSkyState.transitHits.slice(0, 5).map((h, i) => (
                    <p key={i} style={{ color: "#64748b", fontSize: 12, fontFamily: MONO }}>
                      {h.transitingBody} {h.aspect} natal {h.natalPoint} · orb {h.orb.toFixed(1)}°
                    </p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
