import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ResearchState } from "./types";

const DecisionOutputSchema = z.object({
  verdict: z.enum(["Strong Invest", "Invest", "Watch", "Pass", "Strong Pass"]),
  confidence: z.number().min(0).max(100),
  summary: z.string().describe("A concise synthesis of why the verdict was chosen."),
  whatWouldChangeThisVerdict: z.array(z.string()).describe("A list of factors that would move the verdict higher or lower."),
});

function getGeminiApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }
  return key;
}

export default async function decisionMaker(state: ResearchState) {
  console.log("decisionMaker node ran", state.companyName);

  const gemini = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: getGeminiApiKey(),
    temperature: 0.1,
    maxOutputTokens: 3072,
  });

  const analystOutput = state.analystOutput as { scores?: Record<string, number>; thesis?: string } | null;
  const criticOutput = state.criticOutput as { counterarguments?: Array<{ point: string; evidence: string }> } | null;

  const analystSummary = analystOutput
    ? `Analyst scores: ${Object.entries(analystOutput.scores ?? {})
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")} ; thesis: ${analystOutput.thesis ?? "N/A"}`
    : "No analyst output available.";
  const criticSummary = criticOutput
    ? `Bear points: ${criticOutput.counterarguments?.map((item) => item.point).join(" | ") ?? "N/A"}`
    : "No critic output available.";

  const prompt = `You are the investment decision maker for ${state.companyName}. Synthesize the analyst and critic outputs to choose a verdict.

Analyst output: ${analystSummary}
Critic output: ${criticSummary}
Financial data: ${state.financialData ? JSON.stringify(state.financialData) : "No public financials available."}
News data:
${state.newsData ?? "No news data available."}

Choose one verdict from: Strong Invest, Invest, Watch, Pass, Strong Pass

Provide valid JSON only. No markdown, no code blocks.

Required format:
{
  "verdict": "Watch",
  "confidence": 65,
  "summary": "Synthesis explanation here.",
  "whatWouldChangeThisVerdict": ["Factor 1", "Factor 2", "Factor 3"]
}

Output valid JSON only:`;

  let result;
  try {
    const response = await gemini.invoke(prompt);
    let content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    
    // Handle structured response format from Gemini
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type === 'text' && parsed[0].text) {
        content = parsed[0].text;
      }
    } catch {
      // Content is already a string, continue
    }
    
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    
    const finalParsed = JSON.parse(cleanedContent);
    result = DecisionOutputSchema.parse(finalParsed);
  } catch (error) {
    console.error("DecisionMaker parsing failed:", error);
    
    result = {
      verdict: "Watch" as const,
      confidence: 50,
      summary: `Unable to generate detailed decision for ${state.companyName} due to parsing error. Please review data quality.`,
      whatWouldChangeThisVerdict: ["Better data availability", "More complete financial metrics", "Additional news sources"],
    };
  }

  return {
    finalDecision: result,
    currentStep: "decisionMaker",
  };
}
