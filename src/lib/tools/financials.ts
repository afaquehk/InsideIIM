const BASE_URL = "https://www.alphavantage.co/query";

function getAlphaVantageApiKey() {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) {
    throw new Error("Missing ALPHA_VANTAGE_API_KEY environment variable.");
  }
  return key;
}

const ALPHA_VANTAGE_API_KEY_STRING = getAlphaVantageApiKey();

export interface CompanyFinancials {
  symbol: string;
  name: string;
  description: string;
  revenue: string | null;
  profitMargin: string | null;
  marketCap: string | null;
  peRatio: string | null;
  dividendYield: string | null;
  sector: string | null;
  industry: string | null;
}

interface SymbolSearchResult {
  "1. symbol": string;
  "2. name": string;
  "3. type": string;
  "4. region": string;
  "5. marketOpen": string;
  "6. marketClose": string;
  "7. timezone": string;
  "8. currency": string;
  "9. matchScore": string;
}

interface OverviewResult {
  Symbol: string;
  AssetType: string;
  Name: string;
  Description: string;
  Sector: string;
  Industry: string;
  MarketCapitalization: string;
  PERatio: string;
  DividendYield: string;
  ProfitMargin: string;
  RevenueTTM: string;
}

function parseNumberField(value?: string | null): string | null {
  if (!value || value === "None") return null;
  return value;
}

async function fetchAlphaVantage(query: URLSearchParams) {
  const url = `${BASE_URL}?${query.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Alpha Vantage request failed with status ${response.status}`);
  }

  const data = await response.json();
  if (data.Note) {
    throw new Error(`Alpha Vantage rate limit or notice: ${data.Note}`);
  }
  if (data["Error Message"]) {
    throw new Error(`Alpha Vantage error: ${data["Error Message"]}`);
  }
  return data;
}

export async function getCompanyFinancials(companyName: string): Promise<CompanyFinancials | null> {
  try {
    const symbolSearchParams = new URLSearchParams({
      function: "SYMBOL_SEARCH",
      keywords: companyName,
      apikey: ALPHA_VANTAGE_API_KEY_STRING,
    } as Record<string, string>);

    const symbolData = await fetchAlphaVantage(symbolSearchParams);
    const bestMatches: SymbolSearchResult[] = symbolData.bestMatches ?? [];
    if (!bestMatches.length) {
      return null;
    }

    const bestMatch = bestMatches[0];
    if (!bestMatch["1. symbol"]) {
      return null;
    }

    const symbol = bestMatch["1. symbol"];
    const overviewParams = new URLSearchParams({
      function: "OVERVIEW",
      symbol,
      apikey: ALPHA_VANTAGE_API_KEY_STRING,
    } as Record<string, string>);

    const overviewData = await fetchAlphaVantage(overviewParams);
    if (!overviewData.Symbol) {
      return null;
    }

    const overview: OverviewResult = overviewData as OverviewResult;
    return {
      symbol: overview.Symbol,
      name: overview.Name,
      description: overview.Description ?? "",
      revenue: parseNumberField(overview.RevenueTTM),
      profitMargin: parseNumberField(overview.ProfitMargin),
      marketCap: parseNumberField(overview.MarketCapitalization),
      peRatio: parseNumberField(overview.PERatio),
      dividendYield: parseNumberField(overview.DividendYield),
      sector: overview.Sector ?? null,
      industry: overview.Industry ?? null,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error fetching financials.";
    throw new Error(`Unable to fetch financials for ${companyName}: ${message}`);
  }
}
