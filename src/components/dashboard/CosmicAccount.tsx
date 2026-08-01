"use client";

import { useState, useEffect } from "react";
import { isSyncConfigured } from "@/lib/sync/supabase";
import { sendMagicLink, signInWithGoogle, signOut, getSession, onAuthChange } from "@/lib/sync/auth";
import { syncNow, deleteCloudData } from "@/lib/sync/engine";
import { setResearchOptIn, getResearchOptIn } from "@/lib/sync/research";
import { getActiveProfileId } from "@/lib/storage";

const MONO = "'Fragment Mono', monospace";
const GOLD = "#C8A55B";
const BORDER = "1px solid rgba(40,60,100,0.3)";

const CONSENT_COPY =
  "Contribute anonymized pattern signals to Cosmora's research corpus: event type, astrological signature tokens, " +
  "emotional direction and strength (bucketed), date precision, and outcome confirmations. " +
  "Never included: your words, names, people, places, dates, or birth data. " +
  "Signals carry a random id that is not connected to your account — which also means already-contributed " +
  "signals cannot be individually retracted later. You can stop contributing at any time.";

export function CosmicAccount() {
  const [email, setEmail] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSession().then(s => { if (s) { setUserEmail(s.user.email ?? "signed in"); getResearchOptIn().then(setOptIn); } });
    return onAuthChange(uid => {
      if (!uid) { setUserEmail(null); setOptIn(false); return; }
      getSession().then(s => setUserEmail(s?.user.email ?? "signed in"));
      getResearchOptIn().then(setOptIn);
      const pid = getActiveProfileId();
      if (pid) { setStatus("Syncing…"); syncNow(pid).then(r => setStatus(r ? `Synced — ${r.pushed} up, ${r.pulled} down` : "")); }
    });
  }, []);

  if (!isSyncConfigured()) return null;

  const label = (t: string) => (
    <p style={{ color: "#445577", fontSize: 8, fontFamily: MONO, letterSpacing: "0.15em", marginBottom: 6 }}>{t}</p>
  );

  return (
    <div style={{ background: "rgba(10,15,35,0.6)", border: BORDER, borderRadius: 12, padding: 18, marginBottom: 20 }}>
      <p style={{ color: GOLD, fontSize: 9, fontFamily: MONO, letterSpacing: "0.18em", marginBottom: 10 }}>COSMIC ACCOUNT</p>

      {!userEmail ? (
        <>
          <p style={{ color: "#6677AA", fontSize: 12, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", marginBottom: 12 }}>
            Back up your chronicle. Sync across devices.
          </p>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@cosmos.com" type="email"
              style={{ flex: 1, padding: "8px 10px", background: "rgba(5,8,20,0.7)", border: BORDER, borderRadius: 8, color: "#C0D4FF", fontSize: 11, fontFamily: MONO, outline: "none" }} />
            <button disabled={busy || !email.includes("@")}
              onClick={async () => { setBusy(true); const r = await sendMagicLink(email); setStatus(r.error ?? "Magic link sent — check your email"); setBusy(false); }}
              style={{ padding: "0 14px", borderRadius: 8, cursor: "pointer", background: `${GOLD}15`, border: `1px solid ${GOLD}45`, color: GOLD, fontSize: 9, fontFamily: MONO }}>
              SEND LINK
            </button>
          </div>
          <button disabled={busy}
            onClick={async () => { setBusy(true); const r = await signInWithGoogle(); if (r.error) { setStatus(r.error); setBusy(false); } }}
            style={{ width: "100%", padding: "8px 0", borderRadius: 8, cursor: "pointer", background: "transparent", border: BORDER, color: "#8899BB", fontSize: 9, fontFamily: MONO, letterSpacing: "0.1em" }}>
            CONTINUE WITH GOOGLE
          </button>
          {status && (
            <p style={{ color: status === "Magic link sent — check your email" ? "#4ade80" : "#f87171", fontSize: 9, fontFamily: MONO, marginTop: 8 }}>
              {status}
            </p>
          )}
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
            <span style={{ color: "#C0D4FF", fontSize: 11, fontFamily: MONO }}>{userEmail}</span>
            <button onClick={async () => { await signOut(); }}
              style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 6, cursor: "pointer", background: "transparent", border: BORDER, color: "#445577", fontSize: 8, fontFamily: MONO }}>
              SIGN OUT
            </button>
          </div>

          {label("SYNC")}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <button disabled={busy}
              onClick={async () => {
                const pid = getActiveProfileId(); if (!pid) return;
                setBusy(true); setStatus("Syncing…");
                const r = await syncNow(pid);
                setStatus(r ? `Synced — ${r.pushed} up, ${r.pulled} down` : "Sync failed");
                setBusy(false);
              }}
              style={{ padding: "6px 14px", borderRadius: 8, cursor: "pointer", background: `${GOLD}12`, border: `1px solid ${GOLD}40`, color: GOLD, fontSize: 9, fontFamily: MONO }}>
              SYNC NOW
            </button>
            <span style={{ color: "#445577", fontSize: 9, fontFamily: MONO }}>{status}</span>
          </div>

          {label("RESEARCH CONTRIBUTION")}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
            <button
              onClick={async () => {
                const next = !optIn;
                const r = await setResearchOptIn(next);
                if (!r.error) setOptIn(next);
              }}
              style={{
                width: 34, height: 18, borderRadius: 9, cursor: "pointer", flexShrink: 0, position: "relative",
                background: optIn ? "rgba(74,222,128,0.25)" : "rgba(40,60,100,0.4)", border: BORDER,
              }}>
              <div style={{ position: "absolute", top: 2, left: optIn ? 17 : 2, width: 12, height: 12, borderRadius: "50%", background: optIn ? "#4ade80" : "#445577", transition: "left 0.15s" }} />
            </button>
            <p style={{ color: "#556688", fontSize: 10, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", lineHeight: 1.55, margin: 0 }}>
              {CONSENT_COPY}
            </p>
          </div>

          {label("DANGER")}
          <button disabled={busy}
            onClick={async () => {
              if (!confirm("Delete all your cloud data? Your local data stays on this device.")) return;
              setBusy(true);
              const r = await deleteCloudData();
              setStatus(r.error ?? "Cloud data deleted");
              setBusy(false);
            }}
            style={{ padding: "6px 14px", borderRadius: 8, cursor: "pointer", background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 9, fontFamily: MONO }}>
            DELETE MY CLOUD DATA
          </button>
        </>
      )}
    </div>
  );
}
