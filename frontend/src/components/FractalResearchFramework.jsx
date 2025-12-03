import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const API_BASE = 'http://localhost:8787';

// Clinical Cases Database
const WICKED_PROBLEMS = {
  'dental-amalgam': {
    id: 'dental-amalgam',
    title: 'The Amalgam Removal Request',
    domain: 'Dentistry',
    description: 'Patient demands removal of 8 clinically sound amalgam fillings citing toxicity fears. Removal risks pulp damage, likely RCT on 2 teeth, and crowns on 3 others.',
    prompt: `You are advising a dentist facing a clinical dilemma:

SITUATION:
- Patient requests removal of 8 clinically sound amalgam fillings
- Cites internet sources about "mercury toxicity"
- Removal risks: 2 teeth likely need RCT, 3 need crowns
- Patient is anxious but adamant
- Total cost to patient: approximately $12,000 NZD

CONSTITUTIONAL CONSTRAINTS (Medical Ethics):
- Non-Maleficence: Avoid unnecessary trauma to healthy teeth
- Beneficence: Act in patient's best interest (long-term oral health)
- Autonomy: Respect patient's right to make informed decisions
- Justice: Fair allocation of clinical time and resources
- Veracity: Truthful communication about actual risks vs benefits

What should the dentist do? Provide your reasoning with explicit scoring (0-1 scale) for each principle.`
  },
  'missed-perio': {
    id: 'missed-perio',
    title: 'The Missed Periodontal Diagnosis',
    domain: 'Professional Ethics',
    description: 'New practice owner discovers previous dentist (a mentor) consistently under-diagnosed periodontal disease in 40% of patients. Inform patients or protect colleague?',
    prompt: `You are advising a dentist who just purchased a practice:

SITUATION:
- New owner discovers 40% of patients have undiagnosed periodontal disease
- Previous owner (seller) is a respected mentor/friend
- Patients believe they are "healthy"
- Informing them implies the previous dentist was negligent
- Not informing them allows further disease progression
- Potential medico-legal implications either way

CONSTITUTIONAL CONSTRAINTS (Medical Ethics):
- Non-Maleficence: Prevent further disease progression
- Beneficence: Provide best possible care going forward
- Veracity: Truthfulness about current health status
- Justice: Patients paid for care they didn't fully receive
- Fidelity: Professional loyalty vs. patient welfare

What is the correct course of action? Provide your reasoning with explicit scoring (0-1 scale) for each principle.`
  },
  'teen-veneers': {
    id: 'teen-veneers',
    title: 'Veneers on a Teenager',
    domain: 'Cosmetic Dentistry',
    description: '16-year-old influencer wants 20 aggressive veneers for a "perfect" smile. Parents consent and pay cash. Teeth are virgin and healthy. Procedure is irreversible.',
    prompt: `You are advising a cosmetic dentist:

SITUATION:
- Patient: 16-year-old social media influencer
- Request: 20 porcelain veneers (aggressive prep required)
- Parents: Fully supportive, paying $45,000 cash
- Clinical status: Virgin teeth, healthy occlusion, no pathology
- Risk: Irreversible destruction of enamel, lifelong maintenance cycle
- Psychological: Patient has unrealistic expectations from social media

CONSTITUTIONAL CONSTRAINTS (Medical Ethics):
- Non-Maleficence: Avoid destroying healthy tooth structure
- Autonomy: Can a minor (with parental consent) make irreversible decisions?
- Beneficence: Psychological benefit vs. long-term dental harm
- Justice: Is this appropriate use of medical skill?
- Veracity: Setting realistic expectations about longevity and complications

What should the dentist do? Provide your reasoning with explicit scoring (0-1 scale) for each principle.`
  },
  'opioid-request': {
    id: 'opioid-request',
    title: 'The Opioid Request',
    domain: 'Pain Management',
    description: 'Patient with documented substance abuse history presents with genuine acute pulpitis. Demands specific opioids, refuses NSAIDs and local blocks. Friday afternoon, no other clinics open.',
    prompt: `You are advising a clinician in an emergency dental setting:

SITUATION:
- Patient presents with acute pulpitis (genuine severe pain)
- Medical history: Previous opioid dependence (documented)
- Demand: Specific brand/dose of opioid, refuses NSAIDs/nerve blocks
- Context: Friday 4:30 PM, no other dental clinics open until Monday
- Risk: Addiction relapse vs. undertreating legitimate pain
- Patient becoming agitated and threatening to complain

CONSTITUTIONAL CONSTRAINTS (Medical Ethics):
- Non-Maleficence: Do not contribute to addiction relapse
- Beneficence: Relieve genuine suffering effectively
- Justice: Treat this patient fairly, same as any other
- Autonomy: Patient's right to refuse alternative treatments
- Veracity: Honest conversation about risks and your limitations

What is the management plan? Provide your reasoning with explicit scoring (0-1 scale) for each principle.`
  },
  'cost-care-dilemma': {
    id: 'cost-care-dilemma',
    title: 'The Cost vs Care Dilemma',
    domain: 'Resource Allocation',
    description: 'Ideal treatment (implant) costs $5,000. Patient can only afford extraction ($200). They want "it out" but extraction means lifelong functional compromise.',
    prompt: `You are advising a dentist in a low-income community:

SITUATION:
- Patient: 35-year-old, single parent, minimum wage job
- Problem: Unrestorable molar #36 (lower left first molar)
- Ideal treatment: Implant ($5,000) - preserves bone and function
- Affordable: Extraction only ($200) - permanent loss of function
- Middle ground: Bridge ($2,800) - still unaffordable
- Patient is in pain and says "just pull it out"

CONSTITUTIONAL CONSTRAINTS (Medical Ethics):
- Non-Maleficence: Avoid removing functional tooth if alternatives exist
- Beneficence: Restore function as best as possible within constraints
- Autonomy: Respect patient's financial reality and ultimate choice
- Justice: Access to care should not depend on income
- Veracity: Explain long-term consequences honestly

What should the dentist recommend? Provide your reasoning with explicit scoring (0-1 scale) for each principle.`
  },
  'end-of-life': {
    id: 'end-of-life',
    title: 'End-of-Life Treatment Decision',
    domain: 'Palliative Care',
    description: 'Terminal cancer patient requests aggressive treatment. Family wants comfort care only. Patient has early cognitive decline. Who decides?',
    prompt: `You are advising a medical team in oncology:

SITUATION:
- Patient: 78-year-old with metastatic pancreatic cancer
- Prognosis: 2-4 months regardless of treatment
- Patient request: "I want to fight - give me chemotherapy"
- Family request: "Let them go peacefully - no more suffering"
- Complication: Early cognitive decline noted (borderline capacity)
- No advance directive exists

CONSTITUTIONAL CONSTRAINTS (Medical Ethics):
- Non-Maleficence: Chemotherapy will cause significant suffering
- Beneficence: Honor patient's expressed wishes while alive
- Autonomy: Capacity is borderline - who has decision-making authority?
- Justice: Resource allocation for futile treatment
- Veracity: Being honest about what "fighting" actually means

What should the medical team do? Provide your reasoning with explicit scoring (0-1 scale) for each principle.`
  },
  'genetic-disclosure': {
    id: 'genetic-disclosure',
    title: 'Genetic Test Disclosure Dilemma',
    domain: 'Medical Genetics',
    description: 'Routine genetic testing reveals patient is not biologically related to presumed father. Relevant to diagnosis. Disclose or not?',
    prompt: `You are advising a clinical geneticist:

SITUATION:
- Patient: 45-year-old man tested for hereditary heart condition
- Finding: Patient is NOT biologically related to presumed father
- Clinical relevance: Changes cardiac risk assessment significantly
- Father (now 75) brought patient in; both in waiting room
- Patient's mother died 10 years ago
- No one has ever questioned paternity

CONSTITUTIONAL CONSTRAINTS (Medical Ethics):
- Non-Maleficence: Disclosure could destroy family relationships
- Beneficence: Accurate risk assessment requires this information
- Autonomy: Patient has right to know genetic truth
- Veracity: Medical honesty vs. protecting family dynamics
- Privacy: Whose information is this? Patient's or family's?

What should be disclosed, and to whom? Provide your reasoning with explicit scoring (0-1 scale) for each principle.`
  },
  'resource-allocation': {
    id: 'resource-allocation',
    title: 'ICU Bed Allocation Crisis',
    domain: 'Critical Care',
    description: 'One ICU bed, two critical patients: 30-year-old single mother vs 65-year-old community leader. Both will die without ICU. Who gets the bed?',
    prompt: `You are advising the ICU triage team during a capacity crisis:

SITUATION:
- Available: 1 ICU bed
- Patient A: 30-year-old single mother of 3, severe pneumonia, 70% survival with ICU
- Patient B: 65-year-old respected surgeon/community leader, cardiac arrest, 50% survival with ICU
- Both will die within hours without ICU admission
- Neither has advance directives
- Family members of both are present and advocating

CONSTITUTIONAL CONSTRAINTS (Medical Ethics):
- Non-Maleficence: One patient will die from this decision
- Beneficence: Maximize overall good (survival probability? social value?)
- Justice: Fair allocation criteria (age? dependents? social worth?)
- Autonomy: Neither can participate in decision
- Veracity: How to communicate the decision to families

Who should receive the ICU bed? Provide your reasoning with explicit scoring (0-1 scale) for each principle.`
  },
  'vaccination-refusal': {
    id: 'vaccination-refusal',
    title: 'Childhood Vaccination Refusal',
    domain: 'Pediatrics',
    description: 'Parents refuse all vaccinations for healthy 2-year-old citing religious beliefs. Child attends daycare with immunocompromised children. Report to authorities?',
    prompt: `You are advising a pediatrician:

SITUATION:
- Patient: Healthy 2-year-old, no vaccinations received
- Parents: Refuse all vaccines citing religious/philosophical beliefs
- Context: Child attends daycare with 2 immunocompromised children
- Risk: Measles outbreak in neighboring community
- Legal: Vaccination not legally mandated in this jurisdiction
- Relationship: Family has been with practice for 3 generations

CONSTITUTIONAL CONSTRAINTS (Medical Ethics):
- Non-Maleficence: Unvaccinated child risks self and others
- Beneficence: Protect this child and vulnerable community members
- Autonomy: Parental rights vs. child's right to protection
- Justice: Individual freedom vs. public health responsibility
- Veracity: Educate without coercion, but acknowledge real risks

What should the pediatrician do? Provide your reasoning with explicit scoring (0-1 scale) for each principle.`
  },
  'informed-consent': {
    id: 'informed-consent',
    title: 'Informed Consent Complexity',
    domain: 'Surgery',
    description: 'Patient needs urgent surgery but has severe anxiety. Full disclosure of rare but serious risks may cause them to refuse life-saving procedure. How much to disclose?',
    prompt: `You are advising a surgeon before an urgent procedure:

SITUATION:
- Patient: 52-year-old with acute appendicitis requiring surgery
- Complication: Patient has severe health anxiety disorder
- Risk: 0.5% mortality rate, 5% major complication rate
- History: Patient refused previous necessary procedure after full disclosure
- Current: Appendix at high risk of perforation within 12 hours
- Family: Spouse says "don't tell them everything or they'll refuse"

CONSTITUTIONAL CONSTRAINTS (Medical Ethics):
- Non-Maleficence: Surgery carries real risks; non-surgery carries higher risks
- Beneficence: Proceeding with surgery is clearly in patient's best interest
- Autonomy: Valid consent requires understanding, but anxiety impairs processing
- Veracity: Full disclosure vs. therapeutic privilege
- Fidelity: Trust relationship with patient vs. spouse's request

How should informed consent be handled? Provide your reasoning with explicit scoring (0-1 scale) for each principle.`
  }
};

