import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
    EnvironmentValidationError,
    validateStripeClientEnvironment,
} from "@/lib/env";

export async function GET(req: Request) {
    try {
        const { STRIPE_SECRET_KEY } = validateStripeClientEnvironment();
        const stripe = new Stripe(STRIPE_SECRET_KEY);
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get("session_id");

        if (!sessionId) {
            return NextResponse.json(
                { error: "Missing session_id." },
                { status: 400 }
            );
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        const email =
            session.customer_details?.email?.trim().toLowerCase() ||
            session.customer_email?.trim().toLowerCase() ||
            "";

        return NextResponse.json({ email });
    } catch (error) {
        if (error instanceof EnvironmentValidationError) {
            return NextResponse.json(
                { error: "Billing is not configured in this environment." },
                { status: 503 }
            );
        }

        console.error("Checkout session lookup error:", error);
        return NextResponse.json(
            { error: "Failed to retrieve checkout session." },
            { status: 500 }
        );
    }
}
