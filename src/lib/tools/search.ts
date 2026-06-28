import { TavilySearch, type TavilySearchResponse } from "@langchain/tavily";

function getTavilyApiKey() {
  const key = process.env.TAVILY_API_KEY;
  if (!key) {
    throw new Error("Missing TAVILY_API_KEY environment variable.");
  }
  return key;
}

const tavily = new TavilySearch({
  tavilyApiKey: getTavilyApiKey(),
  maxResults: 10,
  topic: "news",
});

export interface NewsArticle {
  title: string;
  url: string;
  snippet: string;
  publishedDate: string | null;
}

export async function searchCompanyNews(companyName: string): Promise<NewsArticle[]> {
  const query = `${companyName} news`;

  try {
    const response = await tavily.invoke({ query });

    if (!response || typeof response !== "object") {
      throw new Error("Tavily returned an unexpected response.");
    }

    if ("error" in response) {
      throw new Error(response.error ?? "Tavily returned an error.");
    }

    const results = (response as TavilySearchResponse).results ?? [];

    return Array.isArray(results)
      ? results.map((item: any) => ({
          title: item.title ?? item.headline ?? "",
          url: item.url ?? item.link ?? "",
          snippet: item.description ?? item.snippet ?? "",
          publishedDate: item.published_at ?? item.publishedAt ?? item.date ?? null,
        }))
      : [];
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error while searching company news.";
    throw new Error(`Tavily search failed: ${message}`);
  }
}
