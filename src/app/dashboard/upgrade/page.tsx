"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useSubscription } from "@/lib/useSubscription";
import { DashboardBg } from "@/components/ui/DashboardBg";

const MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? "";
const YEARLY_PRICE_ID  = process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID ?? "";

const FREE_FEATURES = [
  "Natal chart wheel & positions",
  "Houses, aspects & delineations",
  "1 profile",
  "5 oracle readings / day",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited oracle readings",
  "Transit forecast (3mo / 6mo / 1yr)",
  "Astrocartography map + AI location readings",
  "Zodiacal releasing (8 levels, any sign)",
  "Full Arabic lots catalog (15 lots)",
  "Solar return chart",
  "Compatibility charts",
  "Up to 5 profiles",
];

export default function UpgradePage() {
  return (
    <Suspense fallback={null}>
      <UpgradePageInner />
    </Suspense>
  );
}

function UpgradePageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { customerId, isPro, loading } = useSubscription();
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [working, setWorking] = useState(false);

  const justUpgraded = params.get("upgraded") === "1";

  async function handleCheckout() {
    if (!customerId) return;
    setWorking(true);
    const priceId = billing === "yearly" ? YEARLY_PRICE_ID : MONTHLY_PRICE_ID;
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, priceId }),
    });
    const { url, error } = await res.json();
    if (error || !url) { setWorking(false); return; }
    window.location.href = url;
  }

  async function handlePortal() {
    if (!customerId) return;
    setWorking(true);
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
    else setWorking(false);
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <DashboardBg />

      <div className="flex-1 flex flex-col items-center justify-center md:ml-[68px] mb-[60px] md:mb-0 relative z-10 overflow-y-auto px-6 py-12">

        {justUpgraded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 px-5 py-3 rounded-xl text-sm font-medium liquid-glass-cosmos"
            style={{ color: "rgba(160,240,180,0.95)" }}
          >
            ✦ Welcome to Cosmora Pro — your cosmos just expanded.
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-white/40 mb-3">COSMORA PRO</p>
          <h1 className="text-3xl font-light text-white mb-3">
            Read the cosmos at <em style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic" }}>full depth</em>
          </h1>
          <p className="text-sm text-white/50 max-w-sm mx-auto leading-relaxed">
            Every technique. Every layer. Unlimited AI readings.
          </p>
        </motion.div>

        {/* Billing toggle */}
        {!isPro && !loading && (
          <div className="flex items-center gap-1 p-1 rounded-xl liquid-glass mb-8">
            {(["monthly", "yearly"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`px-5 py-2 rounded-lg text-xs font-semibold tracking-[0.15em] transition-all duration-200 ${
                  billing === b ? "cosmic-option selected" : "text-white/40 hover:text-white/60"
                }`}
              >
                {b === "monthly" ? "MONTHLY" : "YEARLY  –17%"}
              </button>
            ))}
          </div>
        )}

        {/* Plan cards */}
        <div className="flex flex-col md:flex-row gap-4 w-full max-w-2xl">

          {/* Free */}
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="flex-1 rounded-2xl p-6 liquid-glass"
          >
            <p className="text-[10px] font-semibold tracking-[0.25em] text-white/40 mb-1">FREE</p>
            <p className="text-2xl font-light text-white mb-5">$0</p>
            <ul className="space-y-2.5 mb-6">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-white/60">
                  <span className="mt-0.5 text-white/30">○</span> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-2.5 rounded-xl text-xs font-semibold tracking-[0.15em] cosmic-option text-white/50"
            >
              CURRENT PLAN
            </button>
          </motion.div>

          {/* Pro */}
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
            className="flex-1 rounded-2xl p-6 liquid-glass-strong relative overflow-hidden"
          >
            <div className="absolute inset-0 pointer-events-none" style={{
              background: "radial-gradient(ellipse at 50% 0%, rgba(123,111,212,0.12) 0%, transparent 70%)"
            }} />
            <p className="text-[10px] font-semibold tracking-[0.25em] mb-1" style={{ color: "rgba(168,140,255,0.8)" }}>PRO</p>
            <div className="flex items-baseline gap-1 mb-5">
              <span className="text-2xl font-light text-white">
                {billing === "yearly" ? "$8.25" : "$14"}
              </span>
              <span className="text-xs text-white/40">/ mo</span>
              {billing === "yearly" && (
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(123,111,212,0.18)", color: "rgba(168,140,255,0.9)" }}>
                  billed $99/yr
                </span>
              )}
            </div>
            <ul className="space-y-2.5 mb-6">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-white/80">
                  <span className="mt-0.5" style={{ color: "rgba(168,140,255,0.8)" }}>✦</span> {f}
                </li>
              ))}
            </ul>

            {isPro ? (
              <button
                onClick={handlePortal}
                disabled={working}
                className="w-full py-2.5 rounded-xl text-xs font-semibold tracking-[0.15em] cosmic-btn-primary"
              >
                {working ? "OPENING PORTAL…" : "MANAGE SUBSCRIPTION"}
              </button>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={working || loading}
                className="w-full py-2.5 rounded-xl text-xs font-semibold tracking-[0.15em] cosmic-btn-primary"
              >
                {working ? "REDIRECTING…" : "UPGRADE TO PRO →"}
              </button>
            )}
          </motion.div>
        </div>

        <p className="mt-6 text-[11px] text-white/25 text-center">
          Cancel anytime · Billed via Stripe · No hidden fees
        </p>
      </div>
    </div>
  );
}
