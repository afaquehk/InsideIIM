import { StateGraph } from "@langchain/langgraph";
import planner from "./planner";
import dataCollector from "./dataCollector";
import analyst from "./analyst";
import critic from "./critic";
import decisionMaker from "./decisionMaker";
import { ResearchStateAnnotation } from "./types";

export const researchGraph = new StateGraph(ResearchStateAnnotation)
  .addNode("planner", planner)
  .addNode("dataCollector", dataCollector)
  .addNode("analyst", analyst)
  .addNode("critic", critic)
  .addNode("decisionMaker", decisionMaker)
  .addEdge("__start__", "planner")
  .addEdge("planner", "dataCollector")
  .addEdge("dataCollector", "analyst")
  .addEdge("analyst", "critic")
  .addEdge("critic", "decisionMaker")
  .addEdge("decisionMaker", "__end__")
  .compile();
