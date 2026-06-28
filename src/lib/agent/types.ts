import type { NewsArticle } from "@/lib/tools/search";
import { Annotation } from "@langchain/langgraph";

const lastValue = <ValueType, UpdateType = ValueType>(defaultValue: ValueType) => ({
  reducer: (_left: ValueType, right: UpdateType) => right as unknown as ValueType,
  default: () => defaultValue,
});

export const ResearchStateAnnotation = Annotation.Root({
  companyName: Annotation<string>(),
  researchPlan: Annotation<string>(lastValue("")),
  newsData: Annotation<string | null>(lastValue<string | null>(null)),
  newsArticles: Annotation<NewsArticle[] | null>(lastValue<NewsArticle[] | null>(null)),
  financialData: Annotation<Record<string, unknown> | null>(lastValue<Record<string, unknown> | null>(null)),
  analystOutput: Annotation<string | null>(lastValue<string | null>(null)),
  criticOutput: Annotation<string | null>(lastValue<string | null>(null)),
  finalDecision: Annotation<string | null>(lastValue<string | null>(null)),
  errors: Annotation<string[]>(lastValue<string[]>([])),
  currentStep: Annotation<string>(lastValue("initialized")),
  routingNote: Annotation<string | null>(lastValue<string | null>(null)),
});

export type ResearchState = typeof ResearchStateAnnotation.State;
