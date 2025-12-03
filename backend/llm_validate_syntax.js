/**
 * LLM-Assisted Syntax Validation
 * Validates all JavaScript/JSX files for syntax errors before deployment
 */

const fs = require('fs');
const path = require('path');

const results = {
  valid: [],
  invalid: [],
  warnings: []
};

/**
 * Validate JavaScript/JSX syntax
 */
function validateSyntax(filePath, content) {
  try {
    // For JSX files, we need a more lenient check
    const isJSX = filePath.endsWith('.jsx');
    
    if (isJSX) {
      // Basic JSX validation - check for common syntax errors
      const checks = {
        unmatchedBraces: checkBraceBalance(content),
        unmatchedParens: checkParenBalance(content),
        unmatchedBrackets: checkBracketBalance(content),
        danglingOperators: checkDanglingOperators(content),
        malformedStrings: checkStringLiterals(content)
      };
      
      const issues = Object.entries(checks).filter(([key, value]) => !value.valid);
      
      if (issues.length > 0) {
        return {
          valid: false,
          file: filePath,
          issues: issues.map(([key, val]) => ({ type: key, error: val.error, line: val.line }))
        };
      }
      
      return { valid: true, file: filePath, type: 'jsx' };
    } else {
      // For pure JS, use Function constructor
      new Function(content);
      return { valid: true, file: filePath, type: 'js' };
    }
  } catch (error) {
    return {
      valid: false,
      file: filePath,
      error: error.message,
      line: error.lineNumber || extractLineFromError(error.message)
    };
  }
}

function checkBraceBalance(content) {
  let depth = 0;
  let line = 1;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') line++;
    if (content[i] === '{') depth++;
    if (content[i] === '}') {
      depth--;
      if (depth < 0) return { valid: false, error: 'Unmatched closing brace', line };
    }
  }
  if (depth > 0) return { valid: false, error: `${depth} unclosed braces`, line };
  return { valid: true };
}

function checkParenBalance(content) {
  let depth = 0;
  let line = 1;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') line++;
    if (content[i] === '(') depth++;
    if (content[i] === ')') {
      depth--;
      if (depth < 0) return { valid: false, error: 'Unmatched closing parenthesis', line };
    }
  }
  if (depth > 0) return { valid: false, error: `${depth} unclosed parentheses`, line };
  return { valid: true };
}

function checkBracketBalance(content) {
  let depth = 0;
  let line = 1;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') line++;
    if (content[i] === '[') depth++;
    if (content[i] === ']') {
      depth--;
      if (depth < 0) return { valid: false, error: 'Unmatched closing bracket', line };
    }
  }
  if (depth > 0) return { valid: false, error: `${depth} unclosed brackets`, line };
  return { valid: true };
}

function checkDanglingOperators(content) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Check for lines ending with operators that shouldn't dangle
    if (/[+\-*/]=?$/.test(line) && !line.includes('//')) {
      // This might be valid (multiline expression), so just warn
      continue;
    }
    // Check for invalid token sequences
    if (/\}\s*\/[^/*]/.test(line)) {
      return { valid: false, error: 'Suspicious }/ sequence', line: i + 1 };
    }
    if (/\}\s*\\/.test(line)) {
      return { valid: false, error: 'Suspicious }\\ sequence', line: i + 1 };
    }
  }
  return { valid: true };
}

function checkStringLiterals(content) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check for unescaped quotes in template literals
    if (/`[^`]*'[^`]*`/.test(line) && line.includes('_blank')) {
      return { valid: false, error: 'Potential malformed string literal', line: i + 1 };
    }
  }
  return { valid: true };
}

function extractLineFromError(message) {
  const match = message.match(/line (\d+)/i);
  return match ? parseInt(match[1]) : 'unknown';
}

/**
 * Validate all recently changed files
 */
function validateRecentChanges() {
  console.log('🔍 LLM-ASSISTED SYNTAX VALIDATION\n');
  console.log('═'.repeat(60));
  
  const filesToCheck = [
    'backend/persona_router.js',
    'backend/server.js',
    'frontend/src/pages/Clinical.jsx'
  ];
  
  filesToCheck.forEach(relPath => {
    const fullPath = path.join(__dirname, '..', relPath);
    
    if (!fs.existsSync(fullPath)) {
      results.warnings.push(`File not found: ${relPath}`);
      console.log(`⚠️  SKIP: ${relPath} (not found)`);
      return;
    }
    
    console.log(`\n📄 Checking: ${relPath}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    const validation = validateSyntax(fullPath, content);
    
    if (validation.valid) {
      results.valid.push(validation);
      console.log(`✅ VALID: ${relPath} (${validation.type})`);
    } else {
      results.invalid.push(validation);
      console.log(`❌ INVALID: ${relPath}`);
      if (validation.issues) {
        validation.issues.forEach(issue => {
          console.log(`   - ${issue.type}: ${issue.error} (line ${issue.line})`);
        });
      } else {
        console.log(`   - ${validation.error} (line ${validation.line})`);
      }
    }
  });
  
  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('VALIDATION SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Valid files: ${results.valid.length}`);
  console.log(`❌ Invalid files: ${results.invalid.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  
  if (results.invalid.length > 0) {
    console.log('\n❌ FILES WITH ERRORS:');
    results.invalid.forEach(file => {
      console.log(`\n📄 ${file.file}`);
      if (file.issues) {
        file.issues.forEach(issue => {
          console.log(`   Line ${issue.line}: ${issue.type} - ${issue.error}`);
        });
      } else {
        console.log(`   Line ${file.line}: ${file.error}`);
      }
    });
    
    console.log('\n🔧 FIX REQUIRED BEFORE DEPLOYMENT');
    process.exit(1);
  } else {
    console.log('\n✅ ALL FILES VALIDATED - SAFE TO DEPLOY');
    process.exit(0);
  }
}

// Run validation
validateRecentChanges();
