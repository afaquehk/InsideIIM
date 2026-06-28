# InsideIIM AI Investment Research

A live investment research app built with Next.js App Router, TypeScript, Tailwind CSS, and LangChain/LangGraph. The app uses Google Gemini for the LLM, Tavily for news search, and Alpha Vantage for financial data.

## Architecture

- `src/app/page.tsx` renders the research launcher UI and stream consumer.
- `src/components/ResearchDashboard.tsx` handles user input, SSE connection, progress state, and result rendering.
- `src/app/api/research/route.ts` runs the LangGraph research flow server-side and exposes a streaming SSE endpoint.
- `src/lib/agent/` contains LangGraph nodes and shared state definitions.
- `src/lib/tools/` contains wrappers for Tavily news search and Alpha Vantage financial lookup.

## LangGraph flow

The research graph executes the following sequence:

```
__start__
   |
 planner
   |
 dataCollector
   |
 analyst
   |
 critic
   |
 decisionMaker
   |
__end__
```

After `dataCollector`, the graph continues to analyst, then critic, then decisionMaker. The nodes update shared state and emit progress via SSE.

## APIs used

- Google Gemini via `@langchain/google-genai`
- Tavily news search via `@langchain/tavily`
- Alpha Vantage financial lookup via `@langchain/core` wrapper and direct API call

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and add your API keys:

```bash
copy .env.example .env.local
```

3. Add the environment variables in `.env.local`:

```env
GEMINI_API_KEY=your_gemini_api_key
TAVILY_API_KEY=your_tavily_api_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key
```

4. Start the development server:

```bash
npm run dev
```

5. Open the app at `http://localhost:3000`.

## Deployment to Vercel

### Recommended steps

1. Commit and push this repository to GitHub.

```bash
git add .
git commit -m "Prepare InsideIIM for Vercel deployment"
git push origin main
```

2. In Vercel, click **New Project** and import the GitHub repository.
3. During setup, Vercel will detect Next.js automatically.
4. In the Vercel project dashboard, go to **Settings > Environment Variables** and add:
   - `GEMINI_API_KEY`
   - `TAVILY_API_KEY`
   - `ALPHA_VANTAGE_API_KEY`
5. Set each variable for `Production` and `Preview`.
6. Deploy the project from Vercel. The build command is `npm run build` and the output directory is handled automatically.

### Vercel-specific config

This project includes `vercel.json` for Vercel platform compatibility.

## Known limitations

- The app relies on external API keys and paid quota for Gemini, Tavily, and Alpha Vantage.
- Streaming research depends on SSE support in the browser.
- The LangGraph node outputs are structured, but output quality depends on LLM responses.
- Partial data is possible when a tool call fails; the app surfaces warnings instead of blocking the flow.
- There is no authentication or rate limiting built into this prototype.

## Notes

- The app is intentionally minimal and editorial in design, focusing on clean reporting and live progress.
- The frontend uses Recharts for score visualization and dynamic state rendering from the SSE stream.
