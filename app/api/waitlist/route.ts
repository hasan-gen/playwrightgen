import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";

const redis = new Redis({
 url: process.env.UPSTASH_REDIS_REST_URL!,
 token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
 try {
 const { email } = await req.json();

 if (!email || typeof email !== "string") {
 return NextResponse.json(
 { error: "A valid email is required." },
 { status: 400 }
 );
 }

 const normalizedEmail = email.trim().toLowerCase();

 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

 if (!emailRegex.test(normalizedEmail)) {
 return NextResponse.json(
 { error: "Please enter a valid email address." },
 { status: 400 }
 );
 }

 await redis.sadd("playwrightgen:waitlist", normalizedEmail);

 if (process.env.WAITLIST_NOTIFY_EMAIL) {
 await resend.emails.send({
 from: "PlaywrightGen <onboarding@resend.dev>",
 to: process.env.WAITLIST_NOTIFY_EMAIL,
 subject: "New PlaywrightGen waitlist signup",
 html: `
 <div style="font-family: Arial, sans-serif; line-height: 1.6;">
 <h2>New waitlist signup</h2>
 <p>A new user joined the PlaywrightGen Pro waitlist.</p>
 <p><strong>Email:</strong> ${normalizedEmail}</p>
 </div>
 `,
 });
 }

 return NextResponse.json({
 success: true,
 message: "You have been added to the waitlist.",
 });
 } catch (error) {
 console.error("Waitlist error:", error);

 return NextResponse.json(
 { error: "Failed to join waitlist." },
 { status: 500 }
 );
 }
}