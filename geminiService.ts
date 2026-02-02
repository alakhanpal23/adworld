
import { GoogleGenAI, Type } from "@google/genai";
import { 
  NormalizerResponse, 
  MarketGeneratorResponse, 
  PriorsGeneratorResponse, 
  Scenario, 
  Priors, 
  SimulationResult, 
  ExperimentPlanResponse,
  DecisionBriefResponse
} from "./types";

const INTEGRITY_CORE_INSTRUCTIONS = `
You are AdWorld: Decision Integrity Engine.
Your responsibility is to simulate outcomes and communicate uncertainty.
- Every metric MUST have intervals (P10/P50/P90).
- Every conclusion MUST declare its confidence level.
`;

const SCENARIO_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    scenario: {
      type: Type.OBJECT,
      properties: {
        product: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            one_liner: { type: Type.STRING },
            differentiator: { type: Type.STRING },
            landing_page_quality: { type: Type.STRING, enum: ["low", "medium", "high"] }
          }
        },
        pricing: {
          type: Type.OBJECT,
          properties: {
            price_usd: { type: Type.NUMBER },
            billing: { type: Type.STRING, enum: ["one_time", "monthly", "annual"] }
          }
        },
        audience: {
          type: Type.OBJECT,
          properties: {
            geo: { type: Type.ARRAY, items: { type: Type.STRING } },
            age_range: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            income_band: { type: Type.STRING, enum: ["low", "mid", "high"] },
            intent_level: { type: Type.STRING, enum: ["discovery", "consideration", "high_intent"] },
            persona_notes: { type: Type.STRING }
          }
        },
        channel: {
          type: Type.OBJECT,
          properties: {
            primary: { type: Type.STRING, enum: ["tiktok", "instagram", "youtube", "search"] },
            objective: { type: Type.STRING, enum: ["purchases", "leads", "signups"] },
            budget_usd: { type: Type.NUMBER },
            duration_days: { type: Type.NUMBER }
          }
        },
        creative: {
          type: Type.OBJECT,
          properties: {
            format: { type: Type.STRING, enum: ["video", "image", "text"] },
            hook: { type: Type.STRING },
            value_prop: { type: Type.STRING },
            cta: { type: Type.STRING },
            visual_description: { type: Type.STRING },
            trust_signals: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        },
        constraints: {
          type: Type.OBJECT,
          properties: {
            target_cac_usd: { type: Type.NUMBER },
            notes: { type: Type.STRING }
          }
        },
        assumptions: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    }
  }
};

const MARKET_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    market: {
      type: Type.OBJECT,
      properties: {
        segments: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              share: { type: Type.NUMBER },
              description: { type: Type.STRING }
            }
          }
        },
        consumers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              segment: { type: Type.STRING },
              representativeness_bucket: { type: Type.STRING, enum: ["core", "edge", "exploratory"] },
              agent_confidence_score: { type: Type.NUMBER },
              demographics: {
                type: Type.OBJECT,
                properties: {
                  age: { type: Type.NUMBER },
                  income_band: { type: Type.STRING, enum: ["low", "mid", "high"] },
                  geo: { type: Type.STRING }
                }
              },
              traits: {
                type: Type.OBJECT,
                properties: {
                  price_sensitivity: { type: Type.OBJECT, properties: { mean: { type: Type.NUMBER }, variance: { type: Type.NUMBER } } },
                  trust_baseline: { type: Type.OBJECT, properties: { mean: { type: Type.NUMBER }, variance: { type: Type.NUMBER } } },
                  attention: { type: Type.OBJECT, properties: { mean: { type: Type.NUMBER }, variance: { type: Type.NUMBER } } },
                  novelty_seeking: { type: Type.OBJECT, properties: { mean: { type: Type.NUMBER }, variance: { type: Type.NUMBER } } },
                  needs_match: { type: Type.OBJECT, properties: { mean: { type: Type.NUMBER }, variance: { type: Type.NUMBER } } },
                  fatigue_rate: { type: Type.OBJECT, properties: { mean: { type: Type.NUMBER }, variance: { type: Type.NUMBER } } }
                }
              },
              channel_affinity: {
                type: Type.OBJECT,
                properties: {
                  tiktok: { type: Type.NUMBER },
                  instagram: { type: Type.NUMBER },
                  youtube: { type: Type.NUMBER },
                  search: { type: Type.NUMBER }
                }
              },
              thresholds: {
                type: Type.OBJECT,
                properties: {
                  max_price_usd: { type: Type.NUMBER },
                  min_trust: { type: Type.NUMBER }
                }
              },
              decision_model: {
                type: Type.OBJECT,
                properties: {
                  click_propensity: {
                    type: Type.OBJECT,
                    properties: { w_attention: { type: Type.NUMBER }, w_channel_affinity: { type: Type.NUMBER }, w_hook_match: { type: Type.NUMBER }, w_novelty: { type: Type.NUMBER } }
                  },
                  convert_propensity: {
                    type: Type.OBJECT,
                    properties: { w_needs_match: { type: Type.NUMBER }, w_trust: { type: Type.NUMBER }, w_price_fit: { type: Type.NUMBER }, w_value_prop: { type: Type.NUMBER } }
                  }
                }
              },
              narrative: {
                type: Type.OBJECT,
                properties: {
                  buy_reason: { type: Type.STRING },
                  no_buy_reason: { type: Type.STRING }
                }
              }
            }
          }
        },
        market_confidence_score: { type: Type.NUMBER },
        assumptions: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    }
  }
};

const PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    plan: {
      type: Type.OBJECT,
      properties: {
        n_runs: { type: Type.NUMBER },
        experiments: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              hypothesis: { type: Type.STRING },
              expected_direction: { type: Type.STRING, enum: ["better", "worse", "uncertain"] },
              overrides: {
                type: Type.OBJECT,
                properties: {
                  price_multiplier: { type: Type.NUMBER },
                  trust_multiplier: { type: Type.NUMBER },
                  hook_strength_multiplier: { type: Type.NUMBER },
                  value_prop_clarity_multiplier: { type: Type.NUMBER },
                  fatigue_lambda_multiplier: { type: Type.NUMBER },
                  audience_intent_shift: { type: Type.NUMBER }
                }
              }
            }
          }
        },
        metrics: { type: Type.ARRAY, items: { type: Type.STRING } },
        allocation: { 
          type: Type.OBJECT, 
          properties: { 
            strategy: { type: Type.STRING }, 
            test_fraction: { type: Type.NUMBER } 
          } 
        },
        stopping_rules: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { rule: { type: Type.STRING } } } },
        assumptions: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    }
  }
};

const PRIORS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    priors: {
      type: Type.OBJECT,
      properties: {
        channel: { type: Type.STRING },
        prior_strength: { type: Type.STRING },
        distributions: {
          type: Type.OBJECT,
          properties: {
            ctr: { type: Type.OBJECT, properties: { parameters: { type: Type.OBJECT, properties: { alpha: { type: Type.NUMBER }, beta: { type: Type.NUMBER } } }, p10: { type: Type.NUMBER }, p50: { type: Type.NUMBER }, p90: { type: Type.NUMBER } } },
            cvr: { type: Type.OBJECT, properties: { parameters: { type: Type.OBJECT, properties: { alpha: { type: Type.NUMBER }, beta: { type: Type.NUMBER } } }, p10: { type: Type.NUMBER }, p50: { type: Type.NUMBER }, p90: { type: Type.NUMBER } } },
            cpc: { type: Type.OBJECT, properties: { parameters: { type: Type.OBJECT, properties: { mu: { type: Type.NUMBER }, sigma: { type: Type.NUMBER } } }, p10: { type: Type.NUMBER }, p50: { type: Type.NUMBER }, p90: { type: Type.NUMBER } } }
          }
        },
        modifiers: { 
          type: Type.OBJECT,
          properties: {
            hook_match: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, slope: { type: Type.NUMBER }, clamp: { type: Type.ARRAY, items: { type: Type.NUMBER } } } },
            value_prop_match: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, slope: { type: Type.NUMBER }, clamp: { type: Type.ARRAY, items: { type: Type.NUMBER } } } },
            trust_multiplier: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, slope: { type: Type.NUMBER }, clamp: { type: Type.ARRAY, items: { type: Type.NUMBER } } } },
            price_fit: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, k: { type: Type.NUMBER }, midpoint_usd: { type: Type.NUMBER }, clamp: { type: Type.ARRAY, items: { type: Type.NUMBER } } } },
            fatigue: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, lambda: { type: Type.NUMBER }, per: { type: Type.STRING }, floor: { type: Type.NUMBER } } }
          }
        },
        sanity_ranges: { 
          type: Type.OBJECT,
          properties: {
            ctr_typical: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            cvr_typical: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            cpc_typical_usd: { type: Type.ARRAY, items: { type: Type.NUMBER } }
          }
        },
        explainers: { type: Type.OBJECT, properties: { ctr: { type: Type.STRING }, cvr: { type: Type.STRING }, cpc: { type: Type.STRING }, fatigue: { type: Type.STRING } } },
        assumptions: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    }
  }
};

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
          }
        },
        verdict: { type: Type.OBJECT, properties: { go_no_go: { type: Type.STRING, enum: ["go", "no_go", "test_more"] }, reason: { type: Type.STRING } } },
        confidence_level: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW", "EXPLORATORY"] },
        ssi: { type: Type.NUMBER },
        stability: { type: Type.STRING, enum: ["STABLE", "VOLATILE", "FRAGILE"] },
        primary_failure_mode: { type: Type.STRING },
        fragility_disclosure: { type: Type.STRING },
        sentiment_analysis: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { sentiment: { type: Type.STRING }, percentage: { type: Type.NUMBER }, common_feedback: { type: Type.STRING }, persona: { type: Type.STRING } }
          }
        },
        segment_breakdown: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { name: { type: Type.STRING }, cvr_relative: { type: Type.STRING }, potential: { type: Type.STRING } }
          }
        },
        one_slide_summary: { type: Type.ARRAY, items: { type: Type.STRING } },
        next_experiments_ranked: {
          type: Type.ARRAY,
          items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, why: { type: Type.STRING }, expected_uplift: { type: Type.STRING }, confidence: { type: Type.STRING } } }
        }
      }
    }
  }
};

