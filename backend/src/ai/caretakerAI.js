/**
 * caretakerAI.js
 * Main Caretaker AI Module orchestrator.
 * 
 * Analyzes cognitive game results, detects strengths, areas to watch,
 * computes multi-session trends, generates personalized activity recommendations,
 * tracks daily routine compliance (medication, hydration, brain exercises),
 * and produces a clear, empathetic Caretaker Summary using the Gemini API (with robust fallback).
 * 
 * IMPORTANT:
 * This module NEVER provides clinical or medical diagnoses (such as dementia or Alzheimer's).
 * It is strictly for activity engagement analysis, daily routine support, and caregiver insights.
 */

const path = require("path");

// Safely load environment variables from backend/.env if available
function loadEnv() {
  try {
    const dotenv = require("dotenv");
    const fs = require("fs");
    
    // Check possible locations for .env
    const possiblePaths = [
      path.resolve(__dirname, "../../.env"),      // backend/.env relative to src/ai
      path.resolve(__dirname, "../../../.env"),   // root/.env
      path.resolve(process.cwd(), ".env"),       // cwd/.env
      path.resolve(process.cwd(), "backend/.env") // cwd/backend/.env
    ];

    for (const envPath of possiblePaths) {
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        if (process.env.GEMINI_API_KEY) break;
      }
    }
  } catch (envError) {
    // Graceful fallback if dotenv is initialized elsewhere
  }
}

loadEnv();

const { SYSTEM_INSTRUCTION, buildCaretakerPrompt, buildFallbackSummary } = require("./prompts");
const { analyzeGameData, computeMetrics } = require("./trendAnalyzer");
const { generateRecommendations } = require("./recommendationEngine");
const routineManager = require("./routineManager");

/**
 * Calls the Google Gemini API to generate natural language caretaker insights.
 * Uses official @google/genai SDK with safe fallback.
 * 
 * @param {string} prompt - Formatted user prompt
 * @param {string} apiKey - Gemini API Key (accessed via process.env.GEMINI_API_KEY)
 * @param {string} model - Model identifier (default: "gemini-3.6-flash")
 * @returns {Promise<Object|null>} Parsed JSON response from Gemini or null on failure
 */
async function callGeminiAPI(prompt, apiKey, model = (process.env.GEMINI_MODEL || "gemini-3.6-flash")) {
  if (!apiKey) {
    return null;
  }

  // 1. Primary: Official @google/genai SDK
  try {
    const { GoogleGenAI } = require("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });

    const responseText = response?.text;
    if (responseText) {
      const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    }
  } catch (sdkError) {
    // SDK call failed; attempt REST fallback without logging sensitive info
  }

  // 2. Secondary: Direct REST API call via native fetch (Node.js 18+)
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = {
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidateText) {
        const cleaned = candidateText.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
      }
    }
  } catch (restError) {
    // Network or fetch failure; fallback will be used
  }

  return null;
}

/**
 * Main function to analyze cognitive game performance, routine adherence, and return caregiver insights.
 * 
 * Expected Input:
 * {
 *   "user": { "id": "U001", "name": "Demo User", "age": 72, "language": "English" },
 *   "gameResults": [
 *     { "gameType": "memory", "score": 8, "accuracy": 80, "timeTaken": 35, "difficulty": "medium", "playedAt": "2026-08-26" },
 *     { "gameType": "wordRecall", "score": 5, "accuracy": 50, "timeTaken": 60, "difficulty": "easy", "playedAt": "2026-08-26" }
 *   ],
 *   "routineLogs": [ // Optional: Routine completion logs
 *     { "routineId": "morning_tablet", "status": "completed", "timestamp": "2026-08-27T09:05:00Z" }
 *   ]
 * }
 * 
 * Expected Output:
 * {
 *   "summary": "Short understandable summary",
 *   "strengths": [],
 *   "areasToWatch": [],
 *   "trends": [],
 *   "recommendations": [],
 *   "routineCompliance": { ... }
 * }
 * 
 * @param {Object} inputData - Object containing `user`, `gameResults`, and optional `routineLogs`/`routines`
 * @param {Object} [options] - Optional settings ({ apiKey, model })
 * @returns {Promise<Object>} Formatted Caretaker AI analysis report
 */
async function analyzeCaretakerData(inputData = {}, options = {}) {
  const user = inputData.user || { id: "unknown", name: "User" };
  const gameResults = Array.isArray(inputData.gameResults) ? inputData.gameResults : [];

  // Step 1: Run algorithmic performance analysis & trend detection
  const analysis = analyzeGameData(gameResults);

  // Step 2: Generate baseline recommendations
  const ruleRecommendations = generateRecommendations(analysis, user);

  // Step 3: Calculate routine completion compliance
  const routineLogs = inputData.routineLogs || inputData.routineEvents || null;
  const routineStats = routineManager.calculateCompliance(inputData.routines, routineLogs);

  // Step 4: Access Gemini API key securely from environment (.env) or options
  if (!process.env.GEMINI_API_KEY) {
    loadEnv();
  }
  const apiKey = options.apiKey !== undefined ? options.apiKey : process.env.GEMINI_API_KEY;
  const model = options.model || process.env.GEMINI_MODEL || "gemini-3.6-flash";

  let aiResponse = null;
  if (apiKey) {
    const prompt = buildCaretakerPrompt(user, analysis, ruleRecommendations, routineStats);
    aiResponse = await callGeminiAPI(prompt, apiKey, model);
  }

  // Step 5: Assemble final response conforming to expected output format
  let summary = "";
  let strengths = analysis.strengths;
  let areasToWatch = analysis.areasToWatch;
  let trends = analysis.trends;
  let recommendations = ruleRecommendations;

  if (aiResponse && aiResponse.summary) {
    summary = aiResponse.summary;
    if (Array.isArray(aiResponse.refinedStrengths) && aiResponse.refinedStrengths.length > 0) {
      strengths = aiResponse.refinedStrengths;
    }
    if (Array.isArray(aiResponse.refinedAreasToWatch) && aiResponse.refinedAreasToWatch.length > 0) {
      areasToWatch = aiResponse.refinedAreasToWatch;
    }
    if (Array.isArray(aiResponse.refinedRecommendations) && aiResponse.refinedRecommendations.length > 0) {
      recommendations = aiResponse.refinedRecommendations;
    }
  } else {
    // Graceful fallback when Gemini is unavailable, offline, or key is not provided
    summary = buildFallbackSummary(user, analysis, ruleRecommendations, routineStats);
  }

  return {
    summary,
    strengths,
    areasToWatch,
    trends,
    recommendations,
    routineCompliance: routineStats
  };
}

module.exports = {
  analyzeCaretakerData,
  analyzeCognitiveData: analyzeCaretakerData,
  analyzeGameData,
  generateRecommendations,
  routineManager,
  timeService: require("./timeService"),
  getDefaultRoutines: routineManager.getDefaultRoutines,
  getActiveReminders: routineManager.getActiveReminders,
  checkRealTimeRoutines: routineManager.checkRealTimeRoutines,
  extractCurrentTimeHHMM: routineManager.extractCurrentTimeHHMM,
  logRoutineEvent: routineManager.logRoutineEvent,
  calculateCompliance: routineManager.calculateCompliance
};
