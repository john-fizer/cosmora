"use client";

import { useState, useEffect } from "react";

const CUSTOMER_KEY = "cosmora_customer_id";

export type Tier = "free" | "pro";

export interface SubscriptionStatus {
  customerId: string;
  tier: Tier;
  isPro: boolean;
  oracleUsed: number;
  oracleLimit: number;
  loading: boolean;
}

function getOrCreateCustomerId(): string {
  let id = localStorage.getItem(CUSTOMER_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CUSTOMER_KEY, id);
  }
  return id;
}

export function useSubscription(): SubscriptionStatus {
  const [status, setStatus] = useState<SubscriptionStatus>({
    customerId: "",
    tier: "free",
    isPro: false,
    oracleUsed: 0,
    oracleLimit: 5,
    loading: true,
  });

  useEffect(() => {
    const customerId = getOrCreateCustomerId();

    fetch(`/api/stripe/status?customerId=${customerId}`)
      .then((r) => r.json())
      .then((data) => {
        setStatus({
          customerId,
          tier: data.tier,
          isPro: data.tier === "pro",
          oracleUsed: data.oracleUsed,
          oracleLimit: data.oracleLimit,
          loading: false,
        });
      })
      .catch(() => {
        setStatus((s) => ({ ...s, customerId, loading: false }));
      });
  }, []);

  return status;
}

export function getCustomerId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CUSTOMER_KEY);
}
