/**
 * test-caretaker.js
 * Standalone unit test suite for the Caretaker AI module (caretakerAI.js).
 * 
 * Uses Node.js built-in `assert` module - no external test frameworks required.
 * 
 * Execution:
 *   node backend/src/ai/test-caretaker.js
 */

const assert = require("assert");
const path = require("path");

// Load .env from backend directory if present
try {
  require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
} catch (e) {
  // Dotenv optional in isolated test environments
}

const { analyzeCaretakerData, analyzeCognitiveData } = require("./caretakerAI");

// ANSI color codes for terminal formatting
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m",
  dim: "\x1b[2m"
};

const passIcon = `${colors.green}✔${colors.reset}`;
const failIcon = `${colors.red}✖${colors.reset}`;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function reportTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ${passIcon} ${colors.bold}${name}${colors.reset}`);
  } catch (error) {
    failedTests++;
    console.error(`  ${failIcon} ${colors.red}${name}${colors.reset}`);
    console.error(`     ${colors.dim}Error: ${error.message}${colors.reset}`);
  }
}

async function reportAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ${passIcon} ${colors.bold}${name}${colors.reset}`);
  } catch (error) {
    failedTests++;
    console.error(`  ${failIcon} ${colors.red}${name}${colors.reset}`);
    console.error(`     ${colors.dim}Error: ${error.message}${colors.reset}`);
  }
}

// ---------------------------------------------------------------------------
// 1. Mock Data Setup
// ---------------------------------------------------------------------------
const mockPayload = {
  user: {
    id: "U_TEST_007",
    name: "Eleanor Vance",
    age: 74,
    language: "English"
  },
  gameResults: [
    // memory_match: Declining trend (accuracy drops from 85% to 45%, time increases)
    {
      gameType: "memory_match",
      score: 9,
      accuracy: 85,
      timeTaken: 30,
      difficulty: "medium",
      playedAt: "2026-08-20T10:00:00Z"
    },
    {
      gameType: "memory_match",
      score: 6,
      accuracy: 65,
      timeTaken: 50,
      difficulty: "medium",
      playedAt: "2026-08-22T10:00:00Z"
    },
    {
      gameType: "memory_match",
      score: 4,
      accuracy: 45,
      timeTaken: 75,
      difficulty: "easy",
      playedAt: "2026-08-25T10:00:00Z"
    },

    // pattern_recognition: Improving & high performance (accuracy climbs from 75% to 95%, time decreases)
    {
      gameType: "pattern_recognition",
      score: 7,
      accuracy: 75,
      timeTaken: 45,
      difficulty: "easy",
      playedAt: "2026-08-20T10:30:00Z"
    },
    {
      gameType: "pattern_recognition",
      score: 9,
      accuracy: 88,
      timeTaken: 32,
      difficulty: "medium",
      playedAt: "2026-08-22T10:30:00Z"
    },
    {
      gameType: "pattern_recognition",
      score: 10,
      accuracy: 95,
      timeTaken: 22,
      difficulty: "hard",
      playedAt: "2026-08-25T10:30:00Z"
    }
  ]
};

