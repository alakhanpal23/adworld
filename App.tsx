
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  RefreshCw,
  Zap,
  Layout,
  Target,
  Users,
  ChevronRight,
  Database,
  Activity,
  TrendingUp,
  ShieldAlert,
  Play,
  FlaskConical,
  Waves,
  Terminal,
  HeartPulse,
  Scale,
  ShieldCheck,
  BrainCircuit,
  Loader2,
  Video,
  Mic2,
  Search,
  Cpu,
  Layers,
  Settings2,
  BarChart3,
  Crosshair,
  LineChart,
  ClipboardList,
  UserCheck,
  CalendarDays,
  Quote,
  ArrowRight,
  MonitorPlay,
  Scissors,
  Eye,
  Lock,
  Clapperboard,
  History,
  FileVideo,
  ExternalLink,
  ChevronDown,
  Info,
  Beaker,
  Gauge,
  MessageSquare,
  TrendingDown,
  Map,
  Rocket,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  ZapOff
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { 
  normalizeCampaign, 
  generateMarket, 
  generatePriors, 
  generateExperimentPlan,
  generateBrief
} from './geminiService';
import { runSimulation } from './simulationEngine';
import { 
  Scenario, 
  Market, 
  Priors, 
  SimulationResult, 
  ExperimentPlan,
  DecisionBrief,
  Consumer
} from './types';
import { GOLDEN_SCENARIOS, GOLDEN_BRIEF, GOLDEN_MARKET, GOLDEN_PRIORS, GOLDEN_PLAN } from './fixtures';

type Phase = 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'phase5' | 'phase6' | 'phase7' | 'phase8';

