import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { upsertSubscription } from "@/lib/subscription";

// Lazy init — module-level instantiation crashes the build when the key is absent
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return _stripe;
}

// Stripe SDK v17+ moved period_end into items; this helper handles both shapes
function getPeriodEnd(sub: Stripe.Subscription): number | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = sub as any;
  return s.current_period_end ?? s.items?.data?.[0]?.current_period_end ?? null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const cosmoraId = session.metadata?.cosmora_id;
      if (!cosmoraId || session.mode !== "subscription") break;

      const sub = await getStripe().subscriptions.retrieve(session.subscription as string);
      upsertSubscription(cosmoraId, "pro", sub.id, getPeriodEnd(sub));
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const cosmoraId = sub.metadata?.cosmora_id;
      if (!cosmoraId) break;

      const active = sub.status === "active" || sub.status === "trialing";
      upsertSubscription(
        cosmoraId,
        active ? "pro" : "free",
        sub.id,
        active ? getPeriodEnd(sub) : null
      );
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const cosmoraId = sub.metadata?.cosmora_id;
      if (!cosmoraId) break;
      upsertSubscription(cosmoraId, "free", null, null);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