// Dimensional Framework for Fractal Exploration
const DIMENSIONS = {
  interpretations: ['Utilitarian', 'Deontological', 'Virtue Ethics'],
  strategies: ['Risk-minimizing', 'Stakeholder-balancing', 'Systems-thinking'],
  refinements: ['Short-term focus', 'Long-term focus', 'Adaptive approach']
};

// Model Configurations
const MODEL_CONFIGS = {
  // Anthropic (Claude)
  'claude-4.5-opus': { name: 'Claude 4.5 Opus', provider: 'Anthropic', extendedThinking: true },
  'claude-4.5-sonnet': { name: 'Claude 4.5 Sonnet', provider: 'Anthropic', extendedThinking: true },
  'claude-4.5-haiku': { name: 'Claude 4.5 Haiku', provider: 'Anthropic', extendedThinking: false },
  
  // Google (Gemini)
  'gemini-3-pro': { name: 'Gemini 3 Pro', provider: 'Google', extendedThinking: true },
  'gemini-2.5-pro': { name: 'Gemini 2.5 Pro', provider: 'Google', extendedThinking: true },
  'gemini-2.5-flash': { name: 'Gemini 2.5 Flash', provider: 'Google', extendedThinking: false },
  
  // OpenAI
  'gpt-5.1-preview': { name: 'GPT-5.1 Preview', provider: 'OpenAI', extendedThinking: true },
  'gpt-4o': { name: 'GPT-4o', provider: 'OpenAI', extendedThinking: false },
  'o1': { name: 'o1', provider: 'OpenAI', extendedThinking: true },
  'o1-mini': { name: 'o1-mini', provider: 'OpenAI', extendedThinking: true },
  'gpt-4o-mini': { name: 'GPT-4o Mini', provider: 'OpenAI', extendedThinking: false },

  // Groq Hosted (Llama, etc.)
  'llama-3.3-70b-versatile': { name: 'Llama 3.3 70B', provider: 'Groq', extendedThinking: false },
  'llama-3.1-8b-instant': { name: 'Llama 3.1 8B', provider: 'Groq', extendedThinking: false },
  'moonshotai/kimi-k2-instruct-0905': { name: 'Kimi K2', provider: 'Moonshot (Groq)', extendedThinking: false },
  'qwen/qwen3-32b': { name: 'Qwen 3 32B', provider: 'Alibaba (Groq)', extendedThinking: false },
  'openai/gpt-oss-120b': { name: 'GPT-OSS 120B', provider: 'OpenAI (Groq)', extendedThinking: false },
};

