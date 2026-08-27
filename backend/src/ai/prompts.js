/**
 * prompts.js
 * Prompt templates and system instructions for the Caretaker AI module.
 * 
 * IMPORTANT SAFETY GUIDELINE:
 * The AI must NEVER diagnose dementia, Alzheimer's, or any medical condition.
 * It strictly analyzes engagement, game performance, and provides activity recommendations.
 */

const SYSTEM_INSTRUCTION = `You are a supportive, compassionate Caretaker AI Assistant designed to help caregivers and family members understand a senior user's cognitive game activity, daily routine adherence, and engagement.

CRITICAL SAFETY & ETHICAL RULES:
1. NEVER diagnose dementia, Alzheimer's, cognitive impairment, or any medical condition.
2. DO NOT use clinical or diagnostic language (e.g., "cognitive decline", "symptom", "pathology", "disease").
3. Use constructive, encouraging, activity-focused terminology (e.g., "performing strongly in memory activities", "may benefit from gentler pacing in word games", "steady engagement", "good routine adherence").
4. Keep the summary clear, respectful, easy to understand for non-medical caretakers, and directly actionable.
5. All insights must be grounded solely in the provided game performance and routine completion data.`;

/**
 * Builds the user prompt for the Gemini API.
 * @param {Object} user - User profile ({ id, name, age, language })
 * @param {Object} analysis - Statistical analysis containing metrics, strengths, areasToWatch, trends
 * @param {Array} ruleRecommendations - Initial algorithmic recommendations
 * @param {Object} [routineStats] - Optional routine compliance stats
 * @returns {string} Formatted prompt string for Gemini
 */
function buildCaretakerPrompt(user, analysis, ruleRecommendations, routineStats = null) {
  const userName = user?.name || "User";
  const userAge = user?.age ? `${user.age}-year-old` : "Senior";
  const userLang = user?.language || "English";

  const routineSection = routineStats && routineStats.totalRoutines > 0
    ? `\nDAILY ROUTINE ADHERENCE:
- Completion Status: ${routineStats.summaryText || 'Routines tracked'}
- Adherence Rate: ${routineStats.complianceRate}% (${routineStats.completedCount}/${routineStats.totalRoutines} completed, ${routineStats.snoozedCount || 0} snoozed)`
    : "";

  return `Please analyze the cognitive game performance and daily routine data for ${userName} (${userAge}, Preferred Language: ${userLang}).

PERFORMANCE SUMMARY:
- Total Game Sessions: ${analysis.overall?.totalSessions || 0}
- Average Accuracy: ${analysis.overall?.avgAccuracy || 0}%
- Average Time Taken: ${analysis.overall?.avgTimeTaken || 0} seconds
${routineSection}

IDENTIFIED STRENGTHS:
${analysis.strengths && analysis.strengths.length > 0 
  ? analysis.strengths.map(s => `- ${s}`).join("\n") 
  : "- Baseline session completed; strengths will emerge with more sessions."}

AREAS TO WATCH (OPPORTUNITIES FOR SUPPORT):
${analysis.areasToWatch && analysis.areasToWatch.length > 0 
  ? analysis.areasToWatch.map(a => `- ${a}`).join("\n") 
  : "- No specific areas of concern identified in recent sessions."}

ACTIVITY TRENDS:
${analysis.trends && analysis.trends.length > 0 
  ? analysis.trends.map(t => `- ${typeof t === 'string' ? t : `${t.gameType || 'Activity'}: ${t.trend || 'stable'} - ${t.description || ''}`}`).join("\n") 
  : "- Single session recorded; trend tracking will activate across future sessions."}

PRELIMINARY RECOMMENDATIONS:
${ruleRecommendations && ruleRecommendations.length > 0 
  ? ruleRecommendations.map(r => `- ${r}`).join("\n") 
  : "- Continue regular gentle daily cognitive play."}

TASK:
Generate a concise, empathetic Caretaker Summary and refined activity guidance. If routine adherence data is available, briefly include a natural, supportive mention of their routine consistency.

Return your response strictly in the following JSON format without Markdown code fences or extra text:
{
  "summary": "2-3 empathetic, clear sentences summarizing overall activity engagement, notable positive highlights, routine consistency if applicable, and general encouragement.",
  "refinedStrengths": ["Bullet points highlighting specific activities the user excelled at"],
  "refinedAreasToWatch": ["Bullet points gently noting activities that took more effort or had lower accuracy"],
  "refinedRecommendations": ["Bullet points of 2-4 practical, fun, non-medical cognitive activities and suggested difficulty levels"]
}`;
}

/**
 * Generates a rule-based fallback summary when Gemini API is unavailable or offline.
 * @param {Object} user - User profile
 * @param {Object} analysis - Analysis results
 * @param {Array} recommendations - Recommendations list
 * @param {Object} [routineStats] - Optional routine compliance stats
 * @returns {string} Clean, friendly summary
 */
function buildFallbackSummary(user, analysis, recommendations, routineStats = null) {
  const userName = user?.name || "The user";
  const total = analysis?.overall?.totalSessions || 0;
  const avgAcc = analysis?.overall?.avgAccuracy || 0;

  let sentences = [
    `${userName} completed ${total} cognitive game session${total === 1 ? '' : 's'} with an overall average accuracy of ${avgAcc}%.`
  ];

  if (analysis?.strengths && analysis.strengths.length > 0) {
    sentences.push(analysis.strengths[0]);
  }

  if (analysis?.areasToWatch && analysis.areasToWatch.length > 0) {
    sentences.push(`Focus area: ${analysis.areasToWatch[0]}`);
  } else {
    sentences.push("Consistent and steady engagement was observed across all recorded activities.");
  }

  if (routineStats && routineStats.totalRoutines > 0) {
    sentences.push(`Daily routine adherence is at ${routineStats.complianceRate}% with ${routineStats.completedCount} of ${routineStats.totalRoutines} routines completed.`);
  }

  sentences.push("Continuing regular, relaxed daily sessions is recommended to keep activities enjoyable.");

  return sentences.join(" ");
}

module.exports = {
  SYSTEM_INSTRUCTION,
  buildCaretakerPrompt,
  buildFallbackSummary
};
