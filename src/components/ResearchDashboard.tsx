"use client";

import { useCallback, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type StepKey = "planner" | "dataCollector" | "analyst" | "critic" | "decisionMaker";

type Verdict = "Strong Invest" | "Invest" | "Watch" | "Pass" | "Strong Pass";

interface NewsSource {
  title: string;
  url: string;
  snippet: string;
  publishedDate: string | null;
}

interface AnalystOutput {
  scores: {
    financialHealth: number;
    marketPosition: number;
    growth: number;
    leadership: number;
    risk: number;
  };
  weightedScore: number;
  thesis: string;
  categoryInsights?: {
    financialHealth: string;
    marketPosition: string;
    growth: string;
    leadership: string;
    risk: string;
  };
}

interface CriticOutput {
  counterarguments: Array<{ point: string; evidence: string }>;
  summary: string;
}

interface FinalDecision {
  verdict: Verdict;
  confidence: number;
  summary: string;
  whatWouldChangeThisVerdict: string[];
}

interface ResearchState {
  currentStep?: StepKey;
  analystOutput?: AnalystOutput;
  criticOutput?: CriticOutput;
  finalDecision?: FinalDecision;
  newsArticles?: NewsSource[];
  newsData?: string;
  companyName?: string;
  errors?: string[];
  routingNote?: string | null;
}

const stepOrder: StepKey[] = ["planner", "dataCollector", "analyst", "critic", "decisionMaker"];

const stepLabels: Record<StepKey, string> = {
  planner: "Plan research",
  dataCollector: "Gather data",
  analyst: "Analyst assessment",
  critic: "Bear-case review",
  decisionMaker: "Final verdict",
};

const verdictStyles: Record<"green" | "yellow" | "red", { label: string; bg: string; text: string }> = {
  green: { label: "Invest", bg: "bg-emerald-100 dark:bg-emerald-950/40", text: "text-emerald-900 dark:text-emerald-100" },
  yellow: { label: "Watch", bg: "bg-amber-100 dark:bg-amber-950/40", text: "text-amber-900 dark:text-amber-100" },
  red: { label: "Pass", bg: "bg-rose-100 dark:bg-rose-950/40", text: "text-rose-900 dark:text-rose-100" },
};

function getVerdictStyle(verdict: Verdict) {
  if (verdict === "Strong Invest" || verdict === "Invest") {
    return verdictStyles.green;
  }
  if (verdict === "Watch") {
    return verdictStyles.yellow;
  }
  return verdictStyles.red;
}

function parseSSEEvent(chunk: string) {
  const lines = chunk.split(/\r?\n/);
  let event = "message";
  let data = "";

  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      data += line.slice(5).trimEnd() + "\n";
    }
  }

  return {
    event,
    data: data.trimEnd(),
  };
}

function parseStreamEvents(text: string, onEvent: (event: { event: string; data: string }) => void) {
  const chunks = text.split(/\n\n/);
  for (let chunk of chunks) {
    if (!chunk.trim()) continue;
    onEvent(parseSSEEvent(chunk));
  }
}

