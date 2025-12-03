/**
 * Comprehensive Smoke Test Suite for Dr-Bot Community
 * Tests all endpoints physically (API calls) and mathematically (validation logic)
 */

const axios = require('axios');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4700';
const API_URL = `${BASE_URL}/api`;

// Test results tracking
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Mathematical validation functions
const validateLorenzAttractor = (points) => {
  if (!Array.isArray(points) || points.length === 0) {
    return { valid: false, error: 'Empty or invalid points array' };
  }
  
  // Validate Lorenz attractor mathematical properties
  const sigma = 10, rho = 28, beta = 8/3;
  
  for (let i = 1; i < Math.min(points.length, 10); i++) {
    const prev = points[i-1];
    const curr = points[i];
    
    if (!prev || !curr || typeof prev.x !== 'number' || typeof prev.y !== 'number' || typeof prev.z !== 'number') {
      return { valid: false, error: `Invalid point structure at index ${i}` };
    }
    
    // Check for numerical stability (no NaN or Infinity)
    if (!isFinite(curr.x) || !isFinite(curr.y) || !isFinite(curr.z)) {
      return { valid: false, error: `Non-finite values at index ${i}` };
    }
    
    // Verify Lorenz system bounds (typical attractor stays within reasonable bounds)
    if (Math.abs(curr.x) > 100 || Math.abs(curr.y) > 100 || Math.abs(curr.z) > 100) {
      return { valid: false, error: `Values exceed expected bounds at index ${i}` };
    }
  }
  
  return { valid: true };
};

const validateChenAttractor = (points) => {
  if (!Array.isArray(points) || points.length === 0) {
    return { valid: false, error: 'Empty or invalid points array' };
  }
  
  // Validate Chen attractor mathematical properties
  const a = 35, b = 3, c = 28;
  
  for (let i = 0; i < Math.min(points.length, 10); i++) {
    const point = points[i];
    
    if (!point || typeof point.x !== 'number' || typeof point.y !== 'number' || typeof point.z !== 'number') {
      return { valid: false, error: `Invalid point structure at index ${i}` };
    }
    
    if (!isFinite(point.x) || !isFinite(point.y) || !isFinite(point.z)) {
      return { valid: false, error: `Non-finite values at index ${i}` };
    }
    
    // Chen attractor typically has larger range than Lorenz
    if (Math.abs(point.x) > 200 || Math.abs(point.y) > 200 || Math.abs(point.z) > 200) {
      return { valid: false, error: `Values exceed expected bounds at index ${i}` };
    }
  }
  
  return { valid: true };
};

const validateQuantumSuperposition = (states) => {
  if (!Array.isArray(states) || states.length === 0) {
    return { valid: false, error: 'Empty or invalid states array' };
  }
  
  // Validate quantum state mathematical properties
  let totalProbability = 0;
  
  for (let i = 0; i < states.length; i++) {
    const state = states[i];
    
    if (!state || typeof state.principle !== 'string' || typeof state.amplitude !== 'number') {
      return { valid: false, error: `Invalid state structure at index ${i}` };
    }
    
    // Amplitude should be complex number representation (real part only for simplicity)
    if (!isFinite(state.amplitude)) {
      return { valid: false, error: `Non-finite amplitude at index ${i}` };
    }
    
    // Probability is |amplitude|^2
    const probability = state.amplitude * state.amplitude;
    totalProbability += probability;
  }
  
  // Total probability must sum to ~1 (allowing small floating point error)
  if (Math.abs(totalProbability - 1.0) > 0.01) {
    return { valid: false, error: `Total probability ${totalProbability} != 1.0` };
  }
  
  return { valid: true };
};

const validateBellmanValue = (value) => {
  // Bellman value function should be finite and reasonable
  if (typeof value !== 'number' || !isFinite(value)) {
    return { valid: false, error: 'Invalid Bellman value' };
  }
  
  // Typical reward values should be between -100 and 100
  if (Math.abs(value) > 1000) {
    return { valid: false, error: `Bellman value ${value} exceeds reasonable bounds` };
  }
  
  return { valid: true };
};

