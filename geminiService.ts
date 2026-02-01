
import { GoogleGenAI, Type } from "@google/genai";
import { 
  NormalizerResponse, 
  MarketGeneratorResponse, 
  PriorsGeneratorResponse, 
  Scenario, 
  Priors, 
  SimulationResult, 
  PostMortem,
  ExperimentPlanResponse,
  DecisionBriefResponse,
  SystemAuditResponse,
  SelfTestReport
} from "./types";

export async function normalizeCampaign(input: string): Promise<NormalizerResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Normalize this campaign input:\n${input}`,
    config: {
      systemInstruction: "You are AdWorld Scenario Normalizer. Convert user campaign info into a strict Scenario JSON. Output valid JSON only.",
      responseMimeType: "application/json",
    },
  });
  return JSON.parse(response.text.trim()) as NormalizerResponse;
}

export async function generateMarket(scenario: Scenario): Promise<MarketGeneratorResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Scenario:\n${JSON.stringify(scenario)}`,
    config: {
      systemInstruction: "You are AdWorld Market Generator. Generate EXACTLY 400 consumers. All trait values [0,1]. Decision models must be non-zero.",
      responseMimeType: "application/json",
    },
  });
  return JSON.parse(response.text.trim()) as MarketGeneratorResponse;
}

export async function generatePriors(scenario: Scenario): Promise<PriorsGeneratorResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Scenario:\n${JSON.stringify(scenario)}`,
    config: {
      systemInstruction: "You are AdWorld Priors Generator. Use Beta and LogNormal distributions. Parameters > 0.",
      responseMimeType: "application/json",
    },
  });
  return JSON.parse(response.text.trim()) as PriorsGeneratorResponse;
}

export async function generateExperimentPlan(scenario: Scenario): Promise<ExperimentPlanResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Scenario:\n${JSON.stringify(scenario)}`,
    config: {
      systemInstruction: "You are AdWorld Experiment Planner. 4-8 experiments. Must include 'base'. Each non-base experiment changes exactly one override lever.",
      responseMimeType: "application/json",
    },
  });
  return JSON.parse(response.text.trim()) as ExperimentPlanResponse;
}

export async function generatePostMortem(scenario: Scenario, result: SimulationResult): Promise<PostMortem> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Scenario:\n${JSON.stringify(scenario)}\n\nResult:\n${JSON.stringify(result.summary)}`,
    config: {
      systemInstruction: "You are AdWorld Strategist. Analyze simulation results and provide strategic post-mortem.",
      responseMimeType: "application/json",
    },
  });
  return JSON.parse(response.text.trim()) as PostMortem;
}

const BRIEF_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    brief: {
      type: Type.OBJECT,
      properties: {
        headline: { type: Type.STRING },
        key_metrics: {
          type: Type.OBJECT,
          properties: {
            cac: { type: Type.OBJECT, properties: { p10: { type: Type.NUMBER }, p50: { type: Type.NUMBER }, p90: { type: Type.NUMBER } } },
            conversions: { type: Type.OBJECT, properties: { p10: { type: Type.NUMBER }, p50: { type: Type.NUMBER }, p90: { type: Type.NUMBER } } },
            ctr: { type: Type.OBJECT, properties: { p10: { type: Type.NUMBER }, p50: { type: Type.NUMBER }, p90: { type: Type.NUMBER } } },
            cvr: { type: Type.OBJECT, properties: { p10: { type: Type.NUMBER }, p50: { type: Type.NUMBER }, p90: { type: Type.NUMBER } } },
          },
          required: ["cac", "conversions", "ctr", "cvr"]
        },
        verdict: {
          type: Type.OBJECT,
          properties: {
            go_no_go: { type: Type.STRING, enum: ["go", "no_go", "test_more"] },
            reason: { type: Type.STRING }
          },
          required: ["go_no_go", "reason"]
        },
        primary_failure_mode: { type: Type.STRING, enum: ["price", "creative", "channel", "trust", "targeting"] },
        drivers: {
          type: Type.ARRAY,
          items: {
             type: Type.OBJECT,
             properties: { name: { type: Type.STRING }, impact: { type: Type.STRING, enum: ["high", "med", "low"] }, evidence: { type: Type.STRING } },
             required: ["name", "impact", "evidence"]
          }
        },
        next_experiments_ranked: {
          type: Type.ARRAY,
          items: {
             type: Type.OBJECT,
             properties: { name: { type: Type.STRING }, why: { type: Type.STRING }, expected_uplift: { type: Type.STRING, enum: ["high", "med", "low"] }, confidence: { type: Type.STRING, enum: ["high", "med", "low"] } },
             required: ["name", "why", "expected_uplift", "confidence"]
          }
        },
        one_slide_summary: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 6, maxItems: 6 }
      },
      required: ["headline", "key_metrics", "verdict", "primary_failure_mode", "drivers", "next_experiments_ranked", "one_slide_summary"]
    }
  },
  required: ["brief"]
};

export async function generateBrief(scenario: Scenario, priors: Priors, results: Record<string, SimulationResult>): Promise<DecisionBriefResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Scenario: ${JSON.stringify(scenario)}\nPriors: ${JSON.stringify(priors)}\nResults: ${JSON.stringify(results)}`,
    config: {
      systemInstruction: "You are AdWorld Results Narrator. Be technical and decisive. No marketing fluff. Strict P10/P50/P90 logic.",
      responseMimeType: "application/json",
      responseSchema: BRIEF_SCHEMA
    },
  });
  return JSON.parse(response.text.trim()) as DecisionBriefResponse;
}

export async function runSelfTest(data: any): Promise<SelfTestReport> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Run a full self-test on this AdWorld system state: ${JSON.stringify(data)}`,
    config: {
      systemInstruction: `You are AdWorld Self-Test Runner. Validate the integrity of Scenario, Market, Priors, Plan, and Results. 
      Check for exactly 400 consumers, P10<=P50<=P90, and budget/duration sanity. 
      Return a JSON report with status (pass/fail), integrity_score (0-100), summary (short string), phase (status per phase), critical_risks (array), and recommended_fixes (array of objects).`,
      responseMimeType: "application/json",
    },
  });
  return JSON.parse(response.text.trim()) as SelfTestReport;
}

export async function performSystemAudit(data: any): Promise<SystemAuditResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Perform a technical audit on these simulation artifacts: ${JSON.stringify(data)}`,
    config: {
      systemInstruction: `You are AdWorld QA Agent. Validate structural correctness and logical consistency. 
      Hard rules: Exactly 400 consumers, Market segments sum to 1.0, Traits [0,1], P10 <= P50 <= P90. 
      Output valid JSON matching the audit schema.`,
      responseMimeType: "application/json",
    },
  });
  return JSON.parse(response.text.trim()) as SystemAuditResponse;
}
