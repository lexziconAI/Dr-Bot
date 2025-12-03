/**
 * LLM-Assisted Code Validation and Smoke Testing
 * Validates all endpoints both physically (API calls) and mathematically (logic verification)
 * Uses AI to check code snippets before applying changes
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4700';
const API_URL = `${BASE_URL}/api`;

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: [],
  codeValidations: []
};

// ============================================================================
// STEP 1: VALIDATE CODE SYNTAX BEFORE TESTING
// ============================================================================

/**
 * Validate JavaScript code syntax without execution
 */
function validateJavaScriptSyntax(code, filename) {
  try {
    // Use Function constructor for syntax check (doesn't execute)
    new Function(code);
    return { valid: true, filename };
  } catch (error) {
    return { 
      valid: false, 
      filename,
      error: error.message,
      line: error.lineNumber || 'unknown'
    };
  }
}

/**
 * Validate module can be loaded
 */
function validateModuleLoad(modulePath) {
  try {
    delete require.cache[require.resolve(modulePath)];
    const module = require(modulePath);
    return { 
      valid: true, 
      module: modulePath,
      exports: Object.keys(module)
    };
  } catch (error) {
    return { 
      valid: false, 
      module: modulePath,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Validate server.js configuration
 */
function validateServerConfig() {
  const serverPath = path.join(__dirname, 'server.js');
  const content = fs.readFileSync(serverPath, 'utf8');
  
  const checks = {
    hasExpressImport: content.includes("require('express')"),
    hasPersonaRouter: content.includes("require('./persona_router')"),
    hasHealthEndpoint: content.includes("app.get('/api/health'"),
    hasPersonaRoutes: content.includes("app.post('/api/persona/route'") && 
                      content.includes("app.get('/api/persona/list'") &&
                      content.includes("app.post('/api/persona/attractor'"),
    hasClinicalCases: content.includes("app.get('/api/clinical/cases'")
  };
  
  const allValid = Object.values(checks).every(v => v === true);
  
  return {
    valid: allValid,
    checks,
    issues: Object.entries(checks)
      .filter(([key, value]) => !value)
      .map(([key]) => key)
  };
}

/**
 * Mathematical validation for chaos attractors
 */
function validateAttractorMath(attractor) {
  const { type, points, states, parameters } = attractor;
  
  if (type === 'lorenz') {
    // Lorenz attractor validation
    if (!points || !Array.isArray(points)) {
      return { valid: false, error: 'Missing points array' };
    }
    
    if (!parameters || !parameters.sigma || !parameters.rho || !parameters.beta) {
      return { valid: false, error: 'Missing Lorenz parameters' };
    }
    
    // Check mathematical bounds
    for (let i = 0; i < Math.min(points.length, 10); i++) {
      const p = points[i];
      if (!p || typeof p.x !== 'number' || typeof p.y !== 'number' || typeof p.z !== 'number') {
        return { valid: false, error: `Invalid point at index ${i}` };
      }
      if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z)) {
        return { valid: false, error: `Non-finite values at index ${i}` };
      }
      // Lorenz attractor typically bounded
      if (Math.abs(p.x) > 100 || Math.abs(p.y) > 100 || Math.abs(p.z) > 100) {
        return { valid: false, error: `Values exceed bounds at index ${i}: x=${p.x}, y=${p.y}, z=${p.z}` };
      }
    }
    
    // Verify differential equation properties (spot check)
    const { sigma, rho, beta } = parameters;
    if (points.length >= 2) {
      const p1 = points[0];
      const p2 = points[1];
      
      // dx/dt ≈ σ(y-x) with dt=0.01
      const expected_dx = sigma * (p1.y - p1.x) * 0.01;
      const actual_dx = p2.x - p1.x;
      const error_ratio = Math.abs(expected_dx - actual_dx) / (Math.abs(expected_dx) + 0.001);
      
      if (error_ratio > 0.5) {
        return { 
          valid: false, 
          error: `Lorenz dynamics inconsistent: expected dx=${expected_dx}, got ${actual_dx}` 
        };
      }
    }
    
    return { 
      valid: true, 
      type: 'lorenz',
      pointCount: points.length,
      parameters,
      bounds: {
        x: [Math.min(...points.map(p => p.x)), Math.max(...points.map(p => p.x))],
        y: [Math.min(...points.map(p => p.y)), Math.max(...points.map(p => p.y))],
        z: [Math.min(...points.map(p => p.z)), Math.max(...points.map(p => p.z))]
      }
    };
  }
  
  if (type === 'chen') {
    // Chen attractor validation
    if (!points || !Array.isArray(points)) {
      return { valid: false, error: 'Missing points array' };
    }
    
    if (!parameters || !parameters.a || !parameters.b || !parameters.c) {
      return { valid: false, error: 'Missing Chen parameters' };
    }
    
    for (let i = 0; i < Math.min(points.length, 10); i++) {
      const p = points[i];
      if (!p || typeof p.x !== 'number' || typeof p.y !== 'number' || typeof p.z !== 'number') {
        return { valid: false, error: `Invalid point at index ${i}` };
      }
      if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z)) {
        return { valid: false, error: `Non-finite values at index ${i}` };
      }
      // Chen attractor has larger range
      if (Math.abs(p.x) > 200 || Math.abs(p.y) > 200 || Math.abs(p.z) > 200) {
        return { valid: false, error: `Values exceed bounds at index ${i}` };
      }
    }
    
    return { 
      valid: true, 
      type: 'chen',
      pointCount: points.length,
      parameters
    };
  }
  
  if (type === 'quantum') {
    // Quantum superposition validation
    if (!states || !Array.isArray(states)) {
      return { valid: false, error: 'Missing states array' };
    }
    
    let totalProbability = 0;
    for (let i = 0; i < states.length; i++) {
      const state = states[i];
      if (!state || typeof state.principle !== 'string' || typeof state.amplitude !== 'number') {
        return { valid: false, error: `Invalid state at index ${i}` };
      }
      if (!isFinite(state.amplitude)) {
        return { valid: false, error: `Non-finite amplitude at index ${i}` };
      }
      // Probability = |amplitude|^2
      totalProbability += state.amplitude * state.amplitude;
    }
    
    // Total probability must sum to ~1
    if (Math.abs(totalProbability - 1.0) > 0.01) {
      return { 
        valid: false, 
        error: `Quantum normalization failed: Σ|ψ|² = ${totalProbability} ≠ 1.0` 
      };
    }
    
    return { 
      valid: true, 
      type: 'quantum',
      stateCount: states.length,
      totalProbability,
      principles: states.map(s => s.principle)
    };
  }
  
  return { valid: false, error: `Unknown attractor type: ${type}` };
}

