#!/usr/bin/env node

/**
 * Pre-deployment validation script
 * Runs checks to catch common production issues before deployment
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

function log(type, message) {
  const colors = {
    pass: '\x1b[32m✓\x1b[0m',
    fail: '\x1b[31m✗\x1b[0m',
    warn: '\x1b[33m⚠\x1b[0m',
  };
  console.log(`${colors[type]} ${message}`);
}

// Check 1: TypeScript strict mode
console.log('\n📋 Checking TypeScript configuration...');
try {
  const tsconfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tsconfig.json'), 'utf8'));
  if (tsconfig.compilerOptions?.strict === true) {
    log('pass', 'TypeScript strict mode is enabled');
    checks.passed++;
  } else {
    log('warn', 'TypeScript strict mode is not enabled (recommended for production)');
    checks.warnings++;
  }

  if (tsconfig.compilerOptions?.skipLibCheck === false) {
    log('pass', 'skipLibCheck is false (strict library checking enabled)');
    checks.passed++;
  } else {
    log('warn', 'skipLibCheck is true (may miss library type issues)');
    checks.warnings++;
  }
} catch (error) {
  log('fail', 'Could not read tsconfig.json');
  checks.failed++;
}

// Check 2: Build test
console.log('\n🔨 Testing production build...');
try {
  execSync('npm run build', { stdio: 'pipe' });
  log('pass', 'Production build succeeds');
  checks.passed++;
} catch (error) {
  log('fail', 'Production build failed');
  checks.failed++;
  console.error('Build error details:', error.message.split('\n').slice(0, 5).join('\n'));
}

// Check 3: Missing type declarations
console.log('\n📦 Checking for untyped dependencies...');
const untypedPackages = ['ffprobe-static', 'ffmpeg-static'];
const typesDir = path.join(process.cwd(), 'types');

for (const pkg of untypedPackages) {
  const hasDeclaration = fs.existsSync(path.join(typesDir, `${pkg}.d.ts`));
  if (hasDeclaration) {
    log('pass', `Type declarations exist for ${pkg}`);
    checks.passed++;
  } else {
    log('warn', `Consider adding type declarations for ${pkg}`);
    checks.warnings++;
  }
}

// Check 4: Hydration-safe code patterns
console.log('\n⚙️  Checking for hydration issues...');
const filesToCheck = [
  'components/HistoryPanel.tsx',
  'app/workflow/page.tsx',
];

let hydrationIssuesFound = 0;
for (const file of filesToCheck) {
  const filepath = path.join(process.cwd(), file);
  if (fs.existsSync(filepath)) {
    const content = fs.readFileSync(filepath, 'utf8');
    
    // Check for unsafe localStorage usage without guards
    if (content.includes('localStorage') && !content.includes('isClient')) {
      hydrationIssuesFound++;
      log('warn', `${file}: localStorage used without hydration guard`);
    } else if (content.includes('localStorage')) {
      log('pass', `${file}: localStorage properly guarded`);
      checks.passed++;
    }
  }
}

if (hydrationIssuesFound === 0) {
  checks.passed++;
}

// Check 5: Environment variables
console.log('\n🔐 Checking environment configuration...');
const requiredEnvVars = [
  'GEMINI_API_KEY',
  'TRANSLOADIT_KEY',
  'TRANSLOADIT_SECRET',
  'TRIGGER_API_KEY',
];

const envContent = fs.existsSync('.env.local') 
  ? fs.readFileSync('.env.local', 'utf8')
  : '';

for (const envVar of requiredEnvVars) {
  if (envContent.includes(envVar) || process.env[envVar]) {
    log('pass', `${envVar} is configured`);
    checks.passed++;
  } else {
    log('warn', `${envVar} is not set (required for production)`);
    checks.warnings++;
  }
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Pre-deployment Check Summary');
console.log('='.repeat(50));
console.log(`✓ Passed: ${checks.passed}`);
console.log(`⚠ Warnings: ${checks.warnings}`);
console.log(`✗ Failed: ${checks.failed}`);

if (checks.failed > 0) {
  console.log('\n❌ Pre-deployment checks failed. Please fix the issues above before deploying.');
  process.exit(1);
} else if (checks.warnings > 0) {
  console.log('\n⚠️  Pre-deployment checks passed but with warnings. Review them above.');
  process.exit(0);
} else {
  console.log('\n✅ All pre-deployment checks passed! Ready to deploy.');
  process.exit(0);
}
