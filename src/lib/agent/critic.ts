import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ResearchState } from "./types";

const CriticOutputSchema = z.object({
  counterarguments: z.array(
    z.object({
      point: z.string().describe("A specific bearish counterargument."),
      evidence: z.string().describe("The data point or news item that supports this bear case."),
    })
  ).min(3),
  summary: z.string().describe("A concise devil's advocate summary of the main downside risks."),
});

function getGeminiApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }
  return key;
}

export default async function critic(state: ResearchState) {
  console.log("critic node ran", state.companyName);

  const gemini = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: getGeminiApiKey(),
    temperature: 0.1,
    maxOutputTokens: 3072,
  });

  const newsData = state.newsData ?? "No news data available.";
  const financialData = state.financialData ? JSON.stringify(state.financialData) : "No public financial data available.";

  const prompt = `You are a devil's advocate investment critic for ${state.companyName}. Generate at least three specific bearish counterarguments based on the available data.

Financial data: ${financialData}
News data:
${newsData}
Data notes: ${state.errors?.join("; ") ?? "No tool errors."}

Provide valid JSON only. No markdown, no code blocks.

Required format:
{
  "counterarguments": [
    {"point": "First bearish point", "evidence": "Supporting evidence"},
    {"point": "Second bearish point", "evidence": "Supporting evidence"},
    {"point": "Third bearish point", "evidence": "Supporting evidence"}
  ],
  "summary": "Devil's advocate summary of main downside risks."
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
    result = CriticOutputSchema.parse(finalParsed);
  } catch (error) {
    console.error("Critic parsing failed:", error);
    
    result = {
      counterarguments: [
        { point: "Data analysis unavailable", evidence: "Parsing error occurred" },
        { point: "Risk assessment incomplete", evidence: "Unable to generate detailed critique" },
        { point: "Insufficient information", evidence: "Check data quality" },
      ],
      summary: `Unable to generate detailed critique for ${state.companyName} due to parsing error.`,
    };
  }

  return {
    criticOutput: result,
    currentStep: "critic",
  };
}