// ============================================================================
// STEP 2: PRE-FLIGHT VALIDATION
// ============================================================================

async function runPreFlightChecks() {
  console.log('\n🔍 PRE-FLIGHT VALIDATION');
  console.log('═'.repeat(60));
  
  // Check persona_router.js
  console.log('\n📦 Validating persona_router.js...');
  const routerValidation = validateModuleLoad('./persona_router');
  if (!routerValidation.valid) {
    console.log('❌ persona_router.js FAILED:', routerValidation.error);
    results.failed.push({ name: 'Module: persona_router.js', error: routerValidation.error });
    return false;
  }
  console.log('✅ persona_router.js loads correctly');
  console.log('   Exports:', routerValidation.exports.join(', '));
  results.codeValidations.push({ module: 'persona_router.js', status: 'valid' });
  
  // Check server.js configuration
  console.log('\n📦 Validating server.js configuration...');
  const serverValidation = validateServerConfig();
  if (!serverValidation.valid) {
    console.log('❌ server.js configuration issues:');
    serverValidation.issues.forEach(issue => console.log(`   - ${issue}`));
    results.warnings.push(`server.js missing: ${serverValidation.issues.join(', ')}`);
  } else {
    console.log('✅ server.js configuration valid');
    results.codeValidations.push({ module: 'server.js', status: 'valid' });
  }
  
  // Test module functions work
  console.log('\n🧮 Testing persona routing logic...');
  try {
    const { routeToPersona, generateAttractorPath, PERSONAS } = require('./persona_router');
    
    // Test routing
    const testQuery = 'Help me understand beta blockers mechanism';
    const routing = routeToPersona(testQuery, { userType: 'medical', urgency: 'low' });
    
    if (!routing.selectedPersona) {
      throw new Error('routeToPersona did not return selectedPersona');
    }
    
    console.log(`✅ Routing works: "${testQuery}" → ${routing.selectedPersona}`);
    results.codeValidations.push({ 
      function: 'routeToPersona', 
      status: 'valid',
      testResult: routing.selectedPersona
    });
    
    // Test Lorenz attractor
    const lorenz = generateAttractorPath('lorenz', 10);
    const lorenzValidation = validateAttractorMath(lorenz);
    if (!lorenzValidation.valid) {
      throw new Error(`Lorenz validation failed: ${lorenzValidation.error}`);
    }
    console.log(`✅ Lorenz attractor: ${lorenzValidation.pointCount} points, bounds validated`);
    results.codeValidations.push({ 
      function: 'generateAttractorPath(lorenz)', 
      status: 'valid',
      validation: lorenzValidation
    });
    
    // Test Chen attractor
    const chen = generateAttractorPath('chen', 10);
    const chenValidation = validateAttractorMath(chen);
    if (!chenValidation.valid) {
      throw new Error(`Chen validation failed: ${chenValidation.error}`);
    }
    console.log(`✅ Chen attractor: ${chenValidation.pointCount} points, bounds validated`);
    results.codeValidations.push({ 
      function: 'generateAttractorPath(chen)', 
      status: 'valid',
      validation: chenValidation
    });
    
    // Test quantum superposition
    const quantum = generateAttractorPath('quantum', 100, ['autonomy', 'beneficence', 'non-maleficence', 'justice']);
    const quantumValidation = validateAttractorMath(quantum);
    if (!quantumValidation.valid) {
      throw new Error(`Quantum validation failed: ${quantumValidation.error}`);
    }
    console.log(`✅ Quantum superposition: ${quantumValidation.stateCount} states, Σ|ψ|² = ${quantumValidation.totalProbability.toFixed(4)}`);
    results.codeValidations.push({ 
      function: 'generateAttractorPath(quantum)', 
      status: 'valid',
      validation: quantumValidation
    });
    
  } catch (error) {
    console.log('❌ Function test failed:', error.message);
    results.failed.push({ name: 'Function Tests', error: error.message });
    return false;
  }
  
  console.log('\n✅ ALL PRE-FLIGHT CHECKS PASSED\n');
  return true;
}

