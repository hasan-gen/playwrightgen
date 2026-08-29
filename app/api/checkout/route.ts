import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
    EnvironmentValidationError,
    validateStripeCheckoutEnvironment,
} from "@/lib/env";

export async function POST() {
    try {
        const {
            STRIPE_SECRET_KEY,
            STRIPE_PRO_PRICE_ID,
            NEXT_PUBLIC_APP_URL,
        } = validateStripeCheckoutEnvironment();
        const stripe = new Stripe(STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [
                {
                    price: STRIPE_PRO_PRICE_ID,
                    quantity: 1,
                },
            ],
            success_url: `${NEXT_PUBLIC_APP_URL}/generator?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        if (error instanceof EnvironmentValidationError) {
            return NextResponse.json(
                { error: "Billing is not configured in this environment." },
                { status: 503 }
            );
        }

        console.error("Stripe error:", error);
        return NextResponse.json({ error: "Stripe checkout failed" }, { status: 500 });
    }
}