export async function normalizeCampaign(input: string): Promise<NormalizerResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Normalize this campaign input:\n${input}`,
    config: {
      systemInstruction: `${INTEGRITY_CORE_INSTRUCTIONS}\nYou are AdWorld Scenario Normalizer. Convert user campaign info into a strict Scenario JSON.`,
      responseMimeType: "application/json",
      responseSchema: SCENARIO_SCHEMA as any
    },
  });
  return JSON.parse(response.text.trim()) as NormalizerResponse;
}

export async function generateMarket(scenario: Scenario): Promise<MarketGeneratorResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Scenario:\n${JSON.stringify(scenario)}`,
    config: {
      systemInstruction: `${INTEGRITY_CORE_INSTRUCTIONS}\nYou are AdWorld Market Generator. Generate EXACTLY 8 highly-distinct and detailed consumer archetypes (segments) that represent the audience.`,
      responseMimeType: "application/json",
      responseSchema: MARKET_SCHEMA as any
    },
  });
  return JSON.parse(response.text.trim()) as MarketGeneratorResponse;
}

export async function generatePriors(scenario: Scenario): Promise<PriorsGeneratorResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Scenario:\n${JSON.stringify(scenario)}`,
    config: {
      systemInstruction: `${INTEGRITY_CORE_INSTRUCTIONS}\nYou are AdWorld Priors Generator. Ground CTR, CVR, and CPC distributions.`,
      responseMimeType: "application/json",
      responseSchema: PRIORS_SCHEMA as any
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
      systemInstruction: `${INTEGRITY_CORE_INSTRUCTIONS}\nYou are AdWorld Experiment Planner. Design isolated variable tests for the simulation engine.`,
      responseMimeType: "application/json",
      responseSchema: PLAN_SCHEMA as any
    },
  });
  return JSON.parse(response.text.trim()) as ExperimentPlanResponse;
}

export async function generateBrief(scenario: Scenario, priors: Priors, results: Record<string, SimulationResult>): Promise<DecisionBriefResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Scenario: ${JSON.stringify(scenario)}\nPriors: ${JSON.stringify(priors)}\nResults: ${JSON.stringify(results)}`,
    config: {
      systemInstruction: `${INTEGRITY_CORE_INSTRUCTIONS}\nYou are AdWorld Results Narrator. Perform strategic synthesis of simulation outcomes.`,
      responseMimeType: "application/json",
      responseSchema: BRIEF_SCHEMA as any
    },
  });
  return JSON.parse(response.text.trim()) as DecisionBriefResponse;
}
