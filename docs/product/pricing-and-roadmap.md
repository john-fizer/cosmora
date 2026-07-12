# Cosmora — Pricing Model & Slice Roadmap

**Date:** 2026-07-12
**Status:** Direction locked with John; numbers are launch targets, revisit with real usage data.

## Pricing Tiers

| Tier | Monthly | Yearly | Includes |
|---|---|---|---|
| **Seeker** (free) | $0 | — | All deterministic pages (charts, transits, solar returns, ZR, Firdaria, progressions, Vedic, map, timeline…), 10 oracle messages/mo, 5 Akashic articles |
| **Cosmic** | $11.99 | $79 | Fair-use oracle (400 msgs/mo on Sonnet, then graceful downgrade to Haiku — "the oracle grows tired"), full Akashic library, Chronicle AI extraction, reports |
| **Celestial** | $29.99 | $199 | Unlimited oracle (Sonnet), Opus for deep readings/reports, priority access to new rooms (Observatory, Cinema) |
| **Connect your AI** | $0 | — | BYOK (Anthropic/OpenAI/Google/Groq key stored client-side only) or Sign-in-with-Claude OAuth (usage bills to user's extra-usage credits). Uncapped AI features at zero COGS. |

**Unit economics (pre-optimization):** oracle message on Sonnet ≈ $0.03–0.05 (4–6k ctx in, ~600 out). Casual user ≈ $1–1.50/mo, regular ≈ $5–8, power ≈ $15–25. With guardrails: regular drops to $2–3/mo → 70%+ gross margin at $11.99.

**Store cut:** Apple/Google IAP takes 15% (small business) to 30%. $11.99 nets ~$10.20 via IAP, ~$11.40 via Stripe web.

**TOS requirement:** "unlimited" tiers exclude automated/scripted access — protects against bot abuse without affecting human use.

## Cost Guardrails (ship BEFORE public beta)

1. **Prompt caching** (biggest lever, ship first): chart/persona/skills context repeats every message — Anthropic prompt caching cuts cached input ~90%, roughly halving oracle COGS.
2. **Fair-use metering:** per-profile monthly message counter; Cosmic cap 400/mo then Haiku fallback; free tier 10/mo hard cap on server side.
3. **Model routing:** short factual queries → Haiku; readings/interpretations → Sonnet; Celestial deep reports → Opus.
4. **History trimming:** cap conversation history per request (summary + last N turns).

## Slice Roadmap

| Slice | Status |
|---|---|
| A. Chronicle (life event graph + sky-state encoder) | Built 2026-07 — final review pending |
| **Pre-flight / deploy** — secrets audit, SQLite check, serverless compat, server-side rate limits, PWA manifest + service worker, BYOK settings field, Vercel deploy | Next |
| **Guardrails** — prompt caching, fair-use metering, model routing, history trimming | Before public beta |
| Public beta — share URL, collect feedback | After guardrails |
| Billing — Stripe tiers on web (IAP later with Capacitor) | With/after beta |
| B. Pattern + Prediction Engine (signature correlations, forecast windows, confirmation loop) | After beta feedback |
| C. Observatory (R3F 3D/4D sky, time scrub; visual ref: knowledge-graph lattice video in uploads 2026-07-11) | After B |
| D. Cinema Room (life scripts, trailers, narration) | After C |
| E. Council Chamber (multi-agent debate + synthesis) | After D |
| Sign-in-with-Claude OAuth | Own small project (needs Anthropic app registration) |
| MCP server (Cosmora engines as tools for users' own AI) | Distribution experiment, post-Observatory |
| Capacitor wrap + push notifications (transit alerts) → App Store / Play Store | After web validates |

**Store path:** PWA during beta → Capacitor + push notifications (clears Apple 4.2 minimum-functionality) → Google Play ($25 once) + App Store ($99/yr).