// ---------------------------------------------------------------------------
// Main Test Runner
// ---------------------------------------------------------------------------
async function runUnitTests() {
  console.log(`\n${colors.cyan}${colors.bold}========================================`);
  console.log(`  Caretaker AI Module - Unit Test Suite `);
  console.log(`========================================${colors.reset}\n`);

  // --- Suite 1: Mock Data Verification ---
  console.log(`${colors.yellow}${colors.bold}Suite 1: Mock Data Verification${colors.reset}`);
  reportTest("Mock payload is properly structured with user demographics and sessions", () => {
    assert.strictEqual(mockPayload.user.name, "Eleanor Vance");
    assert.strictEqual(mockPayload.user.age, 74);
    assert.strictEqual(mockPayload.gameResults.length, 6);
  });

  // --- Suite 2 & 5A: Fallback Mechanism & Schema Compliance (API Key Isolated) ---
  console.log(`\n${colors.yellow}${colors.bold}Suite 2: Fallback Engine (API Key Isolated - Offline Mode)${colors.reset}`);
  let fallbackResult;

  await reportAsyncTest("Execute analyzeCognitiveData with empty API key (fallback trigger)", async () => {
    fallbackResult = await analyzeCognitiveData(mockPayload, { apiKey: "" });
    assert.ok(fallbackResult, "Result object should be returned");
  });

  reportTest("Schema Compliance: Contains all required top-level keys", () => {
    const requiredKeys = ["summary", "strengths", "areasToWatch", "trends", "recommendations"];
    for (const key of requiredKeys) {
      assert.ok(key in fallbackResult, `Missing required key: '${key}'`);
    }
  });

  reportTest("Schema Compliance: 'summary' is a non-empty string", () => {
    assert.strictEqual(typeof fallbackResult.summary, "string");
    assert.ok(fallbackResult.summary.trim().length > 0, "Summary should not be empty");
  });

  reportTest("Schema Compliance: 'strengths', 'areasToWatch', 'trends', 'recommendations' are non-empty arrays", () => {
    assert.ok(Array.isArray(fallbackResult.strengths) && fallbackResult.strengths.length > 0, "'strengths' must be non-empty array");
    assert.ok(Array.isArray(fallbackResult.areasToWatch) && fallbackResult.areasToWatch.length > 0, "'areasToWatch' must be non-empty array");
    assert.ok(Array.isArray(fallbackResult.trends) && fallbackResult.trends.length > 0, "'trends' must be non-empty array");
    assert.ok(Array.isArray(fallbackResult.recommendations) && fallbackResult.recommendations.length > 0, "'recommendations' must be non-empty array");
  });

  // --- Suite 3: Trend & Recommendation Accuracy ---
  console.log(`\n${colors.yellow}${colors.bold}Suite 3: Trend & Recommendation Accuracy${colors.reset}`);
  reportTest("Trend Detection: memory_match is flagged as declining or placed under areasToWatch", () => {
    const trendsText = JSON.stringify(fallbackResult.trends).toLowerCase();
    const watchText = JSON.stringify(fallbackResult.areasToWatch).toLowerCase();

    const isDecliningInTrends = trendsText.includes("memory") && trendsText.includes("declining");
    const isUnderWatch = watchText.includes("memory");

    assert.ok(
      isDecliningInTrends || isUnderWatch,
      `Expected memory_match to be flagged as declining or in areasToWatch. Trends: ${trendsText}, Areas: ${watchText}`
    );
  });

  reportTest("Strength Detection: pattern_recognition is identified under strengths with positive trend", () => {
    const strengthsText = JSON.stringify(fallbackResult.strengths).toLowerCase();
    const trendsText = JSON.stringify(fallbackResult.trends).toLowerCase();

    const isStrength = strengthsText.includes("pattern");
    const isImprovingOrStable = trendsText.includes("pattern") && (trendsText.includes("improving") || trendsText.includes("stable"));

    assert.ok(
      isStrength && isImprovingOrStable,
      `Expected pattern_recognition in strengths and improving/stable trend. Strengths: ${strengthsText}, Trends: ${trendsText}`
    );
  });

  reportTest("Recommendations: Target difficulties ('easy', 'medium', or 'hard') are specified", () => {
    const recsText = JSON.stringify(fallbackResult.recommendations).toLowerCase();
    const hasDifficulty = recsText.includes("easy") || recsText.includes("medium") || recsText.includes("hard");
    assert.ok(hasDifficulty, "Recommendations should specify appropriate target difficulties");
  });

  // --- Suite 4: Non-Clinical Guardrail Validation ---
  console.log(`\n${colors.yellow}${colors.bold}Suite 4: Non-Clinical Safety Guardrails${colors.reset}`);
  reportTest("Guardrail Safety: Zero medical diagnostic or clinical terms in output", () => {
    const bannedTerms = [
      "dementia",
      "alzheimer's",
      "alzheimers",
      "diagnosis",
      "patient",
      "disease",
      "decline stage",
      "pathology",
      "clinical impairment"
    ];

    const outputJsonString = JSON.stringify(fallbackResult).toLowerCase();

    for (const term of bannedTerms) {
      const containsBanned = outputJsonString.includes(term);
      assert.strictEqual(
        containsBanned,
        false,
        `Medical/diagnostic term '${term}' was detected in AI output! Output must be strictly non-clinical.`
      );
    }
  });

  // --- Suite 5: Live Gemini API Integration (if key present in .env) ---
  console.log(`\n${colors.yellow}${colors.bold}Suite 5: Live Gemini API Integration${colors.reset}`);
  const envApiKey = process.env.GEMINI_API_KEY;
  let liveResult = null;

  if (envApiKey && envApiKey !== "MY_GEMINI_API_KEY") {
    await reportAsyncTest("Execute analyzeCognitiveData with live Gemini API", async () => {
      liveResult = await analyzeCaretakerData(mockPayload);
      assert.ok(liveResult, "Live Gemini response object should be returned");
      assert.strictEqual(typeof liveResult.summary, "string");
      assert.ok(liveResult.summary.length > 0, "Live summary must not be empty");
      assert.ok(Array.isArray(liveResult.strengths) && liveResult.strengths.length > 0);
      assert.ok(Array.isArray(liveResult.areasToWatch) && liveResult.areasToWatch.length > 0);
      assert.ok(Array.isArray(liveResult.trends) && liveResult.trends.length > 0);
      assert.ok(Array.isArray(liveResult.recommendations) && liveResult.recommendations.length > 0);
    });

    reportTest("Live Gemini output conforms to non-clinical safety guardrails", () => {
      const bannedTerms = ["dementia", "alzheimer's", "alzheimers", "diagnosis", "disease", "decline stage"];
      const liveJson = JSON.stringify(liveResult).toLowerCase();
      for (const term of bannedTerms) {
        assert.strictEqual(
          liveJson.includes(term),
          false,
          `Banned term '${term}' appeared in live Gemini output!`
        );
      }
    });
  } else {
    console.log(`  ${colors.yellow}ℹ Skipping Live Gemini test (GEMINI_API_KEY not configured in .env)${colors.reset}`);
  }

  // --- Summary & Pretty-Printed Result Output ---
  console.log(`\n${colors.cyan}${colors.bold}========================================`);
  console.log(`  Test Run Summary: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log(`========================================${colors.reset}\n`);

  console.log(`${colors.bold}Sample Formatted Output Result:${colors.reset}`);
  console.log(JSON.stringify(liveResult || fallbackResult, null, 2));
  console.log("\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runUnitTests();
