import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Redis } from "@upstash/redis";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const redis = new Redis({
 url: process.env.UPSTASH_REDIS_REST_URL!,
 token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
 const signature = req.headers.get("stripe-signature");

 if (!signature) {
 return NextResponse.json(
 { error: "Missing Stripe signature." },
 { status: 400 }
 );
 }

 const body = await req.text();

 let event: Stripe.Event;

 try {
 event = stripe.webhooks.constructEvent(
 body,
 signature,
 process.env.STRIPE_WEBHOOK_SECRET as string
 );
 } catch (error) {
 console.error("Webhook signature verification failed:", error);
 return NextResponse.json(
 { error: "Invalid webhook signature." },
 { status: 400 }
 );
 }

 try {
 if (event.type === "checkout.session.completed") {
 const session = event.data.object as Stripe.Checkout.Session;

 const email =
 session.customer_details?.email?.trim().toLowerCase() ||
 session.customer_email?.trim().toLowerCase();

 if (email) {
 await redis.sadd("playwrightgen:pro-users", email);
 }
 }

 return NextResponse.json({ received: true });
 } catch (error) {
 console.error("Stripe webhook handling error:", error);
 return NextResponse.json(
 { error: "Webhook handling failed." },
 { status: 500 }
 );
 }
}