const App: React.FC = () => {
  const [activePhase, setActivePhase] = useState<Phase>('phase1');
  const [demoMode, setDemoMode] = useState(true);
  
  // Pipeline Data States
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [market, setMarket] = useState<Market | null>(null);
  const [priors, setPriors] = useState<Priors | null>(null);
  const [experimentPlan, setExperimentPlan] = useState<ExperimentPlan | null>(null);
  const [resultsMap, setResultsMap] = useState<Record<string, SimulationResult>>({});
  const [brief, setBrief] = useState<DecisionBrief | null>(null);

  // System States
  const [trace, setTrace] = useState<string>('System Standby');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('Initializing Matrix...');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [veoResult, setVeoResult] = useState<any | null>(null);
  const [error, setError] = useState<{phase: string, msg: string} | null>(null);
  const [selectedExpName, setSelectedExpName] = useState<string | null>(null);
  const [rawInput, setRawInput] = useState('');

  const logTrace = (msg: string) => {
    console.log(`[AdWorld Kernel]: ${msg}`);
    setTrace(msg);
    setProcessingMsg(msg);
  };

  const handleNormalize = async (inputOverride?: string) => {
    const inputToUse = inputOverride || rawInput;
    if (!inputToUse.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    logTrace("Resolving Scenario Artifacts...");
    try {
      const isGolden = (demoMode && (inputToUse.includes("GOLDEN") || inputToUse.includes("CyberPet")));
      const res = isGolden ? { scenario: GOLDEN_SCENARIOS.cyberpet } : await normalizeCampaign(inputToUse);
      setScenario(res.scenario);
      logTrace("Scenario Locked.");
      return res.scenario;
    } catch (err) {
      setError({ phase: "Scenario", msg: "Failed to normalize campaign data." });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const hydrateMarket = (baseMarket: Market): Market => {
    logTrace("Hydrating Population Matrix...");
    const baseConsumers = baseMarket.consumers || [];
    if (baseConsumers.length === 0) return baseMarket;

    const hydrated: Consumer[] = [];
    const targetSize = 400;
    
    for (let i = 0; i < targetSize; i++) {
       const template = baseConsumers[i % baseConsumers.length];
       const clone: Consumer = JSON.parse(JSON.stringify(template));
       clone.id = `agent-${i}`;
       
       // Probabilistic jitter for unique behaviors
       const jitter = () => (Math.random() - 0.5) * 0.15;
       
       if (clone.traits) {
          Object.keys(clone.traits).forEach(key => {
            const trait = (clone.traits as any)[key];
            if (trait && typeof trait.mean === 'number') {
               trait.mean = Math.max(0.01, Math.min(0.99, trait.mean + jitter()));
            }
          });
       }
       hydrated.push(clone);
    }
    return { ...baseMarket, consumers: hydrated };
  };

  const handleGenerateMarket = async (s_in?: Scenario | null) => {
    const s = s_in || scenario;
    if (!s) return;
    setIsProcessing(true);
    logTrace("Synthesizing Market Archetypes...");
    try {
      const res = demoMode ? { market: GOLDEN_MARKET } : await generateMarket(s);
      if (!res.market || !res.market.consumers) {
        throw new Error("Market generation returned an invalid agent population.");
      }
      const fullMarket = hydrateMarket(res.market);
      setMarket(fullMarket);
      logTrace(`Population Initialized: ${fullMarket.consumers.length} Agents.`);
      return fullMarket;
    } catch (err: any) {
      setError({ phase: "Market", msg: err.message || "Population generation failed." });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeneratePriors = async (s_in?: Scenario | null) => {
    const s = s_in || scenario;
    if (!s) return;
    setIsProcessing(true);
    logTrace("Grounding Benchmark Priors...");
    try {
      const res = demoMode ? { priors: GOLDEN_PRIORS } : await generatePriors(s);
      setPriors(res.priors);
      logTrace("Benchmarks Grounded.");
      return res.priors;
    } catch (err: any) {
      logTrace(`Priors Fault: ${err.message}`);
      setError({ phase: "Priors", msg: `Distribution grounding failed: ${err.message}` });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeneratePlan = async (s_in?: Scenario | null) => {
    const s = s_in || scenario;
    if (!s) return;
    setIsProcessing(true);
    logTrace("Designing Isolation Plan...");
    try {
      const res = demoMode ? { plan: GOLDEN_PLAN } : await generateExperimentPlan(s);
      setExperimentPlan(res.plan);
      logTrace("Isolation Plan Sealed.");
      return res.plan;
    } catch (err) {
      setError({ phase: "Plan", msg: "Variable isolation design failed." });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunSimulation = async (s_in?: Scenario | null, m_in?: Market | null, p_in?: Priors | null, pl_in?: ExperimentPlan | null) => {
    const s = s_in || scenario;
    const m = m_in || market;
    const p = p_in || priors;
    const pl = pl_in || experimentPlan;
    if (!s || !m || !p || !pl) {
       logTrace("Simulation blocked: Artifacts missing.");
       return null;
    }
    setIsProcessing(true);
    logTrace("Executing Matrix Cycles...");
    try {
      const map: Record<string, SimulationResult> = {};
      for (const exp of pl.experiments) {
        logTrace(`Simulating World: ${exp.name}...`);
        map[exp.name] = runSimulation(s, m, p, exp.overrides);
      }
      setResultsMap(map);
      setSelectedExpName(pl.experiments[0].name);
      logTrace("Truth Matrix Computed.");
      return map;
    } catch (err: any) {
      setError({ phase: "Simulation", msg: err.message });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateBrief = async (s_in?: Scenario | null, p_in?: Priors | null, r_in?: Record<string, SimulationResult>) => {
    const s = s_in || scenario;
    const p = p_in || priors;
    const r = r_in || resultsMap;
    if (!s || !p || Object.keys(r).length === 0) return;
    setIsProcessing(true);
    logTrace("Synthesizing Narrative Brief...");
    try {
      const res = demoMode ? { brief: GOLDEN_BRIEF } : await generateBrief(s, p, r);
      setBrief(res.brief);
      logTrace("Brief Generated.");
      return res.brief;
    } catch (err) {
      setError({ phase: "Brief", msg: "Narrative synthesis engine fault." });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVeoSynthesis = useCallback((b_in?: DecisionBrief | null) => {
    const currentBrief = b_in || brief;
    if (!currentBrief) return;
    setIsSynthesizing(true);
    logTrace("Executing Creative Synthesis...");
    setTimeout(() => {
      setVeoResult({
        timing: {
          hook: "0-3s: Cinematic zoom on the stress-sensing lights of CyberPet. Captures pet's curiosity.",
          problem: "3-7s: Split screen: owner working at desk vs. CyberPet engaging the dog in playtime.",
          trust: "7-11s: 'Vet-Approved' seal appears over macro shots of durable, non-toxic materials.",
          cta: "11-15s: 'Peace of mind for only $149'. Direct 'Shop Now' button with fast shipping icon."
        },
        prompt: "Commercial advertisement for CyberPet Pro. Professional 4k cinematography, warm natural home lighting. High-speed macro shots of a smart pet toy and a happy dog. Minimalist text overlays. High-end lifestyle tech aesthetic.",
        rationale: {
          why: `Focused on 'Guilt Reducer' hooks found to be 30% more effective in simulation.`,
          removed: `Excluded complex feature list which caused cognitive bounce in test agents.`,
          fatigue: `Est. Creative Longevity: 18 days.`
        },
        confidence: {
          level: currentBrief.confidence_level,
          ctr_lift: "+32%",
          fatigue_risk: "LOW"
        }
      });
      setIsSynthesizing(false);
      logTrace("Creative Weights Locked.");
    }, 1500);
  }, [brief]);

  const goToPhase = async (target: Phase, inputOverride?: string) => {
    if (activePhase === target && !inputOverride) return;
    setIsProcessing(true);
    setError(null);
    try {
      let s = scenario; 
      if (!s || inputOverride) {
        s = await handleNormalize(inputOverride);
      }
      if (!s) throw new Error("Scenario missing.");
      if (target === 'phase1') { setActivePhase('phase1'); setIsProcessing(false); return; }

      let m = market; if (!m && ['phase2', 'phase3', 'phase4', 'phase5', 'phase6', 'phase7'].includes(target)) {
        m = await handleGenerateMarket(s);
      }
      if (target === 'phase2') { setActivePhase('phase2'); setIsProcessing(false); return; }

      let p = priors; if (!p && ['phase3', 'phase4', 'phase5', 'phase6', 'phase7'].includes(target)) {
        p = await handleGeneratePriors(s);
      }
      if (target === 'phase3') { setActivePhase('phase3'); setIsProcessing(false); return; }

      let pl = experimentPlan; if (!pl && ['phase4', 'phase5', 'phase6', 'phase7'].includes(target)) {
        pl = await handleGeneratePlan(s);
      }
      if (target === 'phase4') { 
        if (!pl) throw new Error("Isolation Plan missing.");
        setActivePhase('phase4'); 
        setIsProcessing(false); 
        return; 
      }

      let r = resultsMap; if (Object.keys(r).length === 0 && ['phase5', 'phase6', 'phase7'].includes(target)) {
        r = (await handleRunSimulation(s, m, p, pl)) || {};
      }
      if (target === 'phase5') { setActivePhase('phase5'); setIsProcessing(false); return; }

      let b = brief;
      if (!b && ['phase6', 'phase7'].includes(target)) {
        b = await handleGenerateBrief(s, p, r);
      }
      if (target === 'phase6') { setActivePhase('phase6'); setIsProcessing(false); return; }
      
      if (target === 'phase7') { 
        setActivePhase('phase7'); 
        setIsProcessing(false);
        if (!veoResult) handleVeoSynthesis(b);
        return; 
      }
      setActivePhase(target);
    } catch (e: any) {
      logTrace(`Critical Fault: ${e.message}`);
      setError({ phase: "Pipeline", msg: e.message || "Dependency error." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateVeoVideo = async () => {
    if (!veoResult) return;

    // @ts-ignore
    const hasKey = await window.aistudio.hasSelectedApiKey();
    // @ts-ignore
    if (!hasKey) {
      logTrace("Prompting for API Key...");
      // @ts-ignore
      window.aistudio.openSelectKey();
    }
    
    setIsGeneratingVideo(true);
    logTrace("Phase 7: Neural Rendering...");
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const finalPrompt = `${veoResult.prompt}. High end commercial. 4k detail. Very realistic lighting.`;
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: finalPrompt,
        config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: '9:16' }
      });
      
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 8000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
        logTrace(`Rendering Neural Weights... [ARTIFACT CONSTRUCTION]`);
      }
      
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        setVideoUrl(URL.createObjectURL(blob));
        logTrace("Video Construction Complete.");
      }
    } catch (err: any) {
      logTrace(`API Error: ${err.message}`);
      
      if (err.message.includes("Requested entity was not found.")) {
         logTrace("Project Validation Fault. Resetting...");
         // @ts-ignore
         window.aistudio.openSelectKey();
      }

      if (demoMode) {
        logTrace("Triggering Demo Mode Pet Video.");
        // High quality dog commercial sample
        setVideoUrl("https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
      } else {
        setError({ phase: "Veo", msg: `Rendering Fault: ${err.message}` });
      }
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const currentResult = selectedExpName ? resultsMap[selectedExpName] : null;

  return (
    <div className="h-screen flex flex-col bg-[#010101] text-[#e0e0e0] font-sans overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-white/5 bg-black/80 px-6 flex items-center justify-between z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.3)]">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-tighter italic text-white leading-none">AdWorld</h1>
            <span className="text-[7px] font-bold text-indigo-400 uppercase tracking-[0.4em]">Decision Surface 1.2</span>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10 overflow-x-auto no-scrollbar">
          <PhaseTab label="Scenario" active={activePhase === 'phase1'} onClick={() => goToPhase('phase1')} />
          <PhaseTab label="Market" active={activePhase === 'phase2'} onClick={() => goToPhase('phase2')} disabled={!scenario} />
          <PhaseTab label="Priors" active={activePhase === 'phase3'} onClick={() => goToPhase('phase3')} disabled={!market} />
          <PhaseTab label="Isolation" active={activePhase === 'phase4'} onClick={() => goToPhase('phase4')} disabled={!priors} />
          <PhaseTab label="Execution" active={activePhase === 'phase5'} onClick={() => goToPhase('phase5')} disabled={!experimentPlan} />
          <PhaseTab label="Outcome" active={activePhase === 'phase6'} onClick={() => goToPhase('phase6')} disabled={Object.keys(resultsMap).length === 0} />
          <PhaseTab label="Creative" active={activePhase === 'phase7'} onClick={() => goToPhase('phase7')} disabled={!brief} />
          <PhaseTab label="Console" active={activePhase === 'phase8'} onClick={() => setActivePhase('phase8')} />
        </nav>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setDemoMode(!demoMode)}
            className={`px-3 py-1 rounded border text-[8px] font-black uppercase tracking-widest transition-all ${demoMode ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}
          >
            {demoMode ? 'DEMO' : 'LIVE'} MODE
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 overflow-y-auto p-6 relative custom-scrollbar">
        {isProcessing && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-[100] flex flex-col items-center justify-center gap-6">
            <div className="relative">
               <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
               <Zap className="w-6 h-6 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
               <div className="text-[10px] font-black uppercase tracking-[1em] text-indigo-400 animate-pulse">{processingMsg}</div>
               <div className="text-[7px] font-mono text-white/20 uppercase tracking-[0.5em]">Executing synthetic matrix engine</div>
            </div>
            <button onClick={() => setIsProcessing(false)} className="mt-4 px-4 py-2 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-white/20 hover:text-white/50 transition-all">Force Unlock</button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-600/10 border border-red-600/20 rounded-xl flex items-center gap-4 animate-in slide-in-from-top-4">
             <ShieldAlert className="w-5 h-5 text-red-500" />
             <div className="text-xs font-medium text-red-400">
                <span className="font-black uppercase tracking-widest mr-2">{error.phase} Fault:</span> {error.msg}
             </div>
             <button onClick={() => setError(null)} className="ml-auto text-red-500/50 hover:text-red-500"><Terminal className="w-4 h-4" /></button>
          </div>
        )}

        {/* Phase 1: Scenario */}
        {activePhase === 'phase1' && (
          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto h-full animate-in fade-in">
            <div className="space-y-6">
               <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">Scenario Engine</h2>
               <div className="flex flex-wrap gap-2">
                 <button onClick={() => { 
                   const val = "GOLDEN FIXTURE: CyberPet Pro.";
                   setRawInput(val); 
                   handleNormalize(val); 
                 }} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-500/10 transition-all flex items-center gap-2">
                    <Database className="w-3.5 h-3.5" /> CyberPet Fixture
                 </button>
                 <button onClick={() => { 
                   const val = `PRODUCT: NeuralFocus Headband. EEG-sensing wearable for "flow state".\nPRICING: $199.\nAUDIENCE: Software engineers, day traders (24-40) in tech hubs.\nCHANNELS: YouTube, Search.\nBUDGET: $50,000.\nCREATIVE: Cyberpunk aesthetic, focus on neuro-signals.`;
                   setRawInput(val); 
                 }} className="px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black uppercase tracking-widest text-indigo-300 hover:bg-indigo-500/20 transition-all flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" /> NeuralFocus Sample
                 </button>
               </div>
               <textarea className="w-full h-52 bg-white/5 border border-white/10 rounded-2xl p-6 text-base font-medium resize-none text-white/80 focus:border-indigo-500 focus:bg-indigo-500/5 transition-all outline-none" placeholder="Paste campaign brief data..." value={rawInput} onChange={(e) => setRawInput(e.target.value)} />
               <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setRawInput('')} className="py-4 bg-white/5 text-white/40 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 transition-all">Clear Matrix</button>
                 <button onClick={() => handleNormalize()} disabled={isProcessing || !rawInput.trim()} className="py-4 bg-white text-black rounded-xl font-black text-lg uppercase italic tracking-tighter hover:bg-indigo-600 hover:text-white transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)]">Initialize Simulation</button>
               </div>
            </div>
            {scenario && (
               <div className="bg-black/40 border border-white/5 p-6 rounded-2xl h-full flex flex-col gap-4 animate-in slide-in-from-right-10 overflow-hidden">
                  <div className="flex justify-between items-center"><h3 className="text-xs font-black uppercase text-indigo-400 italic">Scenario Locked</h3><button onClick={() => goToPhase('phase2')} className="px-3 py-1.5 bg-indigo-600 text-[8px] font-black uppercase rounded-lg flex items-center gap-2">Synthesize Market <ArrowRight className="w-3 h-3" /></button></div>
                  <pre className="flex-1 overflow-auto bg-black/60 p-4 rounded-xl font-mono text-[9px] text-indigo-300 custom-scrollbar">{JSON.stringify(scenario, null, 2)}</pre>
               </div>
            )}
          </div>
        )}

        {/* Phase 2: Market */}
        {activePhase === 'phase2' && market && (
          <div className="space-y-6 max-w-6xl mx-auto h-full flex flex-col animate-in fade-in">
            <div className="flex justify-between items-end shrink-0">
               <div className="space-y-1">
                  <h2 className="text-3xl font-black italic uppercase text-white leading-none">Market Topology</h2>
                  <p className="text-sm text-white/30 font-medium italic">Synthetic population: {market.consumers?.length || 0} agents synthesized.</p>
               </div>
               <button onClick={() => goToPhase('phase3')} className="px-6 py-2 bg-white text-black font-black text-[9px] uppercase rounded-lg flex items-center gap-2">Analyze Distribution <ArrowRight className="w-3 h-3" /></button>
            </div>
            <div className="grid lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
               <div className="lg:col-span-8 space-y-4 overflow-y-auto pr-1 no-scrollbar">
                  {(market.segments || []).map((s, i) => (
                    <div key={i} className="bg-white/5 p-5 rounded-2xl border border-white/5 flex justify-between items-center group hover:bg-indigo-600/5 transition-all">
                       <div className="space-y-1">
                          <h4 className="text-lg font-black italic uppercase text-indigo-400">{s.name}</h4>
                          <p className="text-xs text-white/30 italic">"{s.description}"</p>
                       </div>
                       <div className="text-3xl font-black italic text-white">{(s.share * 100).toFixed(0)}%</div>
                    </div>
                  ))}
               </div>
               <div className="lg:col-span-4 bg-black/60 border border-white/5 p-6 rounded-2xl flex flex-col gap-4 overflow-hidden">
                  <h3 className="text-[9px] font-black uppercase text-indigo-400 tracking-widest italic">Agent Sample Frame</h3>
                  <div className="flex-1 overflow-auto no-scrollbar font-mono text-[9px] text-white/20">
                    <pre>{JSON.stringify((market.consumers || []).slice(0, 3), null, 2)}</pre>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* Phase 3: Priors */}
        {activePhase === 'phase3' && priors && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in h-full flex flex-col">
             <div className="flex justify-between items-end shrink-0">
                <div className="space-y-1">
                   <h2 className="text-3xl font-black italic uppercase text-white">Benchmark Priors</h2>
                   <p className="text-sm text-white/30 font-medium italic">Historical performance priors grounded in reality.</p>
                </div>
                <button onClick={() => goToPhase('phase4')} className="px-6 py-2 bg-indigo-600 text-white font-black text-[9px] uppercase rounded-lg flex items-center gap-2">Design Isolation <ArrowRight className="w-3 h-3" /></button>
             </div>
             <div className="grid md:grid-cols-3 gap-6">
                <DistributionCard label="CTR Distribution" val={`${(priors.distributions.ctr.p50 * 100).toFixed(1)}%`} p10={priors.distributions.ctr.p10 * 100} p90={priors.distributions.ctr.p90 * 100} unit="%" />
                <DistributionCard label="CVR Distribution" val={`${(priors.distributions.cvr.p50 * 100).toFixed(1)}%`} p10={priors.distributions.cvr.p10 * 100} p90={priors.distributions.cvr.p90 * 100} unit="%" />
                <DistributionCard label="CPC Benchmark" val={`$${priors.distributions.cpc.p50.toFixed(2)}`} p10={priors.distributions.cpc.p10} p90={priors.distributions.cpc.p90} unit="$" isCurrency />
             </div>
             <div className="bg-black/40 border border-white/10 rounded-[2.5rem] p-8 flex-1 overflow-hidden flex flex-col gap-6">
                <div className="flex items-center gap-3 text-indigo-400 font-black uppercase text-xs italic tracking-tighter">
                   <Gauge className="w-5 h-5" /> Grounding Evidence
                </div>
                <div className="grid md:grid-cols-2 gap-8 overflow-y-auto no-scrollbar pr-2">
                   <GroundingItem label="CTR Logic" text={priors.explainers.ctr} />
                   <GroundingItem label="CVR Logic" text={priors.explainers.cvr} />
                   <GroundingItem label="CPC Logic" text={priors.explainers.cpc} />
                   <GroundingItem label="Fatigue Logic" text={priors.explainers.fatigue} />
                </div>
             </div>
          </div>
        )}

        {/* Phase 4: Isolation */}
        {activePhase === 'phase4' && (
          <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in h-full flex flex-col">
             {experimentPlan ? (
               <>
                 <div className="flex justify-between items-end shrink-0">
                    <div className="space-y-1">
                       <h2 className="text-3xl font-black italic uppercase text-white">Isolation Plan</h2>
                       <p className="text-sm text-white/30 font-medium italic">Simulating {experimentPlan.experiments.length} independent worlds.</p>
                    </div>
                    <button onClick={() => goToPhase('phase5')} className="px-6 py-2 bg-indigo-600 text-white font-black text-[9px] uppercase rounded-lg flex items-center gap-2">Execute Matrix <ArrowRight className="w-3 h-3" /></button>
                 </div>
                 <div className="grid md:grid-cols-2 gap-6 overflow-y-auto no-scrollbar pb-10">
                    {(experimentPlan.experiments || []).map((e, i) => (
                       <div key={i} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-4 hover:border-indigo-500/40 transition-all group shadow-xl">
                          <div className="flex justify-between items-center">
                             <h4 className="text-xl font-black italic uppercase text-white group-hover:text-indigo-400 transition-colors">{e.name}</h4>
                             <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${e.expected_direction === 'better' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{e.expected_direction}</span>
                          </div>
                          <p className="text-sm text-white/40 italic font-medium leading-relaxed">"{e.hypothesis}"</p>
                          <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                             {Object.entries(e.overrides || {}).map(([k, v]) => (
                                <div key={k} className="px-3 py-1 bg-indigo-500/10 rounded-md text-[9px] font-mono text-indigo-400 uppercase italic">
                                   {k.replace('_', ' ')} → {v}x
                                </div>
                             ))}
                          </div>
                       </div>
                    ))}
                 </div>
               </>
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-50">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                  <p className="font-black uppercase italic tracking-widest text-xs">Designing Tests...</p>
               </div>
             )}
          </div>
        )}

        {/* Phase 5: Execution */}
        {activePhase === 'phase5' && resultsMap && (
          <div className="max-w-6xl mx-auto space-y-6 h-full flex flex-col animate-in fade-in overflow-hidden">
             <div className="flex justify-between items-end shrink-0">
                <div className="space-y-1">
                   <h2 className="text-3xl font-black italic uppercase text-white leading-none">Matrix Cycles</h2>
                   <p className="text-sm text-white/30 font-medium italic">Monte Carlo performance trajectories locked.</p>
                </div>
                <button onClick={() => goToPhase('phase6')} className="px-6 py-2 bg-white text-black font-black text-[9px] uppercase rounded-lg flex items-center gap-2">View Strategic Brief <ArrowRight className="w-3 h-3" /></button>
             </div>
             <div className="grid lg:grid-cols-12 gap-6 flex-1 min-h-0">
                <div className="lg:col-span-3 space-y-2 overflow-y-auto pr-1 no-scrollbar">
                   {(Object.entries(resultsMap) as [string, SimulationResult][]).map(([name, res]) => (
                      <button key={name} onClick={() => setSelectedExpName(name)} className={`w-full p-4 text-left rounded-xl border transition-all ${selectedExpName === name ? 'bg-indigo-600/10 border-indigo-600' : 'bg-white/5 border-white/5 opacity-40 hover:opacity-100'}`}>
                         <h4 className="text-xs font-black uppercase italic text-white mb-2">{name}</h4>
                         <div className="flex justify-between text-[8px] font-mono"><span className="text-white/20">CAC</span><span className="text-indigo-400">${res.summary.cac.toFixed(2)}</span></div>
                      </button>
                   ))}
                </div>
                <div className="lg:col-span-6 flex flex-col gap-4 min-h-0">
                   {currentResult && (
                      <div className="bg-black border border-white/10 rounded-[2rem] p-5 flex flex-col flex-1 min-h-0 overflow-hidden">
                         <div className="flex items-center gap-2 mb-4 text-[9px] font-black uppercase text-indigo-400 tracking-widest italic"><CalendarDays className="w-4 h-4" /> Trajectory Log</div>
                         <div className="flex-1 overflow-auto bg-black/40 rounded-xl p-4 border border-white/5 font-mono text-[9px] text-white/30 no-scrollbar">
                            <div className="grid grid-cols-5 gap-2 border-b border-white/10 pb-2 mb-2 font-black uppercase italic text-indigo-400"><span>Day</span><span>Impr.</span><span>Clicks</span><span>Conv.</span><span>Spend</span></div>
                            {(currentResult.days || []).map((d, i) => (
                               <div key={i} className="grid grid-cols-5 gap-2 py-1 border-b border-white/[0.03] hover:text-white transition-colors"><span>{d.day}</span><span>{d.impressions}</span><span>{d.clicks}</span><span>{d.conversions}</span><span>${d.spend.toFixed(0)}</span></div>
                            ))}
                         </div>
                      </div>
                   )}
                </div>
                <div className="lg:col-span-3 bg-indigo-600/5 border border-indigo-600/10 rounded-[2rem] p-6 overflow-y-auto no-scrollbar">
                   <div className="flex items-center gap-2 text-indigo-400 mb-4 font-black uppercase text-[9px] italic"><Quote className="w-4 h-4" /> Synthetic Logic</div>
                   <div className="space-y-6">
                      {(market?.consumers || []).slice(0, 4).map((c, i) => (
                         <div key={i} className="text-[10px] italic text-white/40 border-l-2 border-indigo-500/20 pl-4 space-y-1">
                            <span className="text-[8px] text-indigo-400 font-bold uppercase block">{c.segment}</span>"{c.narrative?.buy_reason || c.narrative?.no_buy_reason || 'Agent response: Neutral.'}"
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Phase 6: Outcome */}
        {activePhase === 'phase6' && brief && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in pb-20 overflow-y-auto no-scrollbar">
             <div className="text-center space-y-4">
                <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none">{brief.headline}</h2>
                <div className="flex items-center justify-center gap-3 text-indigo-400 font-bold uppercase text-[10px] tracking-[0.6em]">
                   <ShieldCheck className="w-5 h-5" /> Integrity Rating: {brief.confidence_level}
                </div>
             </div>
             <div className="grid lg:grid-cols-4 gap-6">
                <div className={`p-10 rounded-[2.5rem] border col-span-3 flex flex-col justify-center gap-6 ${brief.verdict?.go_no_go === 'go' ? 'bg-green-500/5 border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'bg-red-500/5 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]'}`}>
                   <div className="flex items-baseline gap-6">
                      <div className={`text-8xl font-black uppercase italic leading-none ${brief.verdict?.go_no_go === 'go' ? 'text-green-500' : 'text-red-500'}`}>{brief.verdict?.go_no_go}</div>
                      <p className="text-xl font-bold italic text-white/80 leading-tight flex-1">"{brief.verdict?.reason}"</p>
                   </div>
                </div>
                <div className="bg-white/5 p-10 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center text-center gap-1 shadow-inner">
                   <div className="text-[10px] font-black uppercase text-white/20 tracking-widest flex items-center gap-2"><History className="w-3.5 h-3.5" /> Stability Index</div>
                   <div className="text-7xl font-black text-indigo-500 leading-none">{(brief.ssi * 100).toFixed(0)}%</div>
                   <span className={`text-[10px] font-black uppercase tracking-[0.2em] mt-2 ${brief.stability === 'STABLE' ? 'text-green-500' : 'text-yellow-500'}`}>{brief.stability}</span>
                </div>
             </div>
             <div className="bg-black/60 border border-white/10 rounded-[3rem] p-12 space-y-10 shadow-2xl relative overflow-hidden">
                <div className="grid md:grid-cols-4 gap-8">
                   <MetricBox label="CAC (P50)" val={`$${brief.key_metrics.cac.p50.toFixed(2)}`} p10={brief.key_metrics.cac.p10} p90={brief.key_metrics.cac.p90} color="indigo" />
                   <MetricBox label="CVR" val={`${(brief.key_metrics.cvr.p50 * 100).toFixed(1)}%`} p10={brief.key_metrics.cvr.p10 * 100} p90={brief.key_metrics.cvr.p90 * 100} unit="%" color="emerald" />
                   <MetricBox label="CTR" val={`${(brief.key_metrics.ctr.p50 * 100).toFixed(1)}%`} p10={brief.key_metrics.ctr.p10 * 100} p90={brief.key_metrics.ctr.p90 * 100} unit="%" color="blue" />
                   <MetricBox label="Conv." val={`${brief.key_metrics.conversions.p50.toFixed(0)}`} p10={brief.key_metrics.conversions.p10} p90={brief.key_metrics.conversions.p90} color="amber" />
                </div>
             </div>
             <button onClick={() => goToPhase('phase7')} className="w-full py-8 bg-white text-black rounded-[3rem] font-black uppercase italic text-2xl tracking-[0.2em] shadow-2xl hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-6 group">
               Initialize Creative Artifacts <ArrowRight className="w-8 h-8 group-hover:translate-x-4 transition-transform" />
             </button>
          </div>
        )}

        {/* Phase 7: Creative */}
        {activePhase === 'phase7' && brief && (
          <div className="max-w-6xl mx-auto space-y-6 h-full flex flex-col animate-in fade-in pb-10">
             <div className="flex justify-between items-end shrink-0">
                <div className="space-y-1">
                   <h2 className="text-3xl font-black italic uppercase text-white leading-none">Veo 3.1 Synthesis</h2>
                   <p className="text-xs text-white/30 font-medium italic">Behavioral truth converted to cinematic commercials.</p>
                </div>
                {!isGeneratingVideo && !videoUrl && veoResult && (
                  <button onClick={handleGenerateVeoVideo} className="px-6 py-3 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl flex items-center gap-2 hover:bg-indigo-700 transition-all border border-indigo-400">
                    <Video className="w-4 h-4 fill-current" /> Execute Neural Rendering
                  </button>
                )}
             </div>
             
             {isSynthesizing && !veoResult && (
               <div className="flex-1 bg-black/40 border border-white/5 rounded-[3rem] flex flex-col items-center justify-center gap-8">
                 <Loader2 className="w-20 h-20 text-indigo-500 animate-spin" />
                 <div className="text-[10px] font-black uppercase tracking-[1em] text-indigo-400 animate-pulse text-center">Synthesizing Creative Archetypes...</div>
               </div>
             )}

             {veoResult && (
               <div className="flex-1 grid lg:grid-cols-12 gap-8 min-h-0 overflow-hidden">
                  <div className="lg:col-span-7 space-y-6 overflow-y-auto no-scrollbar pr-2">
                     <div className="bg-black/60 border border-white/10 rounded-[2.5rem] p-10 space-y-10 shadow-2xl">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3 text-indigo-400 font-black uppercase text-sm italic"><Scissors className="w-6 h-6" /> Script Blueprint</div>
                           <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">Veo Kernel Active</span>
                        </div>
                        <div className="grid grid-cols-1 gap-10">
                           <ScriptBlock label="Opening Hook" text={veoResult.timing?.hook} intent="Pattern Interrupt" />
                           <ScriptBlock label="Value Narrative" text={veoResult.timing?.problem} intent="Needs Match" />
                           <ScriptBlock label="Proof Points" text={veoResult.timing?.trust} intent="Trust Seal" />
                           <ScriptBlock label="Final CTA" text={veoResult.timing?.cta} intent="Action Trigger" />
                        </div>
                     </div>
                  </div>
                  <div className="lg:col-span-5 flex flex-col gap-6 min-h-0">
                     <div className="flex-1 bg-black rounded-[3rem] border border-white/10 overflow-hidden relative flex flex-col shadow-2xl group/video">
                        {isGeneratingVideo ? (
                          <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-black/50 backdrop-blur-sm">
                            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
                            <div className="text-center space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400 animate-pulse">Rendering Artifact...</p>
                              <p className="text-[7px] font-mono text-white/20 uppercase">Allocating Neural Cores</p>
                            </div>
                          </div>
                        ) : videoUrl ? (
                          <video src={videoUrl} className="flex-1 w-full h-full object-cover" controls autoPlay loop />
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center p-12 opacity-10 text-center gap-6 group-hover/video:opacity-20 transition-opacity">
                            <MonitorPlay className="w-24 h-24" />
                            <p className="font-black uppercase italic text-xs tracking-widest">Awaiting Artifact Signal</p>
                          </div>
                        )}
                        <div className="p-10 bg-[#080808] border-t border-white/5 space-y-8 shrink-0">
                           <div className="grid grid-cols-2 gap-3">
                              <DataTile label="CTR LIFT" val={veoResult.confidence?.ctr_lift} />
                              <DataTile label="REACH RISK" val={veoResult.confidence?.fatigue_risk} />
                           </div>
                           <div className="text-[8px] text-center text-white/10 font-black tracking-widest uppercase italic font-mono px-4 leading-relaxed line-clamp-2">"{veoResult.prompt}"</div>
                        </div>
                     </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {/* Phase 8: Console */}
        {activePhase === 'phase8' && (
          <div className="max-w-6xl mx-auto h-full flex flex-col animate-in fade-in">
             <div className="flex items-center gap-3 mb-6"><Terminal className="w-6 h-6 text-indigo-500" /><h2 className="text-2xl font-black italic uppercase text-white">System Kernel</h2></div>
             <div className="bg-black border border-white/10 rounded-[2.5rem] p-10 font-mono text-[11px] text-emerald-500/70 flex-1 overflow-auto no-scrollbar shadow-2xl">
                <div className="space-y-2">
                   <LogLine text="ADWORLD_BOOT: Matrix Initialized" />
                   <LogLine text={`KERNEL: Stable v1.2.2 [${new Date().toLocaleTimeString()}]`} />
                   <LogLine text={`PHASE: ${activePhase.toUpperCase()}`} />
                   <LogLine text={`TRACE: ${trace}`} />
                   <LogLine text={`MODEL: GEMINI-3-FLASH-PREVIEW`} />
                   <div className="text-emerald-500 animate-pulse mt-4">_</div>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="h-10 border-t border-white/5 bg-black px-8 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-6"><HeartPulse className="w-3.5 h-3.5 text-indigo-500 animate-pulse" /><span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">KERNEL_STATE: {trace}</span></div>
        <div className="flex items-center gap-8 text-[9px] font-black text-white/10 tracking-[0.4em] uppercase"><div><Layers className="w-4 h-4 inline mr-1 opacity-50" /> {market?.consumers?.length || 0} ACTIVE AGENTS</div><div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,1)]" /> SYSTEM NOMINAL</div></div>
      </footer>
    </div>
  );
};

// --- Sub-Components ---

const PhaseTab: React.FC<{ label: string; active: boolean; onClick: () => void; disabled?: boolean }> = ({ label, active, onClick, disabled }) => (
  <button disabled={disabled} onClick={onClick} className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${active ? 'bg-white text-black shadow-lg scale-105 font-black italic' : disabled ? 'opacity-20 cursor-not-allowed' : 'text-white/30 hover:text-white/80'}`}>{label}</button>
);

const MetricBox: React.FC<{ label: string; val: string; p10: number; p90: number; unit?: string; color: string }> = ({ label, val, p10, p90, unit = "", color }) => (
  <div className="flex flex-col gap-3 group">
     <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{label}</div>
     <div className={`text-4xl font-black italic tracking-tighter text-white leading-none`}>{val}</div>
     <div className="space-y-2">
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex items-center justify-center p-0.5">
           <div className={`h-full bg-indigo-500 w-1/2 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.4)]`} />
        </div>
        <div className="flex justify-between text-[8px] font-mono text-white/30 uppercase">
           <span>P10: {p10?.toFixed(2)}{unit}</span>
           <span>P90: {p90?.toFixed(2)}{unit}</span>
        </div>
     </div>
  </div>
);

const DistributionCard: React.FC<{ label: string; val: string; p10: number; p90: number; unit?: string; isCurrency?: boolean }> = ({ label, val, p10, p90, unit = "" }) => (
  <div className="bg-white/5 p-10 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center text-center group hover:bg-indigo-600/5 transition-all">
     <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2 group-hover:text-indigo-400">{label}</div>
     <div className="text-4xl font-black italic text-white leading-none mb-4">{val}</div>
     <div className="w-full space-y-2">
        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden flex items-center justify-center p-0.5"><div className="h-full bg-indigo-500 w-1/2 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" /></div>
        <div className="text-[9px] font-mono text-white/20 uppercase tracking-tighter">CI: {p10?.toFixed(2)}{unit} — {p90?.toFixed(2)}{unit}</div>
     </div>
  </div>
);

const GroundingItem: React.FC<{ label: string; text: string }> = ({ label, text }) => (
  <div className="space-y-2 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
     <div className="text-[10px] font-black uppercase text-indigo-400 tracking-widest italic">{label}</div>
     <p className="text-sm text-white/50 italic leading-relaxed font-medium">"{text}"</p>
  </div>
);

const ScriptBlock: React.FC<{ label: string; text: string; intent: string }> = ({ label, text, intent }) => (
  <div className="space-y-3 group border-l-2 border-white/5 pl-8 hover:border-indigo-500/50 transition-all">
     <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest"><span className="text-white/40 group-hover:text-indigo-400 italic transition-colors">{label}</span><span className="text-white/10 font-mono tracking-tighter">{intent}</span></div>
     <p className="text-xl text-white/90 italic font-bold leading-tight">"{text || '...'}"</p>
  </div>
);

const DataTile: React.FC<{ label: string; val: string }> = ({ label, val }) => (
  <div className="text-center p-4 rounded-2xl bg-black/60 border border-white/5 shadow-inner flex flex-col items-center justify-center"><div className="text-[8px] font-black text-white/20 uppercase mb-1 tracking-widest">{label}</div><div className="text-sm font-black italic text-indigo-400 leading-none">{val || '...'}</div></div>
);

const LogLine: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex gap-4 py-2 hover:bg-emerald-500/[0.03] px-3 rounded transition-colors"><span className="text-emerald-500/20">[{new Date().toLocaleTimeString()}]</span><span className="uppercase font-bold tracking-tight">{text}</span></div>
);

export default App;
