import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
 try {
 const { code } = await req.json();

 if (!code) {
 return NextResponse.json(
 { error: "Code is required." },
 { status: 400 }
 );
 }

 const client = new OpenAI({
 apiKey: process.env.OPENAI_API_KEY,
 });

 const completion = await client.chat.completions.create({
 model: "gpt-4.1-mini",
 messages: [
 {
 role: "system",
 content: `You are a senior QA architect.

Explain the purpose of the Playwright test in clear language.

Rules:
- Explain what the test validates
- Mention the main user flow
- Mention the main assertions when relevant
- Keep the explanation concise and practical
- Return plain text only
- Do not use markdown fences`,
 },
 {
 role: "user",
 content: `Explain this Playwright test:\n\n${code}`,
 },
 ],
 });

 const explanation = completion.choices[0]?.message?.content || "";

 return NextResponse.json({ explanation });
 } catch (error) {
 console.error("Explain API error:", error);

 return NextResponse.json(
 { error: "Failed to explain test." },
 { status: 500 }
 );
 }
}