/**
 * caretakerAI.js
 * Main Caretaker AI Module orchestrator.
 * 
 * Analyzes cognitive game results, detects strengths, areas to watch,
 * computes multi-session trends, generates personalized activity recommendations,
 * and produces a clear, empathetic Caretaker Summary using Gemini API (with robust fallback).
 * 
 * IMPORTANT:
 * This module NEVER provides clinical or medical diagnoses (such as dementia or Alzheimer's).
 * It is strictly for activity engagement analysis and supportive caregiver insights.
 */

const { SYSTEM_INSTRUCTION, buildCaretakerPrompt, buildFallbackSummary } = require("./prompts");
const { analyzeGameData, computeMetrics } = require("./trendAnalyzer");
const { generateRecommendations } = require("./recommendationEngine");

/**
 * Calls the Google Gemini API to generate natural language caretaker insights.
 * @param {string} prompt - User prompt
 * @param {string} apiKey - Gemini API Key
 * @param {string} model - Gemini model name (default: "gemini-1.5-flash")
 * @returns {Promise<Object|null>} Parsed JSON response from Gemini or null on failure
 */
async function callGeminiAPI(prompt, apiKey, model = "gemini-1.5-flash") {
  if (!apiKey) {
    return null;
  }

  // 1. Try using official Google SDKs if installed in project
  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({
      model: model,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });

    const result = await geminiModel.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (sdkError) {
    // SDK not installed or failed, proceed to direct REST fetch
  }

  // 2. Direct REST API call using native fetch (Node.js 18+)
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

    if (!response.ok) {
      console.warn(`[CaretakerAI] Gemini API returned status ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidateText) {
      // Clean potential markdown backticks if any
      const cleaned = candidateText.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    }
  } catch (err) {
    console.warn(`[CaretakerAI] Gemini API call error: ${err.message}. Using high-quality rule-based fallback.`);
  }

  return null;
}

/**
 * Main function to analyze cognitive game performance and return caregiver insights.
 * 
 * Expected Input:
 * {
 *   "user": { "id": "U001", "name": "Demo User", "age": 72, "language": "English" },
 *   "gameResults": [
 *     { "gameType": "memory", "score": 8, "accuracy": 80, "timeTaken": 35, "difficulty": "medium", "playedAt": "2026-08-26" },
 *     { "gameType": "wordRecall", "score": 5, "accuracy": 50, "timeTaken": 60, "difficulty": "easy", "playedAt": "2026-08-26" }
 *   ]
 * }
 * 
 * Expected Output:
 * {
 *   "summary": "Short understandable summary",
 *   "strengths": [],
 *   "areasToWatch": [],
 *   "trends": [],
 *   "recommendations": []
 * }
 * 
 * @param {Object} inputData - Object containing `user` and `gameResults`
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

  // Step 3: Check for Gemini API key (from options or environment)
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  const model = options.model || process.env.GEMINI_MODEL || "gemini-1.5-flash";

  let aiResponse = null;
  if (apiKey) {
    const prompt = buildCaretakerPrompt(user, analysis, ruleRecommendations);
    aiResponse = await callGeminiAPI(prompt, apiKey, model);
  }

  // Step 4: Assemble final response conforming to expected output format
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
    // Graceful fallback when Gemini is unavailable or not configured
    summary = buildFallbackSummary(user, analysis, ruleRecommendations);
  }

  return {
    summary,
    strengths,
    areasToWatch,
    trends,
    recommendations
  };
}

module.exports = {
  analyzeCaretakerData,
  analyzeGameData,
  generateRecommendations
};
