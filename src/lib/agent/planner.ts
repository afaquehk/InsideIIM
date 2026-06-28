import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ResearchState } from "./types";

const ResearchPlanSchema = z.object({
  researchPlan: z.string().describe("A concise investment research plan for the requested company."),
});

export default async function planner(state: ResearchState) {
  console.log("planner node ran", state.companyName);

  function getGeminiApiKey() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY environment variable.");
    return key;
  }

  const gemini = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: getGeminiApiKey(),
    temperature: 0.2,
    maxOutputTokens: 1024,
  });

  const structured = gemini.withStructuredOutput(ResearchPlanSchema, {
    method: "jsonSchema",
  });

  const prompt = `You are an investment research planner. Create a concise research plan for ${state.companyName}. ` +
    "Describe the research focus, what matters most to validate, and the next key questions an analyst should answer. " +
    'Return only valid JSON matching this schema: {"researchPlan": "<your plan here>"}. No markdown formatting.';

  const result = await structured.invoke(prompt);

  return {
    researchPlan: result.researchPlan.trim(),
    currentStep: "planner",
  };
}
