import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Lazy init — module-level instantiation crashes the build when the key is absent
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return _stripe;
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const { customerId, returnUrl } = await req.json();

  if (!customerId) {
    return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
  }

  const existing = await stripe.customers.search({
    query: `metadata["cosmora_id"]:"${customerId}"`,
    limit: 1,
  });

  if (!existing.data.length) {
    return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: existing.data[0].id,
    return_url: returnUrl ?? `${req.nextUrl.origin}/dashboard/settings`,
  });

  return NextResponse.json({ url: session.url });
}
