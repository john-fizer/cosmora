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
  const { customerId, priceId, returnUrl } = await req.json();

  if (!customerId || !priceId) {
    return NextResponse.json({ error: "Missing customerId or priceId" }, { status: 400 });
  }

  // Ensure the Stripe customer exists
  let stripeCustomerId: string;
  try {
    const existing = await stripe.customers.search({
      query: `metadata["cosmora_id"]:"${customerId}"`,
      limit: 1,
    });
    if (existing.data.length > 0) {
      stripeCustomerId = existing.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        metadata: { cosmora_id: customerId },
      });
      stripeCustomerId = customer.id;
    }
  } catch {
    return NextResponse.json({ error: "Failed to find/create customer" }, { status: 500 });
  }

  const base = returnUrl ?? `${req.nextUrl.origin}/dashboard`;

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}?upgraded=1`,
    cancel_url: `${base}/upgrade`,
    metadata: { cosmora_id: customerId },
    subscription_data: { metadata: { cosmora_id: customerId } },
  });

  return NextResponse.json({ url: session.url });
}
