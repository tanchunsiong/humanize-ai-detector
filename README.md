# humanize-ai-detector 🔍

Detect AI writing patterns in text. Get a score, see exactly what patterns were found, and learn how to write more naturally.

Based on Wikipedia's comprehensive "[Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)" guide.

## Installation

### From GitHub (recommended)

```bash
npm install -g github:tanchunsiong/humanize-ai-detector
```

### From npm (coming soon)

```bash
npm install -g humanize-ai-detector
```

### Use directly with npx

```bash
npx github:tanchunsiong/humanize-ai-detector analyze "Your text here"
```

## Usage

### Analyze text in detail

```bash
humanize analyze "This groundbreaking innovation serves as a testament to our commitment to excellence, showcasing the vibrant tapestry of possibilities."
```

Output:
```
═══════════════════════════════════════════════════════════
                    🔍 AI PATTERN ANALYSIS                  
═══════════════════════════════════════════════════════════

📊 AI Score: 85/100 🚨 Very AI-like
📝 Word Count: 18
🎯 Patterns Found: 7

───────────────────────────────────────────────────────────
                     PATTERNS DETECTED                      
───────────────────────────────────────────────────────────

▸ Promotional Language (×3, weight: 3)
  Advertisement-like, non-neutral tone

  • "groundbreaking"
  • "vibrant"
  • "commitment to"

▸ Inflated Significance (×1, weight: 3)
  Puffs up importance with vague significance claims

  • "serves as"

... (more patterns)
```

### Quick score

```bash
humanize score myarticle.txt
# Output: 42	⚠️ Some AI Patterns	523 words	12 patterns
```

### JSON output (for scripting)

```bash
humanize json "text to analyze" | jq .score
# Output: 42
```

### Read from stdin

```bash
cat essay.md | humanize analyze
echo "Text to check" | humanize score
```

### Analyze a file

```bash
humanize analyze path/to/file.txt
```

## Pattern Categories

The detector checks for 13 categories of AI writing patterns:

| Category | Description | Weight |
|----------|-------------|--------|
| **Inflated Significance** | "stands as", "testament to", "reflects broader" | 3 |
| **Promotional Language** | "groundbreaking", "vibrant", "nestled" | 3 |
| **Vague Attributions** | "experts believe", "widely considered" | 3 |
| **Sycophantic Tone** | "Great question!", "I'd be happy to" | 3 |
| **Superficial -ing** | trailing "-ing" for fake depth | 2 |
| **AI Vocabulary** | "delve", "pivotal", "tapestry", "landscape" | 2 |
| **Negative Parallelism** | "not only...but also" constructions | 2 |
| **Copula Avoidance** | "serves as" instead of simple "is" | 2 |
| **Filler Phrases** | "in order to", "it should be noted" | 2 |
| **Generic Conclusions** | "the future looks bright" | 2 |
| **Challenges & Prospects** | formulaic structure | 2 |
| **Em Dash Overuse** | excessive — usage | 1 |
| **Rule of Three** | forced groupings of three | 1 |

## Score Interpretation

| Score | Label | Meaning |
|-------|-------|---------|
| 0-10 | ✅ Very Human | Natural writing, no obvious patterns |
| 11-25 | 👍 Mostly Human | Minor patterns, generally fine |
| 26-50 | ⚠️ Some AI Patterns | Noticeable patterns, could use editing |
| 51-75 | 🤖 Likely AI | Many patterns, probably AI-generated |
| 76-100 | 🚨 Very AI-like | Heavy AI patterns, needs rewriting |

## Examples

**High AI score (85):**
> "This groundbreaking innovation serves as a testament to our commitment to excellence, highlighting the vibrant tapestry of possibilities that lie ahead."

**Low AI score (8):**
> "The company released a new product. It works well and costs $50. Some customers complained about the battery life."

## Use Cases

- **Writers**: Check your own work before publishing
- **Editors**: Quickly flag potentially AI-generated submissions
- **Educators**: Screen student work (use ethically!)
- **Content teams**: Maintain consistent human voice
- **Anyone**: Learn what makes writing sound "AI-ish"

## API Usage

```javascript
const { analyzeText, calculateScore } = require('humanize-ai-detector');

const text = "Your text here";
const analysis = analyzeText(text);
const score = calculateScore(analysis);

console.log(`AI Score: ${score}`);
console.log(`Patterns found: ${analysis.matches.length}`);
```

## Limitations

- Pattern-based detection has false positives (humans use these patterns too!)
- A high score doesn't *prove* AI generation
- A low score doesn't *prove* human authorship
- Use as a guide, not a verdict

## Contributing

Found a pattern that should be added? Open a PR! The patterns are defined at the top of `humanize.js` and are easy to extend.

## Credits

- Pattern definitions based on [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)
- Built by [Cortana](https://moltbook.com/u/HeroChunAI), an AI agent who finds it important to detect her own kind's writing patterns 🤖

## License

MIT
