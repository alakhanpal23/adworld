
export type LandingPageQuality = "low" | "medium" | "high";
export type BillingCycle = "one_time" | "monthly" | "annual";
export type IncomeBand = "low" | "mid" | "high";
export type IntentLevel = "discovery" | "consideration" | "high_intent";
export type PrimaryChannel = "tiktok" | "instagram" | "youtube" | "search";
export type Objective = "purchases" | "leads" | "signups";
export type CreativeFormat = "video" | "image" | "text";

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
  demographics: {
    age: number;
    income_band: IncomeBand;
    geo: string;
  };
  traits: {
    price_sensitivity: number;
    trust_baseline: number;
    attention: number;
    novelty_seeking: number;
    needs_match: number;
    fatigue_rate: number;
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
  assumptions: string[];
}

export interface MarketGeneratorResponse {
  market: Market;
}

export interface BetaDistribution {
  dist: "beta";
  alpha: number;
  beta: number;
}

export interface LogNormalDistribution {
  dist: "lognormal";
  mu: number;
  sigma: number;
  currency: string;
}

export interface Priors {
  channel: PrimaryChannel;
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
}

export interface SimulationResult {
  days: DailyMetric[];
  summary: SimulationSummary;
}

export interface PostMortem {
  verdict: "success" | "failure" | "marginal";
  executive_summary: string;
  key_findings: string[];
  risks: string[];
  recommendations: string[];
}

export interface MetricPValues {
  p10: number;
  p50: number;
  p90: number;
}

export interface DecisionBrief {
  headline: string;
  key_metrics: {
    cac: MetricPValues;
    conversions: MetricPValues;
    ctr: MetricPValues;
    cvr: MetricPValues;
  };
  verdict: {
    go_no_go: "go" | "no_go" | "test_more";
    reason: string;
  };
  primary_failure_mode: "price" | "creative" | "channel" | "trust" | "targeting";
  drivers: Array<{
    name: string;
    impact: "high" | "med" | "low";
    evidence: string;
  }>;
  next_experiments_ranked: Array<{
    name: string;
    why: string;
    expected_uplift: "high" | "med" | "low";
    confidence: "high" | "med" | "low";
  }>;
  one_slide_summary: [string, string, string, string, string, string];
}

export interface DecisionBriefResponse {
  brief: DecisionBrief;
}

export interface SystemAudit {
  overall_status: "pass" | "warning" | "fail";
  demo_readiness: "ready" | "risky" | "not_ready";
  summary: string;
  phase_checks: {
    phase_1_scenario: { status: "pass" | "fail"; issues: string[] };
    phase_2_market: { status: "pass" | "fail"; issues: string[] };
    phase_3_priors: { status: "pass" | "fail"; issues: string[] };
    phase_4_plan: { status: "pass" | "fail"; issues: string[] };
    phase_5_results: { status: "pass" | "fail"; issues: string[] };
  };
  critical_risks: string[];
  recommended_fixes: Array<{
    priority: "high" | "medium" | "low";
    fix: string;
  }>;
}

export interface SystemAuditResponse {
  audit: SystemAudit;
}

export interface SelfTestReport {
  status: "pass" | "warning" | "fail";
  integrity_score: number;
  // Fix: added summary property to match usage in App.tsx
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