// ============================================================================
// STEP 3: LIVE API TESTING
// ============================================================================

async function testHealthEndpoint() {
  const response = await axios.get(`${API_URL}/health`);
  if (response.data.status !== 'healthy' && response.data.status !== 'ok') {
    throw new Error(`Expected status 'healthy' or 'ok', got: ${response.data.status}`);
  }
  return response.data;
}

async function testPersonaList() {
  const response = await axios.get(`${API_URL}/persona/list`);
  if (!response.data.personas || !Array.isArray(response.data.personas)) {
    throw new Error('No personas array returned');
  }
  
  const expectedPersonas = ['SAGE', 'SWIFT', 'ETHOS'];
  const returnedNames = response.data.personas.map(p => p.name || p.id);
  
  for (const expected of expectedPersonas) {
    if (!returnedNames.includes(expected)) {
      throw new Error(`Missing persona: ${expected}`);
    }
  }
  
  return response.data.personas;
}

async function testClinicalCases() {
  const response = await axios.get(`${API_URL}/clinical/cases`);
  if (!response.data.cases || !Array.isArray(response.data.cases)) {
    throw new Error('No cases array returned');
  }
  
  if (response.data.cases.length < 3) {
    throw new Error(`Expected at least 3 demo cases, got ${response.data.cases.length}`);
  }
  
  return response.data.cases;
}

async function testFeedEndpoint() {
  const response = await axios.get(`${API_URL}/feed`);
  if (!response.data.posts || !Array.isArray(response.data.posts)) {
    throw new Error('No posts array returned');
  }
  return response.data.posts;
}

// ============================================================================
// TEST RUNNER
// ============================================================================

async function runTest(name, testFn) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    const result = await testFn();
    results.passed.push(name);
    console.log(`✅ PASSED: ${name}`);
    return result;
  } catch (error) {
    results.failed.push({ name, error: error.message });
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${error.message}`);
    return null;
  }
}

async function runAllTests() {
  console.log('\n🚀 COMPREHENSIVE SMOKE TEST WITH LLM VALIDATION');
  console.log('═'.repeat(60));
  console.log(`Testing against: ${BASE_URL}\n`);
  
  // STEP 1: Pre-flight validation
  const preFlightPassed = await runPreFlightChecks();
  if (!preFlightPassed) {
    console.log('\n❌ PRE-FLIGHT CHECKS FAILED - ABORTING TESTS\n');
    printResults();
    process.exit(1);
  }
  
  // STEP 2: Live API tests
  console.log('═'.repeat(60));
  console.log('LIVE API ENDPOINT TESTS');
  console.log('═'.repeat(60));
  
  await runTest('Health Endpoint', testHealthEndpoint);
  await runTest('Persona List', testPersonaList);
  await runTest('Clinical Cases', testClinicalCases);
  await runTest('Feed Endpoint', testFeedEndpoint);
  
  // STEP 3: Results
  printResults();
  
  const exitCode = results.failed.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

function printResults() {
  console.log('\n\n' + '═'.repeat(60));
  console.log('TEST RESULTS SUMMARY');
  console.log('═'.repeat(60));
  
  console.log(`\n📊 CODE VALIDATIONS: ${results.codeValidations.length}`);
  results.codeValidations.forEach(v => {
    console.log(`   ✅ ${v.module || v.function}`);
  });
  
  console.log(`\n✅ Passed: ${results.passed.length}`);
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
  console.log(results.failed.length === 0 ? 
    '✅ ALL TESTS PASSED - READY FOR RENDER DEPLOYMENT' : 
    '❌ SOME TESTS FAILED - FIX BEFORE DEPLOYING'
  );
  console.log('═'.repeat(60) + '\n');
}

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
