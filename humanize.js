#!/usr/bin/env node
/**
 * humanize - Detect and fix AI writing patterns
 * 
 * Usage:
 *   humanize analyze <file|text>    # Report AI patterns found
 *   humanize score <file|text>      # Get AI-ness score (0-100)
 *   humanize fix <file>             # Suggest fixes (outputs to stdout)
 *   echo "text" | humanize analyze  # Pipe mode
 * 
 * Based on Wikipedia's "Signs of AI writing" guide.
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// AI PATTERN DEFINITIONS
// ============================================================================

const PATTERNS = {
  // Category 1: Inflated significance
  inflated_significance: {
    name: 'Inflated Significance',
    description: 'Puffs up importance with vague significance claims',
    weight: 3,
    patterns: [
      /\bstands?\s+as\b/gi,
      /\bserves?\s+as\b/gi,
      /\b(is|are)\s+a\s+testament\b/gi,
      /\bunderscores?\s+(its|the|their)\s+importance\b/gi,
      /\bhighlights?\s+(its|the|their)\s+significance\b/gi,
      /\breflects?\s+broader\b/gi,
      /\bsymboliz(es?|ing)\s+(its|the|their)\s+(ongoing|enduring|lasting)\b/gi,
      /\bsetting\s+the\s+stage\s+for\b/gi,
      /\bmarking\s+a\s+(pivotal|key|crucial)\s+moment\b/gi,
      /\brepresents?\s+a\s+shift\b/gi,
      /\bevolving\s+landscape\b/gi,
      /\bindelible\s+mark\b/gi,
      /\bdeeply\s+rooted\b/gi,
    ],
  },

  // Category 2: Superficial -ing analyses
  superficial_ing: {
    name: 'Superficial -ing Endings',
    description: 'Tacks -ing phrases for fake depth',
    weight: 2,
    patterns: [
      /,\s*(highlighting|underscoring|emphasizing|reflecting|symbolizing|showcasing|encompassing|cultivating|fostering)\s+/gi,
      /,\s*ensuring\s+(that\s+)?[^,.]+[,.]/gi,
      /,\s*contributing\s+to\s+/gi,
    ],
  },

  // Category 3: Promotional language
  promotional: {
    name: 'Promotional Language',
    description: 'Advertisement-like, non-neutral tone',
    weight: 3,
    patterns: [
      /\bboasts?\s+a\b/gi,
      /\bvibrant\b/gi,
      /\bprofound\b/gi,
      /\bgroundbreaking\b/gi,
      /\brenowned\b/gi,
      /\bbreathtaking\b/gi,
      /\bmust-visit\b/gi,
      /\bstunning\b/gi,
      /\bnestled\b/gi,
      /\bin\s+the\s+heart\s+of\b/gi,
      /\brich\s+(cultural\s+)?heritage\b/gi,
      /\bnatural\s+beauty\b/gi,
      /\bexemplif(y|ies)\b/gi,
      /\bcommitment\s+to\b/gi,
    ],
  },

  // Category 4: AI vocabulary words
  ai_vocabulary: {
    name: 'AI Vocabulary',
    description: 'Words overused by AI models',
    weight: 2,
    patterns: [
      /\bAdditionally\b/g,
      /\balign\s+with\b/gi,
      /\bcrucial\b/gi,
      /\bdelve\b/gi,
      /\benduring\b/gi,
      /\benhance[ds]?\b/gi,
      /\bfostering\b/gi,
      /\bgarner[s]?\b/gi,
      /\binterplay\b/gi,
      /\bintricat(e|es|ies)\b/gi,
      /\blandscape\b/gi, // abstract use
      /\bpivotal\b/gi,
      /\bshowcas(e|es|ing)\b/gi,
      /\btapestry\b/gi, // abstract use
      /\bunderscore[sd]?\b/gi,
      /\bvaluable\b/gi,
      /\bseamless(ly)?\b/gi,
      /\brobust\b/gi,
      /\bleverag(e|es|ing)\b/gi,
      /\bfacilitat(e|es|ing)\b/gi,
      /\boptimiz(e|es|ing)\b/gi,
      /\bholistic\b/gi,
      /\bsynerg(y|ies|istic)\b/gi,
      /\bparadigm\b/gi,
      /\bmeticulously\b/gi,
      /\bcomprehensive\b/gi,
      /\bnavigat(e|es|ing)\b/gi,
      /\bunravel\b/gi,
      /\bembark\s+on\b/gi,
      /\bdelve\s+into\b/gi,
      /\btestament\b/gi,
      /\bundeniably\b/gi,
      /\bintricate\b/gi,
      /\bpivot\b/gi,
    ],
  },

  // Category 5: Vague attributions
  vague_attribution: {
    name: 'Vague Attributions',
    description: 'Attributes claims to unnamed experts',
    weight: 3,
    patterns: [
      /\b(Industry|Some|Many)\s+experts?\s+(believe|argue|suggest|say)\b/gi,
      /\bObservers\s+have\s+cited\b/gi,
      /\b(Some|Many)\s+critics\s+argue\b/gi,
      /\bseveral\s+(sources|publications)\b/gi,
      /\bwidely\s+(believed|considered|regarded)\b/gi,
    ],
  },

  // Category 6: Negative parallelisms
  negative_parallelism: {
    name: 'Negative Parallelism',
    description: 'Overused "not only...but also" constructions',
    weight: 2,
    patterns: [
      /\bNot\s+only\b.*\bbut\s+(also\s+)?/gi,
      /\bIt'?s\s+not\s+just\s+about\b.*\bit'?s\s+(about\s+)?/gi,
      /\bIt'?s\s+not\s+(merely|simply)\b.*\bit'?s\b/gi,
    ],
  },

  // Category 7: Rule of three
  rule_of_three: {
    name: 'Rule of Three',
    description: 'Forced groupings of three items',
    weight: 1,
    patterns: [
      /\b\w+,\s+\w+,\s+and\s+\w+\b/gi, // Only count when very close together
    ],
  },

  // Category 8: Em dash overuse
  em_dash: {
    name: 'Em Dash Overuse',
    description: 'Excessive use of em dashes',
    weight: 1,
    patterns: [
      /—/g, // Unicode em dash
      /--/g, // Double hyphen as em dash
    ],
  },

  // Category 9: Copula avoidance
  copula_avoidance: {
    name: 'Copula Avoidance',
    description: 'Substitutes "serves as" for simple "is"',
    weight: 2,
    patterns: [
      /\bserves?\s+as\s+(a|an|the)\b/gi,
      /\bstands?\s+as\s+(a|an|the)\b/gi,
      /\bmarks?\s+(a|an|the)\b/gi,
      /\brepresents?\s+(a|an|the)\b/gi,
      /\bfeatures?\s+(a|an|the)\b/gi, // when "has" would work
      /\boffers?\s+(a|an|the)\b/gi,
    ],
  },

  // Category 10: Sycophantic tone
  sycophantic: {
    name: 'Sycophantic Tone',
    description: 'Overly positive, people-pleasing language',
    weight: 3,
    patterns: [
      /\bGreat\s+question!?\b/gi,
      /\bExcellent\s+point!?\b/gi,
      /\bYou'?re\s+absolutely\s+right\b/gi,
      /\bOf\s+course!\b/g,
      /\bCertainly!\b/g,
      /\bI\s+hope\s+this\s+helps\b/gi,
      /\blet\s+me\s+know\s+if\b/gi,
      /\bI('d| would)\s+be\s+happy\s+to\b/gi,
      /\bWould\s+you\s+like\s+me\s+to\b/gi,
      /\bhappy\s+to\s+help\b/gi,
    ],
  },

  // Category 11: Filler phrases
  filler: {
    name: 'Filler Phrases',
    description: 'Unnecessary wordy constructions',
    weight: 2,
    patterns: [
      /\bIn\s+order\s+to\b/gi,
      /\bDue\s+to\s+the\s+fact\s+that\b/gi,
      /\bAt\s+this\s+point\s+in\s+time\b/gi,
      /\bIn\s+the\s+event\s+that\b/gi,
      /\bhas\s+the\s+ability\s+to\b/gi,
      /\bIt\s+is\s+important\s+to\s+note\s+that\b/gi,
      /\bIt\s+should\s+be\s+noted\s+that\b/gi,
      /\bIt\s+is\s+worth\s+mentioning\s+that\b/gi,
    ],
  },

  // Category 12: Generic conclusions
  generic_conclusion: {
    name: 'Generic Conclusions',
    description: 'Vague upbeat endings',
    weight: 2,
    patterns: [
      /\bThe\s+future\s+looks\s+bright\b/gi,
      /\bExciting\s+times\s+(lie|lay)\s+ahead\b/gi,
      /\bcontinue\s+their\s+journey\b/gi,
      /\bmajor\s+step\s+in\s+the\s+right\s+direction\b/gi,
      /\bpave\s+the\s+way\s+for\b/gi,
    ],
  },

  // Category 13: Challenges and prospects
  challenges_prospects: {
    name: 'Challenges & Prospects',
    description: 'Formulaic structure common in AI text',
    weight: 2,
    patterns: [
      /\bDespite\s+(its|these|their)\s+\w+,\s+faces?\s+several\s+challenges\b/gi,
      /\bDespite\s+these\s+challenges\b/gi,
      /\bFuture\s+Outlook\b/g,
      /\bChallenges\s+and\s+(Legacy|Opportunities|Future)\b/gi,
    ],
  },
};

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

function analyzeText(text) {
  const results = {
    patterns: {},
    matches: [],
    totalWeight: 0,
    wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
  };

  for (const [key, category] of Object.entries(PATTERNS)) {
    const categoryMatches = [];
    
    for (const pattern of category.patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        categoryMatches.push({
          text: match[0],
          index: match.index,
          context: getContext(text, match.index, match[0].length),
        });
      }
    }

    if (categoryMatches.length > 0) {
      results.patterns[key] = {
        name: category.name,
        description: category.description,
        matches: categoryMatches,
        weight: category.weight,
        count: categoryMatches.length,
      };
      results.totalWeight += category.weight * categoryMatches.length;
      results.matches.push(...categoryMatches.map(m => ({
        ...m,
        category: category.name,
      })));
    }
  }

  return results;
}

function getContext(text, index, matchLength, contextSize = 40) {
  const start = Math.max(0, index - contextSize);
  const end = Math.min(text.length, index + matchLength + contextSize);
  
  let context = text.slice(start, end);
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';
  
  return context;
}

function calculateScore(analysis) {
  // Score from 0-100 where 100 = most AI-like
  // Based on weighted matches per 100 words
  const weightPerHundredWords = (analysis.totalWeight / analysis.wordCount) * 100;
  
  // Normalize to 0-100 scale (assuming 20+ weighted matches per 100 words is very AI-like)
  const score = Math.min(100, Math.round(weightPerHundredWords * 5));
  
  return score;
}

function getScoreLabel(score) {
  if (score <= 10) return '✅ Very Human';
  if (score <= 25) return '👍 Mostly Human';
  if (score <= 50) return '⚠️ Some AI Patterns';
  if (score <= 75) return '🤖 Likely AI';
  return '🚨 Very AI-like';
}

// ============================================================================
// OUTPUT FUNCTIONS
// ============================================================================

function formatAnalysis(analysis) {
  const score = calculateScore(analysis);
  const lines = [];
  
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('                    🔍 AI PATTERN ANALYSIS                  ');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`📊 AI Score: ${score}/100 ${getScoreLabel(score)}`);
  lines.push(`📝 Word Count: ${analysis.wordCount}`);
  lines.push(`🎯 Patterns Found: ${analysis.matches.length}`);
  lines.push('');
  
  if (Object.keys(analysis.patterns).length === 0) {
    lines.push('✨ No significant AI patterns detected!');
    return lines.join('\n');
  }

  lines.push('───────────────────────────────────────────────────────────');
  lines.push('                     PATTERNS DETECTED                      ');
  lines.push('───────────────────────────────────────────────────────────');
  
  // Sort by weight * count (most impactful first)
  const sortedPatterns = Object.entries(analysis.patterns)
    .sort((a, b) => (b[1].weight * b[1].count) - (a[1].weight * a[1].count));

  for (const [key, data] of sortedPatterns) {
    lines.push('');
    lines.push(`▸ ${data.name} (×${data.count}, weight: ${data.weight})`);
    lines.push(`  ${data.description}`);
    lines.push('');
    
    // Show up to 3 examples
    const examples = data.matches.slice(0, 3);
    for (const match of examples) {
      lines.push(`  • "${match.text}"`);
      lines.push(`    └─ ${match.context.replace(/\n/g, ' ')}`);
    }
    if (data.matches.length > 3) {
      lines.push(`  ... and ${data.matches.length - 3} more`);
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  
  return lines.join('\n');
}

function formatScore(analysis) {
  const score = calculateScore(analysis);
  return `${score}\t${getScoreLabel(score)}\t${analysis.wordCount} words\t${analysis.matches.length} patterns`;
}

function formatJson(analysis) {
  const score = calculateScore(analysis);
  return JSON.stringify({
    score,
    label: getScoreLabel(score),
    wordCount: analysis.wordCount,
    patternCount: analysis.matches.length,
    patterns: analysis.patterns,
  }, null, 2);
}

// ============================================================================
// INPUT HANDLING
// ============================================================================

async function getInput(arg) {
  // If argument looks like a file path and exists, read it
  if (arg && fs.existsSync(arg)) {
    return fs.readFileSync(arg, 'utf-8');
  }
  
  // If argument provided, use it as text
  if (arg) {
    return arg;
  }
  
  // Otherwise, read from stdin
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data));
    
    // Timeout after 100ms if no stdin
    setTimeout(() => {
      if (!data) {
        console.error('Usage: humanize <analyze|score|json> <file|text>');
        console.error('       echo "text" | humanize analyze');
        process.exit(1);
      }
    }, 100);
  });
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'analyze';
  const input = args.slice(1).join(' ');

  // Handle help first (no input needed)
  if (['help', '-h', '--help'].includes(command)) {
    console.log(`
humanize - Detect AI writing patterns

USAGE:
  humanize analyze <file|text>    Detailed pattern analysis
  humanize score <file|text>      Quick AI-ness score (0-100)
  humanize json <file|text>       JSON output for scripting
  echo "text" | humanize analyze  Read from stdin

EXAMPLES:
  humanize analyze post.txt
  humanize score "This serves as a testament to innovation"
  cat article.md | humanize json

Based on Wikipedia's "Signs of AI writing" guide.
    `);
    return;
  }

  const text = await getInput(input);
  
  if (!text || text.trim().length === 0) {
    console.error('Error: No text provided');
    process.exit(1);
  }

  const analysis = analyzeText(text);

  switch (command) {
    case 'analyze':
    case 'a':
      console.log(formatAnalysis(analysis));
      break;
    
    case 'score':
    case 's':
      console.log(formatScore(analysis));
      break;
    
    case 'json':
    case 'j':
      console.log(formatJson(analysis));
      break;
    
    default:
      // Treat first arg as input if not a command
      const fullInput = args.join(' ');
      const textToAnalyze = await getInput(fullInput);
      console.log(formatAnalysis(analyzeText(textToAnalyze)));
  }
}

// ============================================================================
// EXPORTS (for API usage)
// ============================================================================

module.exports = {
  analyzeText,
  calculateScore,
  getScoreLabel,
  PATTERNS,
};

// Run CLI if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
