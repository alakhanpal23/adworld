
import { Scenario, Market, Priors, SimulationResult, DailyMetric, Consumer, ExperimentOverrides } from './types';

function sampleBeta(alpha: number, beta: number): number {
  const gamma = (a: number) => {
    let x = 0;
    for (let i = 0; i < a; i++) x += -Math.log(Math.random());
    return x;
  };
  const g1 = gamma(alpha);
  const g2 = gamma(beta);
  return g1 / (g1 + g2);
}

function sampleLogNormal(mu: number, sigma: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return Math.exp(mu + sigma * z);
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function runSimulation(
  scenario: Scenario, 
  market: Market, 
  priors: Priors, 
  overrides: ExperimentOverrides = {}
): SimulationResult {
  const duration = scenario.channel.duration_days;
  const totalBudget = scenario.channel.budget_usd;
  const dailyBudget = totalBudget / duration;
  const targetCac = scenario.constraints.target_cac_usd;
  
  // Apply Price Override
  const productPrice = scenario.pricing.price_usd * (overrides.price_multiplier || 1.0);

  const days: DailyMetric[] = [];
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;
  let totalSpend = 0;

  // Intent Shift Override
  const intentShift = overrides.audience_intent_shift || 0;

  // Calculate market-wide conversion propensity baseline
  const avgClickWeight = market.consumers.reduce((acc, c) => {
    const channelAttr = (c.channel_affinity[scenario.channel.primary] || 0.1) + intentShift;
    const model = c.decision_model.click_propensity;
    return acc + (c.traits.attention * model.w_attention + Math.max(0, channelAttr) * model.w_channel_affinity);
  }, 0) / market.consumers.length;

  for (let d = 1; d <= duration; d++) {
    // 1. Sample Daily Costs
    const cpc = sampleLogNormal(priors.distributions.cpc.mu, priors.distributions.cpc.sigma);
    const dailySpend = Math.min(dailyBudget * (0.8 + Math.random() * 0.4), totalBudget - totalSpend);
    const dayImpressions = Math.floor(dailySpend / (cpc * 0.1)); 
    
    // 2. Click Calculations
    const baseCtr = sampleBeta(priors.distributions.ctr.alpha, priors.distributions.ctr.beta);
    
    // Apply hook strength multiplier override
    const hookMod = Math.max(priors.modifiers.hook_match.clamp[0], 
                             Math.min(priors.modifiers.hook_match.clamp[1], 
                             (1 + priors.modifiers.hook_match.slope) * (overrides.hook_strength_multiplier || 1.0)));
    
    const finalCtr = baseCtr * hookMod * (avgClickWeight * 2); 
    const dayClicks = Math.floor(dayImpressions * Math.max(0, Math.min(1, finalCtr)));

    // 3. Conversion Calculations
    const baseCvr = sampleBeta(priors.distributions.cvr.alpha, priors.distributions.cvr.beta);
    
    // Price Fit Logistic Multiplier
    const priceFit = priors.modifiers.price_fit;
    const priceFitMult = Math.max(priceFit.clamp[0], 
                                  Math.min(priceFit.clamp[1], 
                                  sigmoid(priceFit.k * (priceFit.midpoint_usd - productPrice))));
    
    // Value Prop Multiplier Override
    const valuePropMult = overrides.value_prop_clarity_multiplier || 1.0;
    
    // Trust Multiplier Override
    const trustMult = overrides.trust_multiplier || 1.0;
    
    const finalCvr = baseCvr * priceFitMult * valuePropMult * trustMult;
    const dayConversions = Math.floor(dayClicks * Math.max(0, Math.min(1, finalCvr)));

    const actualDaySpend = dayClicks * cpc;
    
    days.push({
      day: d,
      impressions: dayImpressions,
      clicks: dayClicks,
      conversions: dayConversions,
      spend: actualDaySpend
    });

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
      success: cac <= targetCac
    }
  };
}
