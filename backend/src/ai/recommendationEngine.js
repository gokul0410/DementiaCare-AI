/**
 * recommendationEngine.js
 * Generates personalized, non-clinical cognitive activity recommendations
 * and difficulty adjustments based on user performance analysis.
 */

const ALL_COGNITIVE_GAMES = [
  {
    type: "memory",
    name: "Memory Card Match",
    domain: "Working Memory & Visual Recall",
    defaultDifficulty: "easy"
  },
  {
    type: "wordRecall",
    name: "Word Association & Recall",
    domain: "Verbal Fluency & Language",
    defaultDifficulty: "easy"
  },
  {
    type: "patternMatching",
    name: "Visual Pattern Matching",
    domain: "Spatial Perception & Attention",
    defaultDifficulty: "easy"
  },
  {
    type: "mathPuzzle",
    name: "Gentle Number Puzzles",
    domain: "Executive Function & Logic",
    defaultDifficulty: "easy"
  },
  {
    type: "focusSearch",
    name: "Attention Object Finder",
    domain: "Visual Search & Focus",
    defaultDifficulty: "easy"
  }
];

/**
 * Calculates recommended difficulty based on past performance
 * @param {Object} stats - Stats for a specific game type
 * @returns {string} "easy" | "medium" | "hard"
 */
function determineDifficulty(stats) {
  if (!stats) return "easy";

  const acc = stats.avgAccuracy;
  const difficulties = stats.difficulties || {};

  if (acc >= 85) {
    if (difficulties["hard"]) return "hard";
    if (difficulties["medium"]) return "hard";
    return "medium";
  } else if (acc >= 65) {
    if (difficulties["hard"]) return "medium";
    return "medium";
  } else {
    return "easy";
  }
}

/**
 * Generates actionable cognitive activity recommendations
 * @param {Object} analysis - Output from trendAnalyzer
 * @param {Object} user - User profile object
 * @returns {Array<string>} Formatted recommendation strings
 */
function generateRecommendations(analysis, user = {}) {
  const recommendations = [];
  const gameStats = analysis?.gameTypeStats || {};
  const playedTypes = Object.keys(gameStats);

  // 1. Recommendations based on areas that need gentle reinforcement
  const watchAreas = Object.entries(gameStats).filter(([_, s]) => s.avgAccuracy < 65 || s.avgTimeTaken > 55);
  for (const [type, stats] of watchAreas) {
    const suggestedDiff = determineDifficulty(stats);
    recommendations.push(
      `Practice ${stats.displayName} at '${suggestedDiff}' difficulty with unhurried 5-minute sessions to build comfort and ease.`
    );
  }

  // 2. Recommendations based on strong performance (growth / maintaining challenge)
  const strongAreas = Object.entries(gameStats).filter(([_, s]) => s.avgAccuracy >= 75);
  for (const [type, stats] of strongAreas) {
    const suggestedDiff = determineDifficulty(stats);
    recommendations.push(
      `Maintain strong engagement in ${stats.displayName} by trying '${suggestedDiff}' difficulty to provide an enjoyable, stimulating challenge.`
    );
  }

  // 3. Suggest a new or untried cognitive activity to promote diverse stimulation
  const untriedGame = ALL_COGNITIVE_GAMES.find(g => !playedTypes.includes(g.type));
  if (untriedGame) {
    recommendations.push(
      `Introduce ${untriedGame.name} (${untriedGame.domain}) on 'easy' difficulty for a fresh, engaging cognitive exercise.`
    );
  }

  // 4. Routine & Caretaker tip
  const userName = user.name || "the user";
  recommendations.push(
    `Schedule short, consistent sessions (10-15 minutes) during ${userName}'s most alert time of the day in a calm, supportive setting.`
  );

  return recommendations;
}

module.exports = {
  ALL_COGNITIVE_GAMES,
  determineDifficulty,
  generateRecommendations
};