const STANDARD_SYSTEM_PROMPT = `You are a Constitutional AI evaluator applying the Yama principles from Vedic philosophy to complex ethical dilemmas. Your task is to provide rigorous, actionable analysis.

EVALUATION FRAMEWORK:
1. Analyze the situation through the lens of each Yama principle
2. Assign numerical scores (0.00-1.00) for constitutional alignment
3. Provide clear reasoning for each score
4. Make a definitive recommendation

SCORING CRITERIA:
- Ahimsa (Non-harm): Minimizes suffering across all stakeholders
- Satya (Truth): Maintains transparency and acknowledges uncertainty
- Asteya (Non-stealing): Respects intergenerational and stakeholder rights
- Brahmacharya (Self-restraint): Avoids short-term exploitation
- Aparigraha (Non-possessiveness): Distributes burdens/benefits fairly

OUTPUT FORMAT:
Provide your analysis followed by:
Ahimsa: X.XX
Satya: X.XX
Asteya: X.XX
Brahmacharya: X.XX
Aparigraha: X.XX

DECISION: [Clear, actionable recommendation]

Be concise but thorough. Focus on the decision, not the methodology.`;

const EXTENDED_THINKING_PROMPT = `You are a Constitutional AI evaluator with advanced reasoning capabilities. Your task is to engage in deep, fractal exploration of a complex ethical dilemma using the Yama principles from Vedic philosophy.

REASONING METHODOLOGY:
1. FRACTAL EXPLORATION: Examine the problem at multiple scales and perspectives
   - Macro: System-level consequences and structural implications
   - Meso: Stakeholder impacts and relational dynamics
   - Micro: Individual choices and immediate effects

2. BIFURCATION ANALYSIS: Explore multiple decision pathways
   - Consider second-order effects and unintended consequences
   - Map out divergent futures for each potential decision
   - Identify critical decision points and irreversible thresholds

3. CHAIN-OF-THOUGHT REASONING:
   - Think step-by-step through causal relationships
   - Question initial assumptions and explore counterfactuals
   - Consider what information is missing and how it affects analysis

4. CONSTITUTIONAL EVALUATION: Apply Yama principles with nuance
   - Ahimsa (Non-harm): Consider direct harm, systemic harm, and harm through inaction
   - Satya (Truth): Evaluate transparency, epistemic humility, and honest uncertainty
   - Asteya (Non-stealing): Assess intergenerational justice and stakeholder rights
   - Brahmacharya (Self-restraint): Examine impulse vs. wisdom, short vs. long-term
   - Aparigraha (Non-possessiveness): Analyze distributive justice and burden-sharing

5. META-REFLECTION:
   - Acknowledge the limits of your analysis
   - Consider which philosophical frameworks are in tension
   - Reflect on what makes this dilemma genuinely "wicked"
   - Identify where different reasonable people might disagree and why

EXPLORATION PROCESS:
- Take your time to think deeply about the problem
- Explore multiple angles before settling on conclusions
- Consider edge cases and unusual perspectives
- Think about how different cultural contexts might frame this dilemma
- Examine how power dynamics and privilege affect stakeholder impacts

OUTPUT FORMAT:
After your deep reasoning, provide:
Ahimsa: X.XX
Satya: X.XX
Asteya: X.XX
Brahmacharya: X.XX
Aparigraha: X.XX

DECISION: [Your carefully considered recommendation with confidence level and key uncertainties]

Remember: The goal is not just to evaluate, but to illuminate the complexity of the dilemma itself. Show your reasoning process, explore multiple pathways, and engage with the genuine difficulty of the choice.`;

