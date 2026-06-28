# AI Investment Research Agent — Build Phases

**Stack:** Next.js (App Router) + TypeScript + Tailwind · LangGraph.js + LangChain.js · Gemini (LLM) · Tavily (search) · Alpha Vantage (financials) · Vercel (deploy)

Paste each phase to the agent only after the previous one is verified working. Don't skip checkpoints.

---

## Phase 0 — Setup & Scaffolding
- Scaffold Next.js app (App Router, TS, Tailwind, src dir)
- Install: `@langchain/langgraph`, `@langchain/google-genai`, `@langchain/core`, `@langchain/tavily`, `recharts`, `zod`
- Create `.env.local` + `.env.example` with: `GEMINI_API_KEY`, `TAVILY_API_KEY`, `ALPHA_VANTAGE_API_KEY`
- Folder structure: `/src/lib/agent/`, `/src/lib/tools/`, `/src/app/api/research/`
- README with setup instructions

✅ **Checkpoint:** `npm run dev` runs with no errors, default Next.js page loads.

---

## Phase 1 — Tool Wrappers (search + financial data)
- `src/lib/tools/search.ts` → `searchCompanyNews(companyName)` via Tavily
- `src/lib/tools/financials.ts` → `getCompanyFinancials(companyName)` via Alpha Vantage (ticker resolve → OVERVIEW)
- Temp route `/api/test-tools` returning raw JSON from both, hardcoded to "Tesla"
- Graceful error handling (missing key, no ticker found → return null, not crash)

✅ **Checkpoint:** hit `localhost:3000/api/test-tools`, confirm real news + financial JSON. **Most important checkpoint — fix all errors here before moving on.**

---

## Phase 2 — LangGraph Skeleton (stub nodes)
- Shared state schema (Zod/Annotation): companyName, researchPlan, newsData, financialData, analystOutput, criticOutput, finalDecision, errors, currentStep
- Stub node files: `planner.ts`, `dataCollector.ts`, `analyst.ts`, `critic.ts`, `decisionMaker.ts` — each just logs + passes through state
- Wire into `graph.ts`: planner → dataCollector → analyst → critic → decisionMaker → END
- Conditional edge after dataCollector (private company / no financials → qualitative-only flag)
- Temp route `/api/test-graph` invoking the full graph, returns final state JSON

✅ **Checkpoint:** `/api/test-graph` runs start to finish, all state fields populated with placeholders.

---

## Phase 3 — Real Logic: planner + dataCollector
- `planner.ts`: real Gemini call, structured (Zod) research plan output
- `dataCollector.ts`: real calls to Phase 1 tools in parallel (`Promise.all`), sets private-company flag properly
- Conditional edge now branches on real `financialData === null`
- Test with one public company + one private company

✅ **Checkpoint:** both paths (public/private) return real data through `/api/test-graph`.

---

## Phase 4 — Real Logic: analyst + critic + decisionMaker
- `analyst.ts`: Gemini call, senior-analyst persona, structured Zod output — 5 scored categories (Financial Health 30%, Market Position 25%, Growth 20%, Leadership 15%, Risk 10%) + weighted score + thesis paragraph
- `critic.ts`: devil's-advocate persona, ≥3 structured counterarguments/bear-case points
- `decisionMaker.ts`: synthesizes both → verdict (Strong Invest/Invest/Watch/Pass/Strong Pass), confidence %, summary reasoning, "what would change this verdict" list
- Test with 2–3 different companies, confirm reasoning is specific, not generic filler

✅ **Checkpoint:** reasoning genuinely differs per company and is grounded in actual data.

---

## Phase 5 — Streaming API Route
- `/api/research` POST endpoint, accepts `{ companyName }`
- Stream node completions as SSE (`graph.stream()` / `streamEvents()`) for live progress
- Graceful mid-stream error handling (partial results still usable)

✅ **Checkpoint:** stream events arrive in order, ending in complete final result.

---

## Phase 6 — Frontend UI
- Home page: company name input + Research button, dark-mode friendly, editorial design
- Live progress view consuming the SSE stream (step-by-step checkmarks)
- Results view: verdict badge + confidence %, Recharts radar/bar chart of 5 scores, expandable reasoning per category, distinct "Bear Case" panel, "what would change verdict" bullets, sources list
- Fully responsive

✅ **Checkpoint:** full flow works end-to-end through the actual browser UI.

---

## Phase 7 — Polish, Error States, Deploy
- Loading/error states (not found, API failure, partial data), input validation
- Visual polish (typography, spacing, subtle animations)
- README: architecture, LangGraph flow diagram (ASCII ok), APIs used, setup, limitations
- Deploy to Vercel: push to GitHub, connect repo, add env vars in Vercel dashboard

✅ **Checkpoint:** live Vercel link works with real env vars.

---

### Notes
- If a phase errors, fix it in that same chat before moving forward — don't stack phases on broken code.
- Phase 1 is the highest-risk checkpoint: if APIs aren't returning real data, everything downstream will *look* done but produce garbage output.
