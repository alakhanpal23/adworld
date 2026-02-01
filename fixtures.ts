
import { Scenario, Market, Priors, DecisionBrief, ExperimentPlan } from './types';

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
  },
  neobank: {
    product: {
      name: "Zenith Bank",
      category: "FinTech",
      one_liner: "High-yield savings for Gen Z creators.",
      differentiator: "Automated tax withholding for 1099 income.",
      landing_page_quality: "medium"
    },
    pricing: { price_usd: 0, billing: "monthly" },
    audience: {
      geo: ["USA", "UK"],
      age_range: [18, 28],
      income_band: "mid",
      intent_level: "high_intent",
      persona_notes: "Freelance designers and influencers."
    },
    channel: { primary: "tiktok", objective: "signups", budget_usd: 10000, duration_days: 14 },
    creative: {
      format: "video",
      hook: "Stop stressing about tax season.",
      value_prop: "4.5% APY + Auto-Tax.",
      cta: "Open Account",
      visual_description: "Fast-paced editing of phone app.",
      trust_signals: ["FDIC Insured"]
    },
    constraints: { target_cac_usd: 25.00, notes: "Focus on signup volume." },
    assumptions: ["High TikTok engagement."]
  }
};

export const GOLDEN_MARKET: Market = {
  segments: [
    { name: "Urban Techies", share: 0.4, description: "Early adopters in major cities." },
    { name: "Guilty Parents", share: 0.35, description: "Feel bad about long work hours." },
    { name: "Vet-Led Leads", share: 0.25, description: "Driven by professional recommendations." }
  ],
  consumers: Array.from({ length: 400 }).map((_, i) => ({
    id: `agent-${i}`,
    segment: i < 160 ? "Urban Techies" : i < 300 ? "Guilty Parents" : "Vet-Led Leads",
    demographics: { age: 30, income_band: "high", geo: "USA" },
    traits: { price_sensitivity: 0.3, trust_baseline: 0.5, attention: 0.8, novelty_seeking: 0.7, needs_match: 0.6, fatigue_rate: 0.1 },
    channel_affinity: { tiktok: 0.4, instagram: 0.9, youtube: 0.3, search: 0.2 },
    thresholds: { max_price_usd: 200, min_trust: 0.4 },
    decision_model: {
      click_propensity: { w_attention: 0.4, w_channel_affinity: 0.4, w_hook_match: 0.1, w_novelty: 0.1 },
      convert_propensity: { w_needs_match: 0.3, w_trust: 0.3, w_price_fit: 0.2, w_value_prop: 0.2 }
    },
    narrative: { buy_reason: "Automation helps guilt.", no_buy_reason: "Too expensive." }
  })),
  assumptions: ["Market behaves according to CyberPet baseline."]
};

export const GOLDEN_PRIORS: Priors = {
  channel: "instagram",
  distributions: {
    ctr: { dist: "beta", alpha: 2, beta: 80 },
    cvr: { dist: "beta", alpha: 5, beta: 95 },
    cpc: { dist: "lognormal", mu: 0.1, sigma: 0.2, currency: "USD" },
    impression_to_view: { dist: "beta", alpha: 50, beta: 50 }
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
    { name: "high_trust", hypothesis: "Boosting trust signals increases CVR.", overrides: { trust_multiplier: 1.2 }, expected_direction: "better" },
    { name: "lower_price", hypothesis: "Lower price point ($129) increases volume.", overrides: { price_multiplier: 0.86 }, expected_direction: "uncertain" }
  ],
  metrics: ["cac", "roas", "conversions"],
  allocation: { strategy: "even", test_fraction: 1.0 },
  stopping_rules: [{ rule: "Min 100 conversions" }],
  assumptions: ["Standard experimental allocation."]
};

export const GOLDEN_BRIEF: Partial<DecisionBrief> = {
  headline: "CyberPet Pro: High Efficiency Discovery, Scale with Creative Variance",
  key_metrics: {
    cac: { p10: 38.2, p50: 42.1, p90: 48.4 },
    conversions: { p10: 310, p50: 356, p90: 394 },
    ctr: { p10: 0.018, p50: 0.024, p90: 0.031 },
    cvr: { p10: 0.042, p50: 0.049, p90: 0.056 }
  },
  verdict: {
    go_no_go: "go",
    reason: "Unit economics are robust. Projected CAC ($42.10) is 6.5% below target with strong return on capital."
  },
  primary_failure_mode: "creative",
  drivers: [
    { name: "Trust Signals", impact: "high", evidence: "Vet recommendation boosted CVR by 12% in sim." },
    { name: "Price Fit", impact: "med", evidence: "High income segment showed low sensitivity to $149 price point." }
  ],
  next_experiments_ranked: [
    { name: "TikTok Expansion", why: "Test lower CPC channel with same creative hook.", expected_uplift: "med", confidence: "high" },
    { name: "Price Elasticity", why: "Test $179 price point to increase LTV.", expected_uplift: "high", confidence: "low" }
  ],
  one_slide_summary: [
    "CAC is well within target threshold of $45.",
    "Instagram shows strong affinity for high-income pet parents.",
    "Main risk: Creative fatigue after Day 14.",
    "Trust signals are the primary conversion driver.",
    "P90 scenario still maintains marginal profitability.",
    "Scale budget by 20% if Day 7 CVR holds > 4%."
  ]
};
