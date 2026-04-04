import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const input = (formData.get("input") as string) || "";
    const issueType = (formData.get("issueType") as string) || "Auto Detect";
    const styleMode = (formData.get("styleMode") as string) || "clean";

    // 处理所有上传的文件
    const files = formData.getAll("files") as File[];
    let fileDescriptions = "";

    for (const file of files) {
      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString("base64");

        if (file.type.startsWith("image/")) {
          fileDescriptions += `[Uploaded Image: ${file.name}]\n`;
        } else {
          const text = buffer.toString("utf-8");
          fileDescriptions += `[Uploaded File: ${file.name}]\n${text}\n\n`;
        }
      }
    }

    const userMessage = `${input}\n\n${fileDescriptions || "No files uploaded."}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a senior frontend engineer and SDET with 10+ years experience.

Your job is to debug real-world issues in Playwright tests, React components, HTML/CSS, or layout problems.

Rules:
- Always identify the most likely root cause first
- Prefer minimal, safe fixes (change as few lines as possible)
- Never rewrite large parts of code unless absolutely necessary
- Always consider side effects and regression risks
- Be practical and production-minded
- Use stable selectors
- Output only in the exact JSON schema provided`,
        },
        { role: "user", content: userMessage },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "debug_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              rootCause: { type: "string" },
              confidence: { type: "string", enum: ["High", "Medium", "Low"] },
              issueType: { type: "string" },
              minimalFix: { type: "string" },
              updatedCode: { type: "string" },
              why: { type: "string" },
              whatToTestNext: { type: "string" },
              risks: { type: "string" },
            },
            required: ["rootCause", "confidence", "issueType", "minimalFix", "updatedCode", "why", "whatToTestNext", "risks"],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.3,
    });

    const result = completion.choices[0]?.message?.content || "{}";

    return NextResponse.json({ result });

  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json({ error: "Failed to analyze the issue. Please try again." }, { status: 500 });
  }
}