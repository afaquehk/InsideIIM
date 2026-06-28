import { NextResponse } from "next/server";
import { searchCompanyNews } from "@/lib/tools/search";
import { getCompanyFinancials } from "@/lib/tools/financials";

export async function GET() {
  const companyName = "Tesla";

  try {
    const [newsResults, financials] = await Promise.all([
      searchCompanyNews(companyName),
      getCompanyFinancials(companyName),
    ]);

    return NextResponse.json({
      companyName,
      newsResults,
      financials,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error during tool test.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
