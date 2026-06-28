import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ResearchState } from "./types";
import type { CompanyFinancials } from "@/lib/tools/financials";

const AnalystOutputSchema = z.object({
  scores: z.object({
    financialHealth: z.number().describe("Score 0-100 reflecting financial strength and balance sheet quality."),
    marketPosition: z.number().describe("Score 0-100 reflecting competitive strength and moat."),
    growth: z.number().describe("Score 0-100 reflecting growth trajectory and runway."),
    leadership: z.number().describe("Score 0-100 reflecting management quality and execution ability."),
    risk: z.number().describe("Score 0-100 reflecting downside risk and business durability."),
  }),
  weightedScore: z.number().describe("Weighted composite score using the specified category weights."),
  thesis: z.string().describe("A concise investment thesis paragraph grounded in the available company data."),
  categoryInsights: z.object({
    financialHealth: z.string().describe("Analyst reasoning for the financial health score."),
    marketPosition: z.string().describe("Analyst reasoning for the market position score."),
    growth: z.string().describe("Analyst reasoning for the growth score."),
    leadership: z.string().describe("Analyst reasoning for the leadership score."),
    risk: z.string().describe("Analyst reasoning for the risk score."),
  }).describe("Short reasoning for each category score."),
});

function getGeminiApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }
  return key;
}

function summarizeFinancialData(financialData: CompanyFinancials | null) {
  if (!financialData) {
    return "No public financials are available for this company.";
  }

  return `Revenue TTM ${financialData.revenue ?? "unknown"}, profit margin ${financialData.profitMargin ?? "unknown"}, market cap ${financialData.marketCap ?? "unknown"}, P/E ${financialData.peRatio ?? "unknown"}, dividend yield ${financialData.dividendYield ?? "unknown"}, sector ${financialData.sector ?? "unknown"}, industry ${financialData.industry ?? "unknown"}.`;
}

export default async function analyst(state: ResearchState) {
  console.log("analyst node ran", state.companyName);

  const gemini = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: getGeminiApiKey(),
    temperature: 0.1,
    maxOutputTokens: 4096,
  });

  const financialData = state.financialData as CompanyFinancials | null;
  const newsData = state.newsData ?? "No news data available.";
  const researchPlan = state.researchPlan ?? "";

  const prompt = `You are a senior equity research analyst. Use the data available for ${state.companyName} to score the business on five dimensions with the following weights: Financial Health 30%, Market Position 25%, Growth 20%, Leadership 15%, Risk 10%.

Company: ${state.companyName}
Research plan: ${researchPlan}
Financial summary: ${summarizeFinancialData(financialData)}
News data:
${newsData}

Provide a complete analysis as valid JSON only. No markdown, no code blocks, just pure JSON.

Required format:
{
  "scores": {
    "financialHealth": 50,
    "marketPosition": 60,
    "growth": 70,
    "leadership": 55,
    "risk": 45
  },
  "weightedScore": 55.5,
  "thesis": "Brief investment thesis paragraph here.",
  "categoryInsights": {
    "financialHealth": "Reasoning for financial health score.",
    "marketPosition": "Reasoning for market position score.",
    "growth": "Reasoning for growth score.",
    "leadership": "Reasoning for leadership score.",
    "risk": "Reasoning for risk score."
  }
}

Output valid JSON only:`;

  let result;
  try {
    const response = await gemini.invoke(prompt);
    let content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    
    // Handle structured response format from Gemini
    // Response might be an array of parts: [{"type":"text","text":"..."}]
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type === 'text' && parsed[0].text) {
        console.log("Extracting text from structured response");
        content = parsed[0].text;
      }
    } catch {
      // Content is already a string, continue
    }
    
    // Clean up the response - remove markdown code blocks if present
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    
    // Parse the actual JSON
    const finalParsed = JSON.parse(cleanedContent);
    
    console.log("Final parsed keys:", Object.keys(finalParsed));
    
    // Validate with Zod schema
    result = AnalystOutputSchema.parse(finalParsed);
  } catch (error) {
    console.error("Analyst parsing failed:", error);
    
    // Provide a fallback result
    result = {
      scores: {
        financialHealth: 50,
        marketPosition: 50,
        growth: 50,
        leadership: 50,
        risk: 50,
      },
      weightedScore: 50,
      thesis: `Unable to generate detailed analysis for ${state.companyName} due to parsing error. Please check data quality.`,
      categoryInsights: {
        financialHealth: "Analysis unavailable.",
        marketPosition: "Analysis unavailable.",
        growth: "Analysis unavailable.",
        leadership: "Analysis unavailable.",
        risk: "Analysis unavailable.",
      },
    };
  }

  const computedWeightedScore = Math.round(
    (result.scores.financialHealth * 0.3 +
      result.scores.marketPosition * 0.25 +
      result.scores.growth * 0.2 +
      result.scores.leadership * 0.15 +
      result.scores.risk * 0.1) * 10
  ) / 10;

  return {
    analystOutput: {
      ...result,
      weightedScore: computedWeightedScore,
    },
    currentStep: "analyst",
  };
}
