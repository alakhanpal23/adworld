
import { Scenario, Market, Priors, DecisionBrief, ExperimentPlan } from './types';

const defaultTrait = (val: number) => ({
  mean: val,
  variance: 0.05,
  confidence: "MEDIUM" as const,
  source: "synthetic_inference"
});

export const GOLDEN_SCENARIOS: Record<string, Scenario> = {
  cyberpet: {
    product: {
      name: "CyberPet Pro",
      category: "Consumer Tech",
      one_liner: "AI-powered automated enrichment for urban pets.",
      differentiator: "Stress-sensing computer vision.",
      landing_page_quality: "high"
    },
    pricing: { price_usd: 149.00, billing: "one_time" },
    audience: {
      geo: ["USA"],
      age_range: [25, 45],
      income_band: "high",
      intent_level: "consideration",
      persona_notes: "Busy urban professionals."
    },
    channel: { primary: "instagram", objective: "purchases", budget_usd: 15000, duration_days: 30 },
    creative: {
      format: "video",
      hook: "Fix your pet's loneliness.",
      value_prop: "24/7 automated companionship.",
      cta: "Shop Now",
      visual_description: "Happy dog playing with device.",
      trust_signals: ["Vet Recommended"]
    },
    constraints: { target_cac_usd: 45.00, notes: "3x ROAS target" },
    assumptions: ["Standard social CTR"]
  }
};

export const GOLDEN_MARKET: Market = {
  segments: [
    { name: "Urban Techies", share: 0.4, description: "Early adopters in major cities." },
    { name: "Guilty Parents", share: 0.35, description: "Feel bad about long work hours." }
  ],
  consumers: Array.from({ length: 400 }).map((_, i) => ({
    id: `agent-${i}`,
    segment: i < 160 ? "Urban Techies" : "Guilty Parents",
    representativeness_bucket: "core",
    agent_confidence_score: 0.85,
    demographics: { age: 30, income_band: "high", geo: "USA" },
    traits: {
      price_sensitivity: defaultTrait(0.3),
      trust_baseline: defaultTrait(0.5),
      attention: defaultTrait(0.8),
      novelty_seeking: defaultTrait(0.7),
      needs_match: defaultTrait(0.6),
      fatigue_rate: defaultTrait(0.1)
    },
    channel_affinity: { tiktok: 0.4, instagram: 0.9, youtube: 0.3, search: 0.2 },
    thresholds: { max_price_usd: 200, min_trust: 0.4 },
    decision_model: {
      click_propensity: { w_attention: 0.4, w_channel_affinity: 0.4, w_hook_match: 0.1, w_novelty: 0.1 },
      convert_propensity: { w_needs_match: 0.3, w_trust: 0.3, w_price_fit: 0.2, w_value_prop: 0.2 }
    },
    narrative: { buy_reason: "Automation helps guilt.", no_buy_reason: "Too expensive." }
  })),
  market_confidence_score: 0.78,
  assumptions: ["Market behaves according to CyberPet baseline."]
};

export const GOLDEN_PRIORS: Priors = {
  channel: "instagram",
  prior_strength: "medium",
  distributions: {
    ctr: { dist: "beta", parameters: { alpha: 2, beta: 80 }, p10: 0.012, p50: 0.024, p90: 0.041 },
    cvr: { dist: "beta", parameters: { alpha: 5, beta: 95 }, p10: 0.025, p50: 0.049, p90: 0.078 },
    cpc: { dist: "lognormal", parameters: { mu: 0.1, sigma: 0.2 }, p10: 0.85, p50: 1.12, p90: 1.45, currency: "USD" },
    impression_to_view: { dist: "beta", parameters: { alpha: 50, beta: 50 }, p10: 0.4, p50: 0.5, p90: 0.6 }
  },
  modifiers: {
    hook_match: { type: "linear", slope: 0.1, clamp: [0.8, 1.2] },
    value_prop_match: { type: "linear", slope: 0.1, clamp: [0.8, 1.2] },
    trust_multiplier: { type: "linear", slope: 0.1, clamp: [0.8, 1.5] },
    price_fit: { type: "logistic", k: 0.05, midpoint_usd: 150, clamp: [0.1, 1.0] },
    fatigue: { type: "exp_decay", lambda: 0.05, per: "impression", floor: 0.2 }
  },
  sanity_ranges: { ctr_typical: [0.01, 0.04], cvr_typical: [0.02, 0.06], cpc_typical_usd: [0.8, 1.5] },
  explainers: { ctr: "Stable social CTR", cvr: "High intent conversion", cpc: "Premium tech bid costs", impression_to_view: "Standard video view rates", fatigue: "Standard ad decay" },
  assumptions: ["Priors based on historical CyberPet performance."]
};

