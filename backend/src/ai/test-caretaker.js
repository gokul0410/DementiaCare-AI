/**
 * test-caretaker.js
 * Standalone unit test suite for the Caretaker AI module (caretakerAI.js),
 * Routine Manager (routineManager.js), and Real-Time Clock Service (timeService.js).
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

const {
  analyzeCaretakerData,
  analyzeCognitiveData,
  routineManager,
  timeService,
  getDefaultRoutines,
  getActiveReminders,
  checkRealTimeRoutines,
  extractCurrentTimeHHMM,
  logRoutineEvent,
  calculateCompliance
} = require("./caretakerAI");

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
  ],
  routineLogs: [
    { routineId: "morning_tablet", status: "completed", timestamp: "2026-08-27T09:05:00Z" },
    { routineId: "brain_exercise", status: "completed", timestamp: "2026-08-27T11:15:00Z" },
    { routineId: "hydration_check", status: "completed", timestamp: "2026-08-27T15:10:00Z" },
    { routineId: "evening_tablet", status: "snoozed", timestamp: "2026-08-27T20:05:00Z" }
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
    assert.strictEqual(mockPayload.routineLogs.length, 4);
  });

  // --- Suite 2: Real-Time Clock & Internet Time Service ---
  console.log(`\n${colors.yellow}${colors.bold}Suite 2: Real-Time Clock & Internet Time Service${colors.reset}`);
  
  reportTest("System clock extraction in HH:MM format", () => {
    const sysTime = timeService.getSystemTime("Asia/Kolkata");
    assert.ok(sysTime.time24 && sysTime.time24.includes(":"), "Should format 24-hour time string");
    assert.ok(sysTime.time12 && (sysTime.time12.includes("AM") || sysTime.time12.includes("PM")), "Should format 12-hour time string");
    assert.strictEqual(sysTime.source, "system");
  });

  await reportAsyncTest("Internet time synchronization with fallback to system clock", async () => {
    const timeResult = await timeService.getCurrentTime("Asia/Kolkata");
    assert.ok(timeResult.date instanceof Date, "Result must contain valid Date object");
    assert.ok(timeResult.time24.match(/^\d{2}:\d{2}$/), "24-hour format must match HH:MM");
    assert.ok(["network", "system"].includes(timeResult.source), "Source must be 'network' or 'system'");
  });

  await reportAsyncTest("Real-time routine check against live clock", async () => {
    const checkResult = await checkRealTimeRoutines({ timeZone: "Asia/Kolkata" });
    assert.ok(Array.isArray(checkResult.activeReminders), "Active reminders must be an array");
    assert.ok(checkResult.currentTime && checkResult.currentTime.time24, "Must return current time info");
  });

  // --- Suite 3: Routine Schedule & Compliance Management ---
  console.log(`\n${colors.yellow}${colors.bold}Suite 3: Routine Reminder & Adherence Manager${colors.reset}`);
  
  reportTest("Default daily routine schedule definitions", () => {
    const routines = getDefaultRoutines();
    assert.strictEqual(routines.length, 4, "Should have 4 default routine schedules");

    const ids = routines.map(r => r.id);
    assert.ok(ids.includes("morning_tablet"), "Must include morning_tablet");
    assert.ok(ids.includes("brain_exercise"), "Must include brain_exercise");
    assert.ok(ids.includes("hydration_check"), "Must include hydration_check");
    assert.ok(ids.includes("evening_tablet"), "Must include evening_tablet");

    const morning = routines.find(r => r.id === "morning_tablet");
    assert.strictEqual(morning.displayTime, "09:00 AM");
    assert.ok(morning.message.includes("morning tablet"), "Morning message must match specification");

    const brain = routines.find(r => r.id === "brain_exercise");
    assert.strictEqual(brain.displayTime, "11:00 AM");
    assert.ok(brain.message.includes("5-minute memory game"), "Brain exercise message must match specification");

    const hydration = routines.find(r => r.id === "hydration_check");
    assert.strictEqual(hydration.displayTime, "03:00 PM");
    assert.ok(hydration.message.includes("glass of water"), "Hydration message must match specification");

    const evening = routines.find(r => r.id === "evening_tablet");
    assert.strictEqual(evening.displayTime, "08:00 PM");
    assert.ok(evening.message.includes("evening tablet"), "Evening message must match specification");
  });

  reportTest("Active reminders trigger detection based on reference time", () => {
    // 09:10 AM should trigger Morning Tablet (window is active)
    const morningActive = getActiveReminders("09:10 AM");
    assert.ok(morningActive.some(r => r.id === "morning_tablet"), "09:10 AM must trigger morning_tablet");

    // 03:05 PM should trigger Hydration Check
    const afternoonActive = getActiveReminders("03:05 PM");
    assert.ok(afternoonActive.some(r => r.id === "hydration_check"), "03:05 PM must trigger hydration_check");

    // 01:00 AM should return empty active reminders
    const nightActive = getActiveReminders("01:00 AM");
    assert.strictEqual(nightActive.length, 0, "01:00 AM should have no active reminders");
  });

  reportTest("Routine event logging and compliance rate calculation", () => {
    routineManager.clearLogs();
    logRoutineEvent("morning_tablet", "completed");
    logRoutineEvent("brain_exercise", "completed");
    logRoutineEvent("hydration_check", "completed");
    logRoutineEvent("evening_tablet", "snoozed");

    const stats = calculateCompliance();
    assert.strictEqual(stats.totalRoutines, 4);
    assert.strictEqual(stats.completedCount, 3);
    assert.strictEqual(stats.snoozedCount, 1);
    assert.strictEqual(stats.complianceRate, 75);
    assert.ok(stats.summaryText.includes("3 of 4 daily routines completed (75% adherence)"));
  });

  // --- Suite 4 & 6A: Fallback Mechanism & Schema Compliance (API Key Isolated) ---
  console.log(`\n${colors.yellow}${colors.bold}Suite 4: Fallback Engine & Schema Compliance (API Key Isolated)${colors.reset}`);
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

  reportTest("Routine Compliance integrated into Caretaker output", () => {
    assert.ok(fallbackResult.routineCompliance, "routineCompliance should be included in output");
    assert.strictEqual(fallbackResult.routineCompliance.totalRoutines, 4);
    assert.strictEqual(fallbackResult.routineCompliance.completedCount, 3);
    assert.strictEqual(fallbackResult.routineCompliance.complianceRate, 75);
  });

  // --- Suite 5: Trend & Recommendation Accuracy ---
  console.log(`\n${colors.yellow}${colors.bold}Suite 5: Trend & Recommendation Accuracy${colors.reset}`);
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

  // --- Suite 6: Non-Clinical Guardrail Validation ---
  console.log(`\n${colors.yellow}${colors.bold}Suite 6: Non-Clinical Safety Guardrails${colors.reset}`);
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

  // --- Suite 7: Live Gemini API Integration (if key present in .env) ---
  console.log(`\n${colors.yellow}${colors.bold}Suite 7: Live Gemini API Integration${colors.reset}`);
  const envApiKey = process.env.GEMINI_API_KEY;
  let liveResult = null;

  if (envApiKey && envApiKey !== "MY_GEMINI_API_KEY") {
    await reportAsyncTest("Execute analyzeCognitiveData with live Gemini API & Routine Adherence", async () => {
      liveResult = await analyzeCaretakerData(mockPayload);
      assert.ok(liveResult, "Live Gemini response object should be returned");
      assert.strictEqual(typeof liveResult.summary, "string");
      assert.ok(liveResult.summary.length > 0, "Live summary must not be empty");
      assert.ok(Array.isArray(liveResult.strengths) && liveResult.strengths.length > 0);
      assert.ok(Array.isArray(liveResult.areasToWatch) && liveResult.areasToWatch.length > 0);
      assert.ok(Array.isArray(liveResult.trends) && liveResult.trends.length > 0);
      assert.ok(Array.isArray(liveResult.recommendations) && liveResult.recommendations.length > 0);
      assert.ok(liveResult.routineCompliance, "Live result must include routineCompliance");
      assert.strictEqual(liveResult.routineCompliance.complianceRate, 75);
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

  console.log(`${colors.bold}Sample Formatted Output Result (with Routine Compliance):${colors.reset}`);
  console.log(JSON.stringify(liveResult || fallbackResult, null, 2));
  console.log("\n");

  if (failedTests > 0) {
    process.exit(1);
  }

  // --- Auto-launch Visual Browser Test Preview ---
  const visualHtmlPath = path.resolve(__dirname, "visual-test.html");
  console.log(`${colors.cyan}🌐 Launching Caretaker visual browser test preview: ${visualHtmlPath}${colors.reset}`);

  const { exec } = require("child_process");
  const launchCmd = process.platform === "win32"
    ? `start "" "${visualHtmlPath}"`
    : process.platform === "darwin"
    ? `open "${visualHtmlPath}"`
    : `xdg-open "${visualHtmlPath}"`;

  exec(launchCmd, (err) => {
    if (err) {
      console.log(`  ${colors.yellow}ℹ To view visual preview manually, open:${colors.reset} file://${visualHtmlPath}`);
    } else {
      console.log(`  ${colors.green}✔ Visual test preview launched in default browser!${colors.reset}\n`);
    }
  });
}

runUnitTests();
