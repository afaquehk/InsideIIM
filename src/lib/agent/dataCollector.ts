import { ResearchState } from "./types";
import { searchCompanyNews, type NewsArticle } from "@/lib/tools/search";
import { getCompanyFinancials } from "@/lib/tools/financials";

export default async function dataCollector(state: ResearchState) {
  console.log("dataCollector node ran", state.companyName);

  const errors: string[] = [];

  const [newsResult, financialResult] = await Promise.allSettled([
    searchCompanyNews(state.companyName),
    getCompanyFinancials(state.companyName),
  ]);

  const newsArticles =
    newsResult.status === "fulfilled" ? newsResult.value : [];
  if (newsResult.status === "rejected") {
    const errorMessage = newsResult.reason instanceof Error
      ? newsResult.reason.message
      : String(newsResult.reason);
    errors.push(`News search failed: ${errorMessage}`);
  }

  const financialData =
    financialResult.status === "fulfilled" ? financialResult.value : null;
  if (financialResult.status === "rejected") {
    const errorMessage = financialResult.reason instanceof Error
      ? financialResult.reason.message
      : String(financialResult.reason);
    errors.push(`Financial lookup failed: ${errorMessage}`);
  }

  const newsData = newsArticles.length
    ? newsArticles
        .slice(0, 5)
        .map((article) =>
          `- ${article.title} (${article.publishedDate ?? "unknown"})\n  ${article.snippet}`
        )
        .join("\n")
    : `No recent news articles found for ${state.companyName}.`;

  const routingNote = financialData === null
    ? "qualitative-only path"
    : state.routingNote;

  return {
    newsData,
    newsArticles: newsArticles.length ? newsArticles.slice(0, 5) : null,
    financialData,
    routingNote,
    currentStep: "dataCollector",
    ...(errors.length > 0 ? { errors: [...state.errors, ...errors] } : {}),
  };
}
