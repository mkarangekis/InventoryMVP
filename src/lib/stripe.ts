import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  stripe ??= new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20",
  });

  return stripe;
}
