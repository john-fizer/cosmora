"use client";

import { useRouter } from "next/navigation";
import { useSubscription } from "@/lib/useSubscription";

interface ProGateProps {
  children: React.ReactNode;
  feature?: string;
  redirectTo?: string;
}

const STRIPE_CONFIGURED = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export function ProGate({ children, feature, redirectTo = "/dashboard/upgrade" }: ProGateProps) {
  const { isPro, loading } = useSubscription();
  const router = useRouter();

  // Stripe not yet configured — show all features
  if (!STRIPE_CONFIGURED) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="w-6 h-6 rounded-full border border-white/10 border-t-white/40 animate-spin" />
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-6 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center liquid-glass-cosmos text-2xl">
          ✦
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-white/40 mb-2">COSMORA PRO</p>
          <h2 className="text-xl font-medium text-white mb-2">
            {feature ? `${feature} is a Pro feature` : "Unlock with Cosmora Pro"}
          </h2>
          <p className="text-sm text-white/50 max-w-sm leading-relaxed">
            Get unlimited oracle readings, transit forecasts, astrocartography, zodiacal releasing, and more.
          </p>
        </div>
        <button
          onClick={() => router.push(redirectTo)}
          className="px-6 py-3 rounded-xl text-sm font-semibold tracking-[0.12em] cosmic-btn-primary"
        >
          VIEW PLANS →
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