export const GOLDEN_PLAN: ExperimentPlan = {
  n_runs: 5,
  experiments: [
    { name: "base", hypothesis: "Baseline performance.", overrides: {}, expected_direction: "better" },
    { name: "high_trust", hypothesis: "Boosting trust signals increases CVR.", overrides: { trust_multiplier: 1.2 }, expected_direction: "better" }
  ],
  metrics: ["cac", "roas", "conversions"],
  allocation: { strategy: "even", test_fraction: 1.0 },
  stopping_rules: [{ rule: "Min 100 conversions" }],
  assumptions: ["Standard experimental allocation."]
};

export const GOLDEN_BRIEF: DecisionBrief = {
  headline: "CyberPet Pro: High Efficiency Discovery, Scale with Creative Variance",
  key_metrics: {
    cac: { p10: 38.2, p50: 42.1, p90: 48.4 },
    conversions: { p10: 310, p50: 356, p90: 394 },
    ctr: { p10: 0.018, p50: 0.024, p90: 0.031 },
    cvr: { p10: 0.042, p50: 0.049, p90: 0.056 }
  },
  verdict: {
    go_no_go: "go",
    reason: "Unit economics are robust. Projected CAC ($42.10) is below target with stable variance."
  },
  confidence_level: "HIGH",
  ssi: 0.88,
  stability: "STABLE",
  primary_failure_mode: "creative",
  fragility_disclosure: "Conclusion is sensitive to the assumed high intent of urban pet parents.",
  drivers: [
    { name: "Trust Signals", impact: "high", evidence: "Vet recommendation boosted CVR significantly." }
  ],
  sentiment_analysis: [
    { sentiment: "Enthusiastic", percentage: 65, common_feedback: "The automated play feature is a game-changer for my long shifts.", persona: "Busy Urban Professionals" },
    { sentiment: "Skeptical", percentage: 20, common_feedback: "Not sure if the computer vision is really accurate enough for my reactive cat.", persona: "Edge Case Tech Adopters" },
    { sentiment: "Price Sensitive", percentage: 15, common_feedback: "Love the idea but $149 is hard to justify when standard toys are $10.", persona: "Frugal Pet Owners" }
  ],
  segment_breakdown: [
    { name: "Urban Techies", cvr_relative: "above", potential: "High scale potential via high CPC tolerance." },
    { name: "Guilty Parents", cvr_relative: "avg", potential: "Steady growth, sensitive to creative fatigue." },
    { name: "Elderly Care", cvr_relative: "below", potential: "Low affinity, requires different trust hooks." }
  ],
  confidence_matrix: [
    { component: "Agent Personas", confidence: "MEDIUM", reason: "Synthetic psychographics" },
    { component: "Price Fit", confidence: "HIGH", reason: "Logistic response stable" }
  ],
  next_experiments_ranked: [
    { name: "TikTok Expansion", why: "Test lower CPC channel.", expected_uplift: "med", confidence: "high" }
  ],
  one_slide_summary: [
    "CAC is within target threshold of $45.",
    "Outcome stable in 88% of simulated worlds.",
    "Instagram shows strong affinity for high-income pet parents.",
    "Main risk: Creative fatigue after Day 14.",
    "Trust signals are the primary conversion driver.",
    "Scale budget by 20% if Day 7 CVR holds."
  ]
};