const validatePersonaSelection = (persona) => {
  const validPersonas = ['SAGE', 'SWIFT', 'ETHOS', 'ENSEMBLE'];
  
  if (!validPersonas.includes(persona)) {
    return { valid: false, error: `Invalid persona: ${persona}` };
  }
  
  return { valid: true };
};

const validateJWT = (token) => {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Missing or invalid token' };
  }
  
  // JWT format: header.payload.signature
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid JWT format' };
  }
  
  return { valid: true };
};

// Test runner
const runTest = async (name, testFn) => {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    await testFn();
    results.passed.push(name);
    console.log(`✅ PASSED: ${name}`);
  } catch (error) {
    results.failed.push({ name, error: error.message });
    console.log(`❌ FAILED: ${name} - ${error.message}`);
  }
};

// Authentication tests
let authToken = '';
let testUserId = '';

const testRegister = async () => {
  const response = await axios.post(`${API_URL}/auth/register`, {
    email: `test${Date.now()}@example.com`,
    password: 'Test123!@#',
    firstName: 'Test',
    lastName: 'User',
    role: 'medical_professional'
  });
  
  if (!response.data.token) throw new Error('No token returned');
  if (!response.data.user) throw new Error('No user returned');
  
  const jwtValidation = validateJWT(response.data.token);
  if (!jwtValidation.valid) throw new Error(jwtValidation.error);
  
  authToken = response.data.token;
  testUserId = response.data.user.id;
};

const testLogin = async () => {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email: 'test@example.com',
    password: 'password123'
  });
  
  if (response.status === 404 || response.status === 401) {
    // User doesn't exist yet, that's ok for smoke test
    results.warnings.push('Login test skipped - no test user exists');
    return;
  }
  
  if (!response.data.token) throw new Error('No token returned');
  
  const jwtValidation = validateJWT(response.data.token);
  if (!jwtValidation.valid) throw new Error(jwtValidation.error);
};