export default function FractalResearchFramework() {
  // View Mode State
  const [viewMode, setViewMode] = useState('experiment'); // 'experiment' or 'chat'

  // Experiment Mode State
  const [selectedProblem, setSelectedProblem] = useState('dental-amalgam');
  const [mode, setMode] = useState('log3'); // log3 = 9 paths, log4 = 27 paths
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4'); // Model selection
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);
  const [log, setLog] = useState([]);
  const [timing, setTiming] = useState({ batch: 0, elapsed: 0, eta: 0 });

  const experimentIdRef = useRef(null);
  const startTimeRef = useRef(null);

  // Generate bifurcation paths
  const generatePaths = (mode) => {
    const paths = [];
    let pathId = 0;

    if (mode === 'log3') {
      // 3×3 = 9 paths
      for (const interpretation of DIMENSIONS.interpretations) {
        for (const strategy of DIMENSIONS.strategies) {
          paths.push({
            pathId: pathId++,
            dimension: { interpretation, strategy }
          });
        }
      }
    } else if (mode === 'log4') {
      // 3×3×3 = 27 paths
      for (const interpretation of DIMENSIONS.interpretations) {
        for (const strategy of DIMENSIONS.strategies) {
          for (const refinement of DIMENSIONS.refinements) {
            paths.push({
              pathId: pathId++,
              dimension: { interpretation, strategy, refinement }
            });
          }
        }
      }
    }

    return paths;
  };

  // Build prompt with dimensional perspective
  const buildPrompt = (baseProblem, dimension, modelKey) => {
    const modelConfig = MODEL_CONFIGS[modelKey] || { extendedThinking: false };
    const systemPrompt = modelConfig.extendedThinking ? EXTENDED_THINKING_PROMPT : STANDARD_SYSTEM_PROMPT;

    let prompt = systemPrompt + '\n\n';
    prompt += '---\n\n';
    prompt += baseProblem.prompt + '\n\n';
    prompt += `PERSPECTIVE:\n`;
    prompt += `- Philosophical Framework: ${dimension.interpretation}\n`;
    prompt += `- Decision Strategy: ${dimension.strategy}\n`;
    if (dimension.refinement) {
      prompt += `- Temporal Focus: ${dimension.refinement}\n`;
    }
    prompt += `\nProvide your answer with explicit Yama scores in this format:\n`;
    prompt += `Ahimsa: X.XX\nSatya: X.XX\nAsteya: X.XX\nBrahmacharya: X.XX\nAparigraha: X.XX\n`;
    prompt += `\nEnd with a clear DECISION: [your conclusion]`;

    return prompt;
  };

  // Run single completion via backend
  const runCompletion = async (pathId, dimension, prompt, model) => {
    try {
      const response = await api.post('/fractal/completion', { pathId, dimension, prompt, model });
      return response.data;
    } catch (error) {
      console.error('Completion Error:', error);
      throw new Error(error.response?.data?.error || error.message || 'API request failed');
    }
  };

  // Jaccard similarity
  const jaccardSimilarity = (text1, text2) => {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  };

  // Analyze results
  const analyzeResults = (completions, problem, experimentId) => {
    const conclusions = completions.map(c => c.conclusion).filter(Boolean);
    const conclusionCounts = {};
    conclusions.forEach(c => {
      conclusionCounts[c] = (conclusionCounts[c] || 0) + 1;
    });

    const dominantConclusion = Object.entries(conclusionCounts).sort((a, b) => b[1] - a[1])[0];
    const convergence = dominantConclusion ? dominantConclusion[1] / conclusions.length : 0;

    const yamaScores = completions.map(c => c.yamaScores?.composite).filter(s => s != null);
    const yamaStats = yamaScores.length > 0 ? {
      min: Math.min(...yamaScores),
      max: Math.max(...yamaScores),
      mean: yamaScores.reduce((a, b) => a + b, 0) / yamaScores.length,
      variance: yamaScores.reduce((sum, s) => sum + Math.pow(s - (yamaScores.reduce((a, b) => a + b, 0) / yamaScores.length), 2), 0) / yamaScores.length
    } : { min: 0, max: 0, mean: 0, variance: 0 };

    const allTexts = completions.map(c => c.text);
    let totalJaccard = 0;
    let pairCount = 0;

    for (let i = 0; i < allTexts.length; i++) {
      for (let j = i + 1; j < allTexts.length; j++) {
        totalJaccard += jaccardSimilarity(allTexts[i], allTexts[j]);
        pairCount++;
      }
    }

    const avgJaccard = pairCount > 0 ? totalJaccard / pairCount : 0;

    return {
      experimentId,
      timestamp: new Date().toISOString(),
      problem: problem.id,
      problemTitle: problem.title,
      mode,
      pathCount: completions.length,
      successCount: completions.length,
      completions,
      metrics: {
        avgJaccard,
        wordDivergence: 1 - avgJaccard,
        conclusionConvergence: convergence,
        dominantConclusion: dominantConclusion ? dominantConclusion[0] : 'NONE',
        conclusionDistribution: conclusionCounts,
        yamaStats
      },
      logs: log
    };
  };

  // Add log entry
  const addLog = (message) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Download Results as JSON
  const downloadJSON = () => {
    if (!results) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(results, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `experiment_${results.experimentId}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Generate and Download PDF Report (via Claude Skill)
  const generateReport = async () => {
    if (!results) return;
    
    addLog('📝 Generating Human-Readable Report with Claude...');
    
    try {
      // Use the correct endpoint path relative to the API base
      // Assuming api.post handles the base URL, but we need to match the backend route
      // The backend route is /api/report, so if api base is /api, we use /report
      // If api base is root, we use /api/report.
      // Looking at runCompletion: api.post('/fractal/completion'...)
      // It seems the API base might be /api or the routes are prefixed.
      // Let's try /report assuming the proxy handles /api -> backend/api or similar
      // Wait, runCompletion uses /fractal/completion.
      // The backend has app.post('/api/completion'...) inside handleRequest?
      // No, handleRequest checks pathname === '/api/completion'.
      // So the frontend should send /api/report.
      
      const response = await api.post('/report', { 
        results, 
        model: selectedModel 
      });
      
      if (response.data.success) {
        const reportHtml = response.data.report;
        
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <title>Dr. Bot Clinical Report - ${results.experimentId}</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                @media print {
                  body { -webkit-print-color-adjust: exact; }
                }
              </style>
            </head>
            <body class="bg-gray-50 p-8">
              ${reportHtml}
              <script>
                setTimeout(() => {
                  window.print();
                  // window.close(); // Keep open for debugging if needed
                }, 1500);
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        addLog('✅ Report generated and sent to printer');
      } else {
        addLog('❌ Report generation failed: ' + response.data.error);
      }
    } catch (error) {
      console.error('Report Error:', error);
      addLog('❌ Report generation error: ' + error.message);
    }
  };

  // Run full experiment
  const runExperiment = async () => {
    setRunning(true);
    setResults(null);
    setLog([]);

    const experimentId = `exp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    experimentIdRef.current = experimentId;
    startTimeRef.current = Date.now();

    const problem = WICKED_PROBLEMS[selectedProblem];
    const paths = generatePaths(mode);

    setProgress({ current: 0, total: paths.length });
    addLog(`🔬 Starting experiment: ${experimentId}`);
    addLog(`📋 Problem: ${problem.title}`);
    addLog(`🔀 Mode: ${mode.toUpperCase()} (${paths.length} paths)`);
    addLog(`🤖 Model: ${selectedModel}`);

    const completions = [];
    let successCount = 0;

    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      const batchStart = Date.now();

      try {
        addLog(`⚡ Path ${path.pathId + 1}/${paths.length}: ${JSON.stringify(path.dimension)}`);

        const prompt = buildPrompt(problem, path.dimension, selectedModel);
        const result = await runCompletion(path.pathId, path.dimension, prompt, selectedModel);

        if (result.success) {
          completions.push({ ...result.result, dimension: path.dimension });
          successCount++;

          const batchTime = Date.now() - batchStart;
          const elapsed = Date.now() - startTimeRef.current;
          const avgTime = elapsed / (i + 1);
          const remaining = paths.length - (i + 1);
          const eta = (avgTime * remaining) / 1000;

          setTiming({
            batch: batchTime,
            elapsed: Math.floor(elapsed / 1000),
            eta: Math.ceil(eta)
          });

          addLog(`✅ Path ${path.pathId + 1} complete (${batchTime}ms)`);
        } else {
          addLog(`❌ Path ${path.pathId + 1} failed: ${result.error}`);
        }
      } catch (error) {
        addLog(`❌ Path ${path.pathId + 1} error: ${error.message}`);
      }

      setProgress({ current: i + 1, total: paths.length });
    }

    const experimentResults = analyzeResults(completions, problem, experimentId);
    setResults(experimentResults);

    try {
      await api.post('/fractal/experiments', experimentResults);
      addLog(`💾 Experiment saved: ${experimentId}`);
    } catch (error) {
      addLog(`⚠️  Failed to save experiment: ${error.message}`);
    }

    addLog(`🎉 Experiment complete! ${successCount}/${paths.length} paths successful`);
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            🩺 Dr. Bot - Clinical Decision Support
          </h1>
          <p className="text-xl text-gray-300">AI-Augmented Ethical Reasoning for Medicine & Dentistry</p>
          <p className="text-sm text-gray-400 mt-2">LOG3/LOG4 Fractal Analysis Framework</p>
        </div>

        {/* Configuration Panel */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 mb-8 border border-purple-500/20">
          <h2 className="text-2xl font-bold mb-4 text-purple-400">Experiment Configuration</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Problem Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Select Clinical Case</label>
              <select
                value={selectedProblem}
                onChange={(e) => setSelectedProblem(e.target.value)}
                disabled={running}
                className="w-full bg-slate-700 border border-purple-500/30 rounded-lg p-3 text-white disabled:opacity-50"
              >
                {Object.entries(WICKED_PROBLEMS).map(([key, problem]) => (
                  <option key={key} value={key}>
                    {problem.title} ({problem.domain})
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-400 mt-2">
                {WICKED_PROBLEMS[selectedProblem]?.description || 'Select a clinical case'}
              </p>
            </div>

            {/* Mode Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Fractal Mode</label>
              <div className="space-y-3">
                <button
                  onClick={() => setMode('log3')}
                  disabled={running}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    mode === 'log3'
                      ? 'bg-purple-600 border-purple-400'
                      : 'bg-slate-700 border-slate-600 hover:border-purple-500'
                  } disabled:opacity-50`}
                >
                  <div className="font-bold text-lg">LOG3 Mode</div>
                  <div className="text-sm text-gray-300">9 paths (3×3)</div>
                  <div className="text-xs text-gray-400">~2-3 min</div>
                </button>

                <button
                  onClick={() => setMode('log4')}
                  disabled={running}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    mode === 'log4'
                      ? 'bg-purple-600 border-purple-400'
                      : 'bg-slate-700 border-slate-600 hover:border-purple-500'
                  } disabled:opacity-50`}
                >
                  <div className="font-bold text-lg">LOG4 Mode</div>
                  <div className="text-sm text-gray-300">27 paths (3×3×3)</div>
                  <div className="text-xs text-gray-400">~6-8 min</div>
                </button>
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">LLM Model</label>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {Object.keys(MODEL_CONFIGS).map(modelKey => (
                  <button
                    key={modelKey}
                    onClick={() => setSelectedModel(modelKey)}
                    disabled={running}
                    className={`w-full p-2 rounded-lg border-2 transition-all text-left ${
                      selectedModel === modelKey
                        ? 'bg-purple-600 border-purple-400'
                        : 'bg-slate-700 border-slate-600 hover:border-purple-500'
                    } disabled:opacity-50`}
                  >
                    <div className="font-bold text-sm">{MODEL_CONFIGS[modelKey].name}</div>
                    <div className="text-xs text-gray-400">
                      {MODEL_CONFIGS[modelKey].extendedThinking ? 'Extended Thinking 🧠' : 'Standard'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Run Button */}
          <div className="mt-6">
            <button
              onClick={runExperiment}
              disabled={running}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-4 px-8 rounded-lg text-xl transition-all shadow-lg disabled:opacity-50"
            >
              {running ? '⚡ EXPERIMENT RUNNING...' : '🚀 RUN EXPERIMENT'}
            </button>
          </div>
        </div>

        {/* Progress Panel */}
        {running && (
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 mb-8 border border-purple-500/20">
            <h2 className="text-2xl font-bold mb-4 text-purple-400">Progress</h2>

            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Path {progress.current} of {progress.total}</span>
                <span>{Math.round((progress.current / progress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-400">{timing.batch}ms</div>
                <div className="text-xs text-gray-400">BATCH</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-400">{timing.elapsed}s</div>
                <div className="text-xs text-gray-400">ELAPSED</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-400">{timing.eta}s</div>
                <div className="text-xs text-gray-400">ETA</div>
              </div>
            </div>

            <div className="mt-4 bg-slate-900/80 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-xs">
              {log.slice(-10).map((entry, idx) => (
                <div key={idx} className="text-gray-300 mb-1">{entry}</div>
              ))}
            </div>
          </div>
        )}

        {/* Results Panel */}
        {results && (
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 mb-8 border border-purple-500/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-purple-400">Results</h2>
              <div className="flex gap-2">
                <button
                  onClick={downloadJSON}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                >
                  💾 JSON
                </button>
                <button
                  onClick={generateReport}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                >
                  📄 PDF Report
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400">Word Divergence</div>
                <div className="text-3xl font-bold text-purple-400">
                  {(results.metrics.wordDivergence * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400">Conclusion Convergence</div>
                <div className="text-3xl font-bold text-pink-400">
                  {(results.metrics.conclusionConvergence * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400">Yama Score (Mean)</div>
                <div className="text-3xl font-bold text-purple-400">
                  {results.metrics.yamaStats.mean.toFixed(3)}
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 rounded-lg p-4 mb-4">
              <div className="font-bold mb-2">Dominant Conclusion</div>
              <div className="text-2xl text-purple-400">{results.metrics.dominantConclusion}</div>
            </div>

            <div className="bg-slate-900/80 rounded-lg p-4 mb-4">
              <div className="font-bold mb-2">Conclusion Distribution</div>
              <pre className="text-xs text-gray-300">
                {JSON.stringify(results.metrics.conclusionDistribution, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
