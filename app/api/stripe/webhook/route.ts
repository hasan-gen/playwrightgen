import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Redis } from "@upstash/redis";

import {
 EnvironmentValidationError,
 validateStripeWebhookEnvironment,
} from "@/lib/env";

export async function POST(req: Request) {
 let config;

 try {
 config = validateStripeWebhookEnvironment();
 } catch (error) {
 if (error instanceof EnvironmentValidationError) {
 return NextResponse.json(
 { error: "Billing webhooks are not configured in this environment." },
 { status: 503 }
 );
 }

 throw error;
 }

 const stripe = new Stripe(config.STRIPE_SECRET_KEY);
 const redis = new Redis({
 url: config.UPSTASH_REDIS_REST_URL,
 token: config.UPSTASH_REDIS_REST_TOKEN,
 });
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
 config.STRIPE_WEBHOOK_SECRET
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
