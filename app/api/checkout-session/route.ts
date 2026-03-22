import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function GET(req: Request) {
    try {
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
        console.error("Checkout session lookup error:", error);
        return NextResponse.json(
            { error: "Failed to retrieve checkout session." },
            { status: 500 }
        );
    }
}