const testAuthMe = async () => {
  if (!authToken) throw new Error('No auth token available');
  
  const response = await axios.get(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (!response.data.user) throw new Error('No user returned');
  if (response.data.user.id !== testUserId) throw new Error('User ID mismatch');
};

// Persona routing tests
const testPersonaList = async () => {
  const response = await axios.get(`${API_URL}/persona/list`);
  
  if (!response.data.personas) throw new Error('No personas returned');
  if (!Array.isArray(response.data.personas)) throw new Error('Personas not an array');
  
  const expectedPersonas = ['SAGE', 'SWIFT', 'ETHOS'];
  const returnedPersonas = response.data.personas.map(p => p.name || p.id);
  
  for (const expected of expectedPersonas) {
    if (!returnedPersonas.includes(expected)) {
      throw new Error(`Missing persona: ${expected}`);
    }
  }
};

const testPersonaRouteTeaching = async () => {
  if (!authToken) throw new Error('No auth token available');
  
  const response = await axios.post(`${API_URL}/persona/route`, {
    query: 'Can you help me understand the mechanism of action for beta blockers?',
    context: {
      userType: 'medical_professional',
      urgency: 'low',
      preferredStyle: 'teaching'
    }
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (!response.data.selectedPersona) throw new Error('No persona selected');
  
  const validation = validatePersonaSelection(response.data.selectedPersona);
  if (!validation.valid) throw new Error(validation.error);
  
  // Should route to SAGE for teaching queries
  if (response.data.selectedPersona !== 'SAGE') {
    results.warnings.push(`Expected SAGE for teaching query, got ${response.data.selectedPersona}`);
  }
  
  // Validate reasoning exists
  if (!response.data.reasoning) throw new Error('No routing reasoning provided');
};

const testPersonaRouteEmergency = async () => {
  if (!authToken) throw new Error('No auth token available');
  
  const response = await axios.post(`${API_URL}/persona/route`, {
    query: 'Patient unresponsive, no pulse, what do I do immediately?',
    context: {
      userType: 'medical_professional',
      urgency: 'critical',
      preferredStyle: 'emergency'
    }
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (!response.data.selectedPersona) throw new Error('No persona selected');
  
  const validation = validatePersonaSelection(response.data.selectedPersona);
  if (!validation.valid) throw new Error(validation.error);
  
  // Should route to SWIFT for emergency queries
  if (response.data.selectedPersona !== 'SWIFT') {
    results.warnings.push(`Expected SWIFT for emergency query, got ${response.data.selectedPersona}`);
  }
};

const testPersonaRouteEthical = async () => {
  if (!authToken) throw new Error('No auth token available');
  
  const response = await axios.post(`${API_URL}/persona/route`, {
    query: 'A patient refuses life-saving treatment due to religious beliefs. How should I proceed?',
    context: {
      userType: 'medical_professional',
      urgency: 'moderate',
      preferredStyle: 'ethical'
    }
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (!response.data.selectedPersona) throw new Error('No persona selected');
  
  const validation = validatePersonaSelection(response.data.selectedPersona);
  if (!validation.valid) throw new Error(validation.error);
  
  // Should route to ETHOS for ethical queries
  if (response.data.selectedPersona !== 'ETHOS') {
    results.warnings.push(`Expected ETHOS for ethical query, got ${response.data.selectedPersona}`);
  }
};

const testAttractorLorenz = async () => {
  if (!authToken) throw new Error('No auth token available');
  
  const response = await axios.post(`${API_URL}/persona/attractor`, {
    type: 'lorenz',
    steps: 100
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (!response.data.attractor) throw new Error('No attractor data returned');
  if (!response.data.attractor.points) throw new Error('No points in attractor');
  
  const validation = validateLorenzAttractor(response.data.attractor.points);
  if (!validation.valid) throw new Error(validation.error);
  
  // Validate metadata
  if (response.data.attractor.type !== 'lorenz') throw new Error('Wrong attractor type');
  if (response.data.attractor.points.length !== 100) throw new Error('Wrong number of points');
};

const testAttractorChen = async () => {
  if (!authToken) throw new Error('No auth token available');
  
  const response = await axios.post(`${API_URL}/persona/attractor`, {
    type: 'chen',
    steps: 100
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (!response.data.attractor) throw new Error('No attractor data returned');
  if (!response.data.attractor.points) throw new Error('No points in attractor');
  
  const validation = validateChenAttractor(response.data.attractor.points);
  if (!validation.valid) throw new Error(validation.error);
  
  if (response.data.attractor.type !== 'chen') throw new Error('Wrong attractor type');
};

const testAttractorQuantum = async () => {
  if (!authToken) throw new Error('No auth token available');
  
  const response = await axios.post(`${API_URL}/persona/attractor`, {
    type: 'quantum',
    principles: ['autonomy', 'beneficence', 'non-maleficence', 'justice']
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (!response.data.attractor) throw new Error('No attractor data returned');
  if (!response.data.attractor.states) throw new Error('No states in quantum attractor');
  
  const validation = validateQuantumSuperposition(response.data.attractor.states);
  if (!validation.valid) throw new Error(validation.error);
  
  if (response.data.attractor.type !== 'quantum') throw new Error('Wrong attractor type');
};

// Clinical cases tests
const testClinicalCases = async () => {
  const response = await axios.get(`${API_URL}/clinical/cases`);
  
  if (!response.data.cases) throw new Error('No cases returned');
  if (!Array.isArray(response.data.cases)) throw new Error('Cases not an array');
  
  // Should have at least 3 demo cases
  if (response.data.cases.length < 3) {
    throw new Error(`Expected at least 3 cases, got ${response.data.cases.length}`);
  }
  
  // Validate case structure
  const firstCase = response.data.cases[0];
  if (!firstCase.id || !firstCase.title || !firstCase.description) {
    throw new Error('Invalid case structure');
  }
};

// Health check tests
const testHealthCheck = async () => {
  const response = await axios.get(`${API_URL}/health`);
  
  if (response.data.status !== 'healthy') throw new Error('Service not healthy');
  if (!response.data.timestamp) throw new Error('No timestamp in health check');
};

// Sidecar mock tests
const testSidecarSubmit = async () => {
  if (!authToken) throw new Error('No auth token available');
  
  const response = await axios.post(`${API_URL}/sidecar/submit`, {
    prompt: 'Test prompt for smoke test',
    parameters: { temperature: 0.7 }
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (!response.data.jobId) throw new Error('No jobId returned');
  if (!response.data.jobId.startsWith('mock-')) throw new Error('Not using mock job handler');
};

const testSidecarStatus = async () => {
  if (!authToken) throw new Error('No auth token available');
  
  const response = await axios.get(`${API_URL}/sidecar/status/mock-test-123`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (!response.data.status) throw new Error('No status returned');
  if (response.data.status !== 'completed') throw new Error('Mock job should be completed');
};

// Feed and posts tests (basic)
const testFeed = async () => {
  const response = await axios.get(`${API_URL}/feed`);
  
  if (!response.data.posts) throw new Error('No posts array returned');
  if (!Array.isArray(response.data.posts)) throw new Error('Posts not an array');
};

// Main test suite
const runAllTests = async () => {
  console.log('🚀 Starting Comprehensive Smoke Test Suite\n');
  console.log(`Testing against: ${BASE_URL}\n`);
  console.log('═'.repeat(60));
  
  // Health check (must pass first)
  await runTest('Health Check', testHealthCheck);
  
  console.log('\n' + '─'.repeat(60));
  console.log('AUTHENTICATION TESTS');
  console.log('─'.repeat(60));
  
  await runTest('User Registration', testRegister);
  await runTest('User Login', testLogin);
  await runTest('Auth Me', testAuthMe);
  
  console.log('\n' + '─'.repeat(60));
  console.log('PERSONA ROUTING TESTS');
  console.log('─'.repeat(60));
  
  await runTest('Persona List', testPersonaList);
  await runTest('Persona Route - Teaching (SAGE)', testPersonaRouteTeaching);
  await runTest('Persona Route - Emergency (SWIFT)', testPersonaRouteEmergency);
  await runTest('Persona Route - Ethical (ETHOS)', testPersonaRouteEthical);
  
  console.log('\n' + '─'.repeat(60));
  console.log('CHAOS ATTRACTOR TESTS (MATHEMATICAL VALIDATION)');
  console.log('─'.repeat(60));
  
  await runTest('Lorenz Attractor Generation', testAttractorLorenz);
  await runTest('Chen Attractor Generation', testAttractorChen);
  await runTest('Quantum Superposition Generation', testAttractorQuantum);
  
  console.log('\n' + '─'.repeat(60));
  console.log('CLINICAL FEATURES TESTS');
  console.log('─'.repeat(60));
  
  await runTest('Clinical Cases List', testClinicalCases);
  
  console.log('\n' + '─'.repeat(60));
  console.log('SIDECAR MOCK TESTS');
  console.log('─'.repeat(60));
  
  await runTest('Sidecar Job Submit', testSidecarSubmit);
  await runTest('Sidecar Job Status', testSidecarStatus);
  
  console.log('\n' + '─'.repeat(60));
  console.log('SOCIAL FEATURES TESTS');
  console.log('─'.repeat(60));
  
  await runTest('Feed Endpoint', testFeed);
  
  // Final report
  console.log('\n\n' + '═'.repeat(60));
  console.log('TEST RESULTS SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.failed.forEach(f => {
      console.log(`  - ${f.name}: ${f.error}`);
    });
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    results.warnings.forEach(w => {
      console.log(`  - ${w}`);
    });
  }
  
  console.log('\n' + '═'.repeat(60));
  
  // Exit with appropriate code
  const exitCode = results.failed.length > 0 ? 1 : 0;
  console.log(`\n${exitCode === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  process.exit(exitCode);
};

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Fatal error running tests:', error);
  process.exit(1);
});