export default function ResearchDashboard() {
  const [companyName, setCompanyName] = useState("");
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<StepKey | null>(null);
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [researchState, setResearchState] = useState<ResearchState>({});
  const [resultComplete, setResultComplete] = useState(false);

  const trimmedCompanyName = companyName.trim();
  const chartData = useMemo(() => {
    const scores = researchState.analystOutput?.scores;

    if (!scores) {
      return [];
    }

    return [
      { name: "Financial", value: scores.financialHealth },
      { name: "Market", value: scores.marketPosition },
      { name: "Growth", value: scores.growth },
      { name: "Leadership", value: scores.leadership },
      { name: "Risk", value: scores.risk },
    ];
  }, [researchState.analystOutput]);

  const partialWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (researchState.errors?.length) {
      warnings.push(...researchState.errors);
    }
    if (researchState.finalDecision && !researchState.newsArticles?.length) {
      warnings.push("News source collection was incomplete.");
    }
    if (researchState.finalDecision && !researchState.analystOutput?.categoryInsights) {
      warnings.push("Analyst category insights are not fully available.");
    }
    return warnings;
  }, [researchState.errors, researchState.newsArticles, researchState.analystOutput, researchState.finalDecision]);

  const handleEvent = useCallback((event: { event: string; data: string }) => {
    if (event.event === "error") {
      try {
        const payload = JSON.parse(event.data);
        setErrorMessage(payload?.error ?? payload?.message ?? event.data);
      } catch {
        setErrorMessage(event.data || "An unknown error occurred.");
      }
      return;
    }

    if (!event.data) {
      return;
    }

    try {
      const parsed = JSON.parse(event.data);
      setResearchState((prev) => ({ ...prev, ...parsed }));
      if (parsed.currentStep && stepOrder.includes(parsed.currentStep)) {
        setCurrentStep(parsed.currentStep);
        setStatusLog((log) => {
          const next = Array.from(new Set([...log, stepLabels[parsed.currentStep as StepKey]]));
          return next;
        });
      }
      if (parsed.finalDecision) {
        setResultComplete(true);
      }
    } catch {
      if (event.data) {
        setStatusLog((log) => [...log, event.data]);
      }
    }
  }, []);

  const startResearch = useCallback(async () => {
    if (!trimmedCompanyName) {
      setErrorMessage("Enter a company name to start research.");
      return;
    }

    setErrorMessage(null);
    setResultComplete(false);
    setRunning(true);
    setCurrentStep("planner");
    setStatusLog([stepLabels.planner]);
    setResearchState({ companyName: trimmedCompanyName });

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyName: companyName.trim() }),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(bodyText || `Research API returned ${response.status}.`);
      }

      if (!response.body) {
        const bodyText = await response.text();
        throw new Error(bodyText || "No response body from research API.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const boundary = buffer.lastIndexOf("\n\n");

        if (boundary !== -1) {
          const chunk = buffer.slice(0, boundary + 2);
          buffer = buffer.slice(boundary + 2);
          parseStreamEvents(chunk, handleEvent);
        }
      }

      if (buffer.trim()) {
        parseStreamEvents(buffer, handleEvent);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(message);
    } finally {
      setRunning(false);
    }
  }, [companyName, handleEvent]);

  const currentStepIndex = currentStep ? stepOrder.indexOf(currentStep) : -1;
  const hasResult = !!researchState.finalDecision && resultComplete;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/50 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-slate-950/40">
          <header className="space-y-5 pb-8 text-center">
            <p className="font-mono text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
              Investment Research
            </p>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
                Research a company in minutes.
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                Enter a company name to start a live investment research run. You’ll see progress as each analysis step completes, then a verdict, score breakdown, analyst insights, and bear-case sources.
              </p>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Company name
                </label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    disabled={running}
                    aria-invalid={!trimmedCompanyName && !running}
                    className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base text-slate-900 outline-none transition duration-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-100 dark:focus:ring-slate-700"
                    placeholder="e.g. Tesla"
                  />
                  <button
                    type="button"
                    onClick={startResearch}
                    disabled={running || !trimmedCompanyName}
                    aria-busy={running}
                    className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-slate-950 px-6 py-4 text-base font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                  >
                    {running ? "Running research…" : "Research"}
                  </button>
                </div>
                {errorMessage ? (
                  <p className="mt-4 rounded-2xl bg-rose-100 px-4 py-3 text-sm text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                    {errorMessage}
                  </p>
                ) : null}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/85">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                      Progress
                    </p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      Current step updates appear as the graph executes.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {running ? "Live" : hasResult ? "Completed" : "Idle"}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {stepOrder.map((step) => {
                    const index = stepOrder.indexOf(step);
                    const isComplete = currentStepIndex > index || (!running && hasResult && currentStepIndex >= index);
                    const isActive = currentStep === step && running;
                    return (
                      <div key={step} className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 transition duration-200 ease-out hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/80 dark:hover:shadow-slate-800/60">
                        <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-950">
                          {isComplete ? "✓" : isActive ? "…" : index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{stepLabels[step]}</p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {isComplete ? "Completed" : isActive ? "In progress" : "Waiting"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/85">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Live notes</p>
                <div className="mt-4 min-h-[10rem] rounded-3xl bg-white p-4 text-sm leading-6 text-slate-700 shadow-inner dark:bg-slate-900 dark:text-slate-200">
                  {statusLog.length > 0 ? (
                    <ul className="space-y-3">
                      {statusLog.map((note, index) => (
                        <li key={`${note}-${index}`} className="flex items-start gap-3">
                          <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-950">
                            {index + 1}
                          </span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400">Submit a company to begin live research.</p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/85">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Source preview</p>
                <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                  {researchState.newsArticles?.length ? (
                    researchState.newsArticles.map((article, index) => (
                      <a
                        key={`${article.url}-${index}`}
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-3xl border border-slate-200 bg-slate-50 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-950"
                      >
                        <p className="font-semibold text-slate-950 dark:text-slate-50">{article.title}</p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{article.publishedDate ?? "Date unknown"}</p>
                      </a>
                    ))
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400">News sources will appear here after data collection.</p>
                  )}
                </div>
              </div>
            </aside>
          </div>

          {hasResult ? (
            <section className="mt-10 space-y-6">
              {partialWarnings.length > 0 ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/50 dark:bg-amber-950/30">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white">
                      <span className="text-sm font-bold">!</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-amber-900 dark:text-amber-100">Partial Data Warning</p>
                      <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                        The research completed with some limitations:
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200">
                        {partialWarnings.map((warning, index) => (
                          <li key={`warning-${index}`} className="flex gap-2">
                            <span>•</span>
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/85">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                        Verdict
                      </p>
                      <h2 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
                        {researchState.finalDecision?.verdict}
                      </h2>
                    </div>
                    <div className={`rounded-3xl px-4 py-3 text-sm font-semibold ${getVerdictStyle(researchState.finalDecision!.verdict).bg} ${getVerdictStyle(researchState.finalDecision!.verdict).text}`}>
                      Confidence {researchState.finalDecision?.confidence?.toFixed(0)}%
                    </div>
                  </div>
                  <p className="mt-5 text-slate-700 dark:text-slate-300">{researchState.finalDecision?.summary}</p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/85">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                    Score breakdown
                  </p>
                  <div className="mt-6 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.35)" />
                        <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(value) => (typeof value === "number" ? `${value.toFixed(0)}` : String(value))} />
                        <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#0f766e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/85">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Analyst reasoning</p>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {researchState.analystOutput?.weightedScore?.toFixed(1)} / 100
                      </span>
                    </div>
                    <p className="mt-4 text-slate-700 dark:text-slate-300">{researchState.analystOutput?.thesis}</p>
                    <div className="mt-6 space-y-4">
                      {researchState.analystOutput?.categoryInsights ? (
                        (Object.entries(researchState.analystOutput.categoryInsights) as Array<[keyof typeof researchState.analystOutput.categoryInsights, string]>).map(([category, insight]) => (
                          <details key={category} className="group rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/80">
                            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 dark:text-slate-50">
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </summary>
                            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{insight}</p>
                          </details>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Category insights will appear here after the analyst completes.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/85">
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Bear case</p>
                    <p className="mt-3 text-slate-700 dark:text-slate-300">{researchState.criticOutput?.summary}</p>
                    <div className="mt-4 space-y-4">
                      {researchState.criticOutput?.counterarguments?.map((item, index) => (
                        <div key={`${item.point}-${index}`} className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/85">
                          <p className="font-semibold text-slate-950 dark:text-slate-50">{item.point}</p>
                          <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.evidence}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/85">
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">What would change this verdict</p>
                    <ul className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                      {researchState.finalDecision?.whatWouldChangeThisVerdict?.map((item, index) => (
                        <li key={`${item}-${index}`} className="flex gap-3">
                          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-900 dark:bg-slate-100" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/85">
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Sources</p>
                    {researchState.newsArticles?.length ? (
                      <ul className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                        {researchState.newsArticles.map((source, index) => (
                          <li key={`${source.url}-${index}`}>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-slate-950 transition hover:text-slate-600 dark:text-slate-100 dark:hover:text-slate-300"
                            >
                              {source.title}
                            </a>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{source.publishedDate ?? "Unknown date"}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-4 text-slate-500 dark:text-slate-400">No source links were captured from news search.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
