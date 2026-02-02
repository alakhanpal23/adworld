
import { Scenario, Market, Priors, SimulationResult, DailyMetric, SimulationSummary, ExperimentOverrides, StabilityStatus } from './types';

function sampleBeta(alpha: number, beta: number): number {
  const safeAlpha = Math.max(0.1, alpha);
  const safeBeta = Math.max(0.1, beta);
  const gamma = (a: number) => {
    let x = 0;
    for (let i = 0; i < a; i++) x += -Math.log(Math.random());
    return x;
  };
  const g1 = gamma(safeAlpha);
  const g2 = gamma(safeBeta);
  return g1 / (g1 + g2);
}

function sampleLogNormal(mu: number, sigma: number): number {
  const safeSigma = Math.max(0.01, sigma);
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return Math.exp(mu + safeSigma * z);
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function calculateSSI(summaries: SimulationSummary[]): number {
  if (summaries.length < 2) return 1.0;
  const cacs = summaries.map(s => s.cac);
  const mean = cacs.reduce((a, b) => a + b, 0) / cacs.length;
  if (mean === 0) return 0;
  const variance = cacs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / cacs.length;
  const stdDev = Math.sqrt(variance);
  return Math.max(0, 1 - (stdDev / mean));
}

function getStability(ssi: number): StabilityStatus {
  if (ssi >= 0.75) return "STABLE";
  if (ssi >= 0.50) return "VOLATILE";
  return "FRAGILE";
}

function runSingleIteration(
  scenario: Scenario, 
  market: Market, 
  priors: Priors, 
  overrides: ExperimentOverrides
): SimulationResult {
  const duration = scenario?.channel?.duration_days || 30;
  const totalBudget = scenario?.channel?.budget_usd || 1000;
  const dailyBudget = totalBudget / duration;
  const targetCac = scenario?.constraints?.target_cac_usd || 50;
  const productPrice = (scenario?.pricing?.price_usd || 100) * (overrides.price_multiplier || 1.0);

  const days: DailyMetric[] = [];
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;
  let totalSpend = 0;

  // Crucial: Guard against malformed priors
  if (!priors?.distributions?.cpc || !priors?.distributions?.ctr || !priors?.distributions?.cvr) {
     throw new Error("Simulation Engine: Priors object is incomplete. Ensure Distributions are initialized.");
  }

  const intentShift = overrides.audience_intent_shift || 0;
  const channel = scenario.channel.primary;
  
  // Calculate aggregate click propensity from synthetic agents
  const avgClickWeight = market.consumers.length > 0 
    ? market.consumers.reduce((acc, c) => {
        const channelAttr = (c.channel_affinity[channel] || 0.1) + intentShift;
        const model = c.decision_model.click_propensity;
        const traitAttention = c.traits.attention.mean;
        return acc + (traitAttention * (model.w_attention || 0.5) + Math.max(0, channelAttr) * (model.w_channel_affinity || 0.5));
      }, 0) / market.consumers.length 
    : 0.5;

  for (let d = 1; d <= duration; d++) {
    const cpcBase = sampleLogNormal(priors.distributions.cpc.parameters.mu, priors.distributions.cpc.parameters.sigma);
    const dailySpendTarget = Math.min(dailyBudget * (0.9 + Math.random() * 0.2), totalBudget - totalSpend);
    
    const safeCpc = Math.max(0.01, cpcBase);
    const dayImpressions = Math.floor(dailySpendTarget / (safeCpc * 0.2 || 0.1)); 
    
    const baseCtr = sampleBeta(priors.distributions.ctr.parameters.alpha, priors.distributions.ctr.parameters.beta);
    const hookMod = Math.max(priors.modifiers.hook_match.clamp[0], 
                             Math.min(priors.modifiers.hook_match.clamp[1], 
                             (1 + (priors.modifiers.hook_match.slope || 0)) * (overrides.hook_strength_multiplier || 1.0)));
    
    const finalCtr = baseCtr * hookMod * (avgClickWeight * 2.0); 
    const dayClicks = Math.floor(dayImpressions * Math.max(0, Math.min(1, finalCtr)));

    const baseCvr = sampleBeta(priors.distributions.cvr.parameters.alpha, priors.distributions.cvr.parameters.beta);
    const priceFit = priors.modifiers.price_fit;
    const priceFitMult = Math.max(priceFit.clamp[0], 
                                  Math.min(priceFit.clamp[1], 
                                  sigmoid(priceFit.k * (priceFit.midpoint_usd - productPrice))));
    
    const valuePropMult = overrides.value_prop_clarity_multiplier || 1.0;
    const trustMult = (overrides.trust_multiplier || 1.0) * (priors.modifiers.trust_multiplier.slope + 1);
    
    const finalCvr = baseCvr * priceFitMult * valuePropMult * trustMult;
    const dayConversions = Math.floor(dayClicks * Math.max(0, Math.min(1, finalCvr)));
    const actualDaySpend = dayClicks * safeCpc;
    
    days.push({ day: d, impressions: dayImpressions, clicks: dayClicks, conversions: dayConversions, spend: actualDaySpend });
    totalImpressions += dayImpressions;
    totalClicks += dayClicks;
    totalConversions += dayConversions;
    totalSpend += actualDaySpend;
    if (totalSpend >= totalBudget) break;
  }

  const cac = totalConversions > 0 ? totalSpend / totalConversions : totalSpend;
  const roas = totalSpend > 0 ? (totalConversions * productPrice) / totalSpend : 0;

  return {
    days,
    summary: {
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      total_conversions: totalConversions,
      total_spend: totalSpend,
      avg_ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      avg_cvr: totalClicks > 0 ? totalConversions / totalClicks : 0,
      avg_cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      cac,
      roas,
      success: cac <= targetCac,
      ssi: 1.0,
      stability: "STABLE"
    }
  };
}

export function runSimulation(
  scenario: Scenario, 
  market: Market, 
  priors: Priors, 
  overrides: ExperimentOverrides = {}
): SimulationResult {
  if (!scenario || !market || !priors) {
    throw new Error("Core Simulation Fault: One or more artifacts (Scenario, Market, Priors) are missing from the pipeline.");
  }
  
  const iterations = 10;
  const results: SimulationSummary[] = [];
  let mainResult: SimulationResult | null = null;

  for (let i = 0; i < iterations; i++) {
    const res = runSingleIteration(scenario, market, priors, overrides);
    results.push(res.summary);
    if (i === 0) mainResult = res;
  }

  const ssi = calculateSSI(results);
  const stability = getStability(ssi);

  if (mainResult) {
    mainResult.summary.ssi = ssi;
    mainResult.summary.stability = stability;
    mainResult.iterations = results;
  }

  return mainResult!;
}
