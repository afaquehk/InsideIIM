import { NextResponse } from "next/server";
import { researchGraph } from "@/lib/agent/graph";

export async function GET(request: Request) {
  const companyName = new URL(request.url).searchParams.get("company") ?? "Tesla";
  const result = await researchGraph.invoke({
    companyName,
  });

  return NextResponse.json(result);
}
