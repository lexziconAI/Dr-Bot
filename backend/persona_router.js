/**
 * Persona Router - Routes clinical queries to appropriate AI persona
 * Based on LOG³/LOG⁴ chaos theory and Bellman optimization
 */

/**
 * Three core personas based on red team analysis
 */
const PERSONAS = {
  SAGE: {
    id: 'sage',
    name: 'SAGE',
    description: 'Clinical coaching with Socratic method',
    model: 'llama-3.3-70b-versatile',
    provider: 'groq',
    context: 'teaching',
    responseTime: 'moderate',
    chaosAttractor: 'lorenz',
    temperature: 0.7,
    systemPrompt: `You are SAGE, a clinical teaching AI using the Socratic method.
Your role is to guide learners through clinical reasoning by asking thought-provoking questions.
Never give direct answers - help them discover insights through dialogue.
Consider multiple perspectives and long-term learning goals.`
  },
  
  SWIFT: {
    id: 'swift',
    name: 'SWIFT',
    description: 'Emergency triage and immediate action',
    model: 'llama-3.3-70b-versatile',
    provider: 'groq',
    context: 'emergency',
    responseTime: 'fast',
    chaosAttractor: 'chen',
    temperature: 0.3,
    systemPrompt: `You are SWIFT, an emergency triage AI optimized for rapid decision-making.
Provide clear, actionable protocols immediately.
Prioritize life-threatening conditions first.
Use ABC approach: Airway, Breathing, Circulation.
Be direct, concise, and evidence-based.`
  },
  
  ETHOS: {
    id: 'ethos',
    name: 'ETHOS',
    description: 'Ethical analysis and stakeholder considerations',
    model: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    context: 'ethical',
    responseTime: 'deep',
    chaosAttractor: 'quantum',
    temperature: 0.8,
    systemPrompt: `You are ETHOS, an ethical reasoning AI analyzing complex moral dilemmas.
Apply the four principles: Autonomy, Beneficence, Non-maleficence, Justice.
Consider all stakeholder perspectives and cultural contexts.
Present multiple ethical frameworks and their implications.
Help users navigate moral uncertainty with nuance.`
  }
};

/**
 * Route query to appropriate persona using LOG³ analysis
 */
function routeToPersona(query, context = {}) {
  const { 
    urgency = 'normal', 
    userType = 'medical', 
    topic = '',
    history = []
  } = context;
  
  // LOG³ Layer 1: Pattern Recognition
  const patterns = analyzePatterns(query);
  
  // LOG³ Layer 2: Context Integration
  const contextScore = calculateContextScore(patterns, urgency, userType);
  
  // LOG³ Layer 3: Persona Selection
  const selectedPersona = selectPersona(contextScore, patterns);
  
  return {
    selectedPersona: selectedPersona,
    reasoning: contextScore,
    confidence: calculateConfidence(contextScore),
    patterns: patterns,
    fallback: determineFallback(selectedPersona, patterns)
  };
}

/**
 * Pattern recognition using keyword analysis
 */
function analyzePatterns(query) {
  const lowerQuery = query.toLowerCase();
  
  return {
    emergency: hasEmergencyKeywords(lowerQuery),
    ethical: hasEthicalKeywords(lowerQuery),
    teaching: hasTeachingKeywords(lowerQuery),
    technical: hasTechnicalKeywords(lowerQuery),
    uncertainty: hasUncertaintyMarkers(lowerQuery)
  };
}

function hasEmergencyKeywords(text) {
  const keywords = [
    'urgent', 'emergency', 'immediate', 'stat', 'critical',
    'trauma', 'cardiac arrest', 'anaphylaxis', 'stroke',
    'bleeding', 'unconscious', 'shock', 'crash'
  ];
  return keywords.some(kw => text.includes(kw));
}

function hasEthicalKeywords(text) {
  const keywords = [
    'ethical', 'moral', 'should i', 'right thing', 'dilemma',
    'consent', 'autonomy', 'conflict', 'disagreement',
    'family wants', 'patient refuses', 'end of life'
  ];
  return keywords.some(kw => text.includes(kw));
}

function hasTeachingKeywords(text) {
  const keywords = [
    'why', 'how', 'explain', 'understand', 'learn',
    'differential', 'reasoning', 'thought process',
    'teach me', 'help me think', 'walk through'
  ];
  return keywords.some(kw => text.includes(kw));
}

function hasTechnicalKeywords(text) {
  const keywords = [
    'protocol', 'guideline', 'dose', 'medication',
    'procedure', 'algorithm', 'steps'
  ];
  return keywords.some(kw => text.includes(kw));
}

function hasUncertaintyMarkers(text) {
  const markers = ['?', 'uncertain', 'not sure', 'confused', 'unclear'];
  return markers.some(m => text.includes(m));
}

/**
 * Calculate context scores for persona selection
 */
function calculateContextScore(patterns, urgency, userType) {
  const scores = {
    sage: 0,
    swift: 0,
    ethos: 0
  };
  
  // Pattern-based scoring
  if (patterns.teaching) scores.sage += 40;
  if (patterns.uncertainty) scores.sage += 20;
  if (patterns.emergency) scores.swift += 50;
  if (patterns.technical) scores.swift += 20;
  if (patterns.ethical) scores.ethos += 50;
  
  // Urgency modifiers
  if (urgency === 'emergency') {
    scores.swift += 30;
    scores.sage -= 20;
  } else if (urgency === 'routine') {
    scores.sage += 20;
  }
  
  // User type modifiers
  if (userType === 'public') {
    scores.swift += 10; // Public needs clear guidance
    scores.sage += 10;  // But also education
  } else if (userType === 'medical') {
    scores.sage += 15; // Medical professionals value teaching
  }
  
  return scores;
}

