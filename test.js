#!/usr/bin/env node
/**
 * Tests for humanize-ai-detector
 */

const { execSync } = require('child_process');
const path = require('path');

const CLI = path.join(__dirname, 'humanize.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function run(args) {
  return execSync(`node "${CLI}" ${args}`, { encoding: 'utf-8' });
}

// ============================================================================
// TESTS
// ============================================================================

console.log('\n🔍 humanize-ai-detector tests\n');
console.log('─'.repeat(50));

// High AI score text
const aiText = '"This groundbreaking innovation serves as a testament to our commitment to excellence"';

// Low AI score text
const humanText = '"The company released a product. It costs fifty dollars."';

test('analyze command runs', () => {
  const output = run(`analyze ${aiText}`);
  assert(output.includes('AI PATTERN ANALYSIS'), 'Should include header');
  assert(output.includes('Score:'), 'Should include score');
});

test('score command runs', () => {
  const output = run(`score ${aiText}`);
  assert(output.includes('\t'), 'Should be tab-separated');
  const score = parseInt(output.split('\t')[0]);
  assert(!isNaN(score), 'Score should be a number');
});

test('json command produces valid JSON', () => {
  const output = run(`json ${aiText}`);
  const data = JSON.parse(output);
  assert(typeof data.score === 'number', 'Should have numeric score');
  assert(typeof data.patterns === 'object', 'Should have patterns object');
});

test('high AI text scores high', () => {
  const output = run(`json ${aiText}`);
  const { score } = JSON.parse(output);
  assert(score >= 50, `AI text should score >= 50, got ${score}`);
});

test('human text scores low', () => {
  const output = run(`json ${humanText}`);
  const { score } = JSON.parse(output);
  assert(score <= 30, `Human text should score <= 30, got ${score}`);
});

test('detects promotional language', () => {
  const output = run(`json "This vibrant groundbreaking innovation is stunning"`);
  const { patterns } = JSON.parse(output);
  assert(patterns.promotional, 'Should detect promotional patterns');
});

test('detects AI vocabulary', () => {
  const output = run(`json "Let me delve into this pivotal landscape"`);
  const { patterns } = JSON.parse(output);
  assert(patterns.ai_vocabulary, 'Should detect AI vocabulary');
});

test('detects sycophantic tone', () => {
  const output = run(`json "Great question! I would be happy to help you."`);
  const { patterns } = JSON.parse(output);
  assert(patterns.sycophantic, 'Should detect sycophantic patterns');
});

test('detects vague attributions', () => {
  const output = run(`json "Many experts believe this is widely considered important"`);
  const { patterns } = JSON.parse(output);
  assert(patterns.vague_attribution, 'Should detect vague attributions');
});

test('detects inflated significance', () => {
  const output = run(`json "This stands as a testament to the evolving landscape"`);
  const { patterns } = JSON.parse(output);
  assert(patterns.inflated_significance, 'Should detect inflated significance');
});

test('help command works', () => {
  const output = run('help');
  assert(output.includes('USAGE'), 'Should show usage');
  assert(output.includes('analyze'), 'Should mention analyze');
});

test('empty patterns for clean text', () => {
  const output = run(`json "I went to the store. I bought milk."`);
  const { patterns } = JSON.parse(output);
  assert(Object.keys(patterns).length === 0, 'Simple text should have no patterns');
});

// ============================================================================
// RESULTS
// ============================================================================

console.log('─'.repeat(50));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

process.exit(failed > 0 ? 1 : 0);
