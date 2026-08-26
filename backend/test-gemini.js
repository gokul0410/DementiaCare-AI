/**
 * test-gemini.js
 * Verifies backend connection to the Google Gemini API using the official @google/genai SDK.
 * 
 * NOTE: For security, this script never logs or prints the actual API key.
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const { GoogleGenAI } = require("@google/genai");

async function runGeminiConnectionTest() {
  console.log("----------------------------------------");
  console.log("Testing Google Gemini API Connection...");
  console.log("----------------------------------------");

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("❌ FAILURE: GEMINI_API_KEY is not defined in backend/.env");
    console.error("Please add your GEMINI_API_KEY to backend/.env");
    process.exit(1);
  }

  try {
    // Initialize the official Google Gen AI SDK
    const ai = new GoogleGenAI({ apiKey });

    // Send a harmless connection test prompt
    const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";
    const response = await ai.models.generateContent({
      model: modelName,
      contents: "Respond with exactly: Gemini API connection successful."
    });

    const responseText = response?.text ? response.text.trim() : "";

    console.log("Model Response:", responseText);
    console.log("Status: Connection Successful! ✅");
    console.log("----------------------------------------");
  } catch (error) {
    console.error("❌ Connection Failed:", error.message || "Unknown error occurred during Gemini API request.");
    console.error("----------------------------------------");
    process.exit(1);
  }
}

runGeminiConnectionTest();
