
export type LandingPageQuality = "low" | "medium" | "high";
export type BillingCycle = "one_time" | "monthly" | "annual";
export type IncomeBand = "low" | "mid" | "high";
export type IntentLevel = "discovery" | "consideration" | "high_intent";
export type PrimaryChannel = "tiktok" | "instagram" | "youtube" | "search";
export type Objective = "purchases" | "leads" | "signups";
export type CreativeFormat = "video" | "image" | "text";
export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "EXPLORATORY";
export type StabilityStatus = "STABLE" | "VOLATILE" | "FRAGILE";

export interface PValues {
  p10: number;
  p50: number;
  p90: number;
}

export interface TraitDistribution {
  mean: number;
  variance: number;
  confidence: ConfidenceLevel;
  source: string;
}

export interface Scenario {
  product: {
    name: string;
    category: string;
    one_liner: string;
    differentiator: string;
    landing_page_quality: LandingPageQuality;
  };
  pricing: {
    price_usd: number;
    billing: BillingCycle;
  };
  audience: {
    geo: string[];
    age_range: [number, number];
    income_band: IncomeBand;
    intent_level: IntentLevel;
    persona_notes: string;
  };
  channel: {
    primary: PrimaryChannel;
    objective: Objective;
    budget_usd: number;
    duration_days: number;
  };
  creative: {
    format: CreativeFormat;
    hook: string;
    value_prop: string;
    cta: string;
    visual_description: string;
    trust_signals: string[];
  };
  constraints: {
    target_cac_usd: number;
    notes: string;
  };
  assumptions: string[];
}

export interface NormalizerResponse {
  scenario: Scenario;
}

export interface Segment {
  name: string;
  share: number;
  description: string;
}

export interface Consumer {
  id: string;
  segment: string;
  representativeness_bucket: "core" | "edge" | "exploratory";
  agent_confidence_score: number;
  demographics: {
    age: number;
    income_band: IncomeBand;
    geo: string;
  };
  traits: {
    price_sensitivity: TraitDistribution;
    trust_baseline: TraitDistribution;
    attention: TraitDistribution;
    novelty_seeking: TraitDistribution;
    needs_match: TraitDistribution;
    fatigue_rate: TraitDistribution;
  };
  channel_affinity: {
    tiktok: number;
    instagram: number;
    youtube: number;
    search: number;
  };
  thresholds: {
    max_price_usd: number;
    min_trust: number;
  };
  decision_model: {
    click_propensity: {
      w_attention: number;
      w_channel_affinity: number;
      w_hook_match: number;
      w_novelty: number;
    };
    convert_propensity: {
      w_needs_match: number;
      w_trust: number;
      w_price_fit: number;
      w_value_prop: number;
    };
  };
  narrative: {
    buy_reason: string;
    no_buy_reason: string;
  };
}

export interface Market {
  segments: Segment[];
  consumers: Consumer[];
  market_confidence_score: number;
  assumptions: string[];
}

export interface MarketGeneratorResponse {
  market: Market;
}

export interface BetaDistribution {
  dist: "beta";
  parameters: { alpha: number; beta: number };
  p10: number;
  p50: number;
  p90: number;
}

export interface LogNormalDistribution {
  dist: "lognormal";
  parameters: { mu: number; sigma: number };
  p10: number;
  p50: number;
  p90: number;
  currency: string;
}

export interface Priors {
  channel: PrimaryChannel;
  prior_strength: "weak" | "medium" | "anchored";
  distributions: {
    ctr: BetaDistribution;
    cvr: BetaDistribution;
    cpc: LogNormalDistribution;
    impression_to_view: BetaDistribution;
  };
  modifiers: {
    hook_match: { type: "linear"; slope: number; clamp: [number, number] };
    value_prop_match: { type: "linear"; slope: number; clamp: [number, number] };
    trust_multiplier: { type: "linear"; slope: number; clamp: [number, number] };
    price_fit: { type: "logistic"; k: number; midpoint_usd: number; clamp: [number, number] };
    fatigue: { type: "exp_decay"; lambda: number; per: "impression"; floor: number };
  };
  sanity_ranges: {
    ctr_typical: [number, number];
    cvr_typical: [number, number];
    cpc_typical_usd: [number, number];
  };
  explainers: {
    ctr: string;
    cvr: string;
    cpc: string;
    impression_to_view: string;
    fatigue: string;
  };
  assumptions: string[];
}

export interface PriorsGeneratorResponse {
  priors: Priors;
}

export interface ExperimentOverrides {
  price_multiplier?: number;
  trust_multiplier?: number;
  hook_strength_multiplier?: number;
  value_prop_clarity_multiplier?: number;
  fatigue_lambda_multiplier?: number;
  audience_intent_shift?: number;
}

export interface Experiment {
  name: string;
  overrides: ExperimentOverrides;
  hypothesis: string;
  expected_direction: "better" | "worse" | "uncertain";
}

export interface ExperimentPlan {
  n_runs: number;
  experiments: Experiment[];
  metrics: string[];
  allocation: {
    strategy: "even" | "test_then_scale";
    test_fraction: number;
  };
  stopping_rules: Array<{ rule: string; value?: number }>;
  assumptions: string[];
}

export interface ExperimentPlanResponse {
  plan: ExperimentPlan;
}

export interface DailyMetric {
  day: number;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
}

export interface SimulationSummary {
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  total_spend: number;
  avg_ctr: number;
  avg_cvr: number;
  avg_cpc: number;
  cac: number;
  roas: number;
  success: boolean;
  ssi: number; // Simulation Stability Index
  stability: StabilityStatus;
}

export interface SimulationResult {
  days: DailyMetric[];
  summary: SimulationSummary;
  iterations?: SimulationSummary[]; // Multiple runs to calculate intervals
}

export interface DecisionBrief {
  headline: string;
  key_metrics: {
    cac: PValues;
    conversions: PValues;
    ctr: PValues;
    cvr: PValues;
  };
  verdict: {
    go_no_go: "go" | "no_go" | "test_more";
    reason: string;
  };
  confidence_level: ConfidenceLevel;
  ssi: number;
  stability: StabilityStatus;
  primary_failure_mode: "price" | "creative" | "channel" | "trust" | "targeting";
  fragility_disclosure: string;
  drivers: Array<{
    name: string;
    impact: "high" | "med" | "low";
    evidence: string;
  }>;
  sentiment_analysis: Array<{
    sentiment: string;
    percentage: number;
    common_feedback: string;
    persona: string;
  }>;
  segment_breakdown: Array<{
    name: string;
    cvr_relative: "above" | "below" | "avg";
    potential: string;
  }>;
  confidence_matrix: Array<{
    component: string;
    confidence: ConfidenceLevel;
    reason: string;
  }>;
  next_experiments_ranked: Array<{
    name: string;
    why: string;
    expected_uplift: "high" | "med" | "low";
    confidence: "high" | "med" | "low";
  }>;
  one_slide_summary: string[];
}

export interface DecisionBriefResponse {
  brief: DecisionBrief;
}

export interface SelfTestReport {
  status: "pass" | "warning" | "fail";
  integrity_score: number;
  summary: string;
  demo_readiness: "ready" | "risky" | "not_ready";
  phase: {
    scenario: "pass" | "fail" | "warning";
    market: "pass" | "fail" | "warning";
    priors: "pass" | "fail" | "warning";
    plan: "pass" | "fail" | "warning";
    results: "pass" | "fail" | "warning";
  };
  critical_risks: string[];
  recommended_fixes: Array<{ priority: "high" | "medium" | "low"; fix: string }>;
}