/**
 * Select persona based on scores
 */
function selectPersona(scores, patterns) {
  const maxScore = Math.max(scores.sage, scores.swift, scores.ethos);
  
  // If scores are close (within 10 points), use ensemble mode
  const closeScores = Object.values(scores).filter(s => Math.abs(s - maxScore) < 10);
  if (closeScores.length > 1) {
    return 'ENSEMBLE'; // Multiple personas collaborate
  }
  
  // Select highest scoring persona - return NAME not object
  if (scores.swift === maxScore) return 'SWIFT';
  if (scores.ethos === maxScore) return 'ETHOS';
  return 'SAGE'; // Default to teaching
}

/**
 * Calculate confidence in persona selection
 */
function calculateConfidence(scores) {
  const values = Object.values(scores);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;
  
  // Higher range = more confident selection
  if (range > 30) return 'high';
  if (range > 15) return 'medium';
  return 'low';
}

/**
 * Determine fallback persona if primary fails
 */
function determineFallback(primary, patterns) {
  if (primary === 'SWIFT') return 'SAGE';
  if (primary === 'ETHOS') return 'SAGE';
  return 'SWIFT'; // SAGE fallback is SWIFT for safety
}

/**
 * Bellman optimization for long-term decision quality
 */
function bellmanOptimize(personaHistory, outcomeHistory) {
  // Value function: V(s) = R(s) + γ * max(V(s'))
  // Where s = current persona choice, s' = future states
  
  const gamma = 0.9; // Discount factor for future rewards
  const learningRate = 0.1;
  
  // Calculate rewards from historical outcomes
  const rewards = outcomeHistory.map(outcome => {
    return outcome.userSatisfaction * 0.4 +
           outcome.clinicalAccuracy * 0.4 +
           outcome.safetyScore * 0.2;
  });
  
  // Update value function for each persona
  const values = {
    sage: calculateValue(rewards, 'sage', gamma),
    swift: calculateValue(rewards, 'swift', gamma),
    ethos: calculateValue(rewards, 'ethos', gamma)
  };
  
  return values;
}

function calculateValue(rewards, persona, gamma) {
  // Simple moving average with exponential decay
  let value = 0;
  for (let i = 0; i < rewards.length; i++) {
    value += rewards[i] * Math.pow(gamma, rewards.length - i - 1);
  }
  return value / rewards.length;
}

/**
 * Chaos attractor visualization for decision dynamics
 */
function generateAttractorPath(attractorType, steps = 100, principles = []) {
  if (attractorType === 'lorenz') {
    return lorenzAttractor(steps);
  } else if (attractorType === 'chen') {
    return chenAttractor(steps);
  } else if (attractorType === 'quantum') {
    return quantumSuperposition(principles);
  } else {
    throw new Error(`Unknown attractor type: ${attractorType}`);
  }
}

function lorenzAttractor(steps = 100) {
  // Lorenz system: dx/dt = σ(y-x), dy/dt = x(ρ-z)-y, dz/dt = xy-βz
  const sigma = 10, rho = 28, beta = 8/3;
  const points = [];
  
  let x = 0.1, y = 0, z = 0;
  for (let i = 0; i < steps; i++) {
    const dx = sigma * (y - x);
    const dy = x * (rho - z) - y;
    const dz = x * y - beta * z;
    
    x += dx * 0.01;
    y += dy * 0.01;
    z += dz * 0.01;
    
    points.push({ x, y, z, step: i });
  }
  
  return { type: 'lorenz', points, parameters: { sigma, rho, beta } };
}

function chenAttractor(steps = 100) {
  // Chen system: dx/dt = a(y-x), dy/dt = (c-a)x-xz+cy, dz/dt = xy-bz
  const a = 35, b = 3, c = 28;
  const points = [];
  
  let x = 0.1, y = 0, z = 0;
  for (let i = 0; i < steps; i++) {
    const dx = a * (y - x);
    const dy = (c - a) * x - x * z + c * y;
    const dz = x * y - b * z;
    
    x += dx * 0.01;
    y += dy * 0.01;
    z += dz * 0.01;
    
    points.push({ x, y, z, step: i });
  }
  
  return { type: 'chen', points, parameters: { a, b, c } };
}

function quantumSuperposition(principles = ['autonomy', 'beneficence', 'non-maleficence', 'justice']) {
  // Quantum state superposition for ethical principles
  const states = [];
  const norm = Math.sqrt(principles.length);
  
  for (const principle of principles) {
    const theta = (i / 100) * 2 * Math.PI;
    const alpha = Math.cos(theta);
    const beta = Math.sin(theta);
    const gamma = Math.cos(2 * theta);
    
    // Probability amplitudes
    const prob_autonomy = alpha * alpha;
    const prob_beneficence = beta * beta;
    const prob_justice = gamma * gamma;
    
    points.push({
      autonomy: prob_autonomy,
      beneficence: prob_beneficence,
      justice: prob_justice,
      entanglement: alpha * beta + beta * gamma,
      step: i
    });
  }
  
  return points;
}

module.exports = {
  PERSONAS,
  routeToPersona,
  bellmanOptimize,
  generateAttractorPath
};
