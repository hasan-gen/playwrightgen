import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
 url: process.env.UPSTASH_REDIS_REST_URL!,
 token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

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

 const isPro = await redis.sismember("playwrightgen:pro-users", normalizedEmail);

 return NextResponse.json({ isPro });
 } catch (error) {
 console.error("Check Pro error:", error);

 return NextResponse.json(
 { error: "Failed to check Pro status." },
 { status: 500 }
 );
 }
}