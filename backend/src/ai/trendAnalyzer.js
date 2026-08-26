/**
 * trendAnalyzer.js
 * Analyzes cognitive game results, detects strengths, identifies areas to watch,
 * and calculates performance trends across game sessions.
 */

/**
 * Format game type for human readable display (e.g. "wordRecall" -> "Word Recall")
 * @param {string} gameType 
 * @returns {string}
 */
function formatGameName(gameType) {
  if (!gameType) return "General Cognitive Activity";
  return gameType
    .replace(/[-_]/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Parses and sorts game results chronologically if playedAt date is provided
 * @param {Array} gameResults 
 * @returns {Array} Sorted game results
 */
function sortGameResults(gameResults) {
  if (!Array.isArray(gameResults)) return [];
  return [...gameResults].sort((a, b) => {
    if (a.playedAt && b.playedAt) {
      return new Date(a.playedAt) - new Date(b.playedAt);
    }
    return 0; // Maintain provided order if dates are not distinct
  });
}

/**
 * Calculates statistical metrics grouped by game type and overall
 * @param {Array} gameResults 
 * @returns {Object} Grouped metrics
 */
function computeMetrics(gameResults) {
  const sorted = sortGameResults(gameResults);
  const byGameType = {};

  let totalScore = 0;
  let totalAccuracy = 0;
  let totalTime = 0;
  let validCount = 0;

  sorted.forEach(session => {
    const type = session.gameType || "general";
    if (!byGameType[type]) {
      byGameType[type] = {
        gameType: type,
        displayName: formatGameName(type),
        sessions: [],
        totalScore: 0,
        totalAccuracy: 0,
        totalTime: 0,
        difficulties: {}
      };
    }

    const score = typeof session.score === "number" ? session.score : 0;
    const accuracy = typeof session.accuracy === "number" ? session.accuracy : 0;
    const timeTaken = typeof session.timeTaken === "number" ? session.timeTaken : 0;
    const difficulty = session.difficulty || "medium";

    byGameType[type].sessions.push(session);
    byGameType[type].totalScore += score;
    byGameType[type].totalAccuracy += accuracy;
    byGameType[type].totalTime += timeTaken;
    byGameType[type].difficulties[difficulty] = (byGameType[type].difficulties[difficulty] || 0) + 1;

    totalScore += score;
    totalAccuracy += accuracy;
    totalTime += timeTaken;
    validCount++;
  });

  const gameTypeStats = {};
  for (const [type, data] of Object.entries(byGameType)) {
    const count = data.sessions.length;
    gameTypeStats[type] = {
      gameType: type,
      displayName: data.displayName,
      sessionCount: count,
      avgScore: Math.round((data.totalScore / count) * 10) / 10,
      avgAccuracy: Math.round(data.totalAccuracy / count),
      avgTimeTaken: Math.round(data.totalTime / count),
      sessions: data.sessions,
      difficulties: data.difficulties
    };
  }

  const overall = {
    totalSessions: validCount,
    avgScore: validCount > 0 ? Math.round((totalScore / validCount) * 10) / 10 : 0,
    avgAccuracy: validCount > 0 ? Math.round(totalAccuracy / validCount) : 0,
    avgTimeTaken: validCount > 0 ? Math.round(totalTime / validCount) : 0
  };

  return { gameTypeStats, overall };
}

/**
 * Detects strengths based on accuracy, completion time, score, and difficulty
 * @param {Object} gameTypeStats 
 * @returns {Array<string>} List of strength statements
 */
function detectStrengths(gameTypeStats) {
  const strengths = [];

  for (const [type, stats] of Object.entries(gameTypeStats)) {
    const name = stats.displayName;
    const acc = stats.avgAccuracy;
    const time = stats.avgTimeTaken;

    // High accuracy criteria
    if (acc >= 75) {
      if (stats.difficulties["hard"] || stats.difficulties["medium"]) {
        strengths.push(
          `Strong performance in ${name} activities with ${acc}% accuracy (${time}s avg completion time on moderate/challenging levels).`
        );
      } else {
        strengths.push(
          `High accuracy in ${name} (${acc}%) demonstrating solid engagement.`
        );
      }
    } else if (acc >= 65 && time <= 40) {
      // Good efficiency
      strengths.push(
        `Prompt and confident completion time in ${name} (${time}s average) with steady ${acc}% accuracy.`
      );
    }
  }

  if (strengths.length === 0 && Object.keys(gameTypeStats).length > 0) {
    // Fallback baseline strength to encourage user
    const bestGame = Object.values(gameTypeStats).sort((a, b) => b.avgAccuracy - a.avgAccuracy)[0];
    strengths.push(
      `Active participation and highest consistency in ${bestGame.displayName} (${bestGame.avgAccuracy}% accuracy).`
    );
  }

  return strengths;
}

/**
 * Identifies areas to watch (opportunities for gentler support or lower difficulty)
 * @param {Object} gameTypeStats 
 * @param {Array} trends 
 * @returns {Array<string>} List of areas to watch
 */
function detectAreasToWatch(gameTypeStats, trends = []) {
  const areasToWatch = [];

  for (const [type, stats] of Object.entries(gameTypeStats)) {
    const name = stats.displayName;
    const acc = stats.avgAccuracy;
    const time = stats.avgTimeTaken;

    // Find if this game has a declining trend
    const trendObj = trends.find(t => t.gameType === type);
    const isDeclining = trendObj && trendObj.trend === "declining";

    if (acc < 60) {
      areasToWatch.push(
        `Lower accuracy in ${name} (${acc}% avg) with ${time}s completion time. May benefit from simpler levels or assisted play.`
      );
    } else if (time >= 55 && acc < 70) {
      areasToWatch.push(
        `${name} requires additional time (${time}s avg) to complete. Consider providing a relaxed, unhurried environment.`
      );
    } else if (isDeclining) {
      areasToWatch.push(
        `Slight decline observed in recent ${name} sessions. Adjusting to a lighter difficulty may rebuild confidence.`
      );
    }
  }

  return areasToWatch;
}

/**
 * Calculates trend trajectory across sessions (improving, stable, declining)
 * @param {Object} gameTypeStats 
 * @returns {Array<Object>} List of trend details
 */
function calculateTrends(gameTypeStats) {
  const trends = [];

  for (const [type, stats] of Object.entries(gameTypeStats)) {
    const sessions = stats.sessions;
    const name = stats.displayName;

    if (sessions.length === 1) {
      // Single session baseline
      trends.push({
        gameType: type,
        displayName: name,
        trend: "stable",
        description: `Baseline established for ${name} at ${sessions[0].accuracy}% accuracy.`
      });
      continue;
    }

    // Split sessions into earlier half and recent half to detect trend
    const mid = Math.floor(sessions.length / 2);
    const earlierSessions = sessions.slice(0, mid);
    const recentSessions = sessions.slice(mid);

    const earlierAcc = earlierSessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / earlierSessions.length;
    const recentAcc = recentSessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / recentSessions.length;

    const earlierTime = earlierSessions.reduce((sum, s) => sum + (s.timeTaken || 0), 0) / earlierSessions.length;
    const recentTime = recentSessions.reduce((sum, s) => sum + (s.timeTaken || 0), 0) / recentSessions.length;

    const accDelta = Math.round(recentAcc - earlierAcc);
    const timeDelta = Math.round(recentTime - earlierTime);

    let trend = "stable";
    let description = "";

    if (accDelta >= 6 || (accDelta >= 0 && timeDelta <= -8)) {
      trend = "improving";
      description = `${name}: Improving trend with an accuracy gain of +${accDelta}% (${Math.round(earlierAcc)}% -> ${Math.round(recentAcc)}%) and quicker completion.`;
    } else if (accDelta <= -6 || (accDelta <= 0 && timeDelta >= 15)) {
      trend = "declining";
      description = `${name}: Declining trend with an accuracy drop of ${accDelta}% (${Math.round(earlierAcc)}% -> ${Math.round(recentAcc)}%) or higher time taken.`;
    } else {
      trend = "stable";
      description = `${name}: Stable performance maintained around ${Math.round(recentAcc)}% accuracy across sessions.`;
    }

    trends.push({
      gameType: type,
      displayName: name,
      trend,
      accDelta,
      timeDelta,
      description
    });
  }

  return trends;
}

/**
 * Main trend analysis runner
 * @param {Array} gameResults 
 * @returns {Object} Complete analysis object
 */
function analyzeGameData(gameResults) {
  if (!Array.isArray(gameResults) || gameResults.length === 0) {
    return {
      gameTypeStats: {},
      overall: { totalSessions: 0, avgScore: 0, avgAccuracy: 0, avgTimeTaken: 0 },
      strengths: ["No game activity data recorded yet."],
      areasToWatch: [],
      trends: [],
      trendDescriptions: []
    };
  }

  const { gameTypeStats, overall } = computeMetrics(gameResults);
  const trends = calculateTrends(gameTypeStats);
  const strengths = detectStrengths(gameTypeStats);
  const areasToWatch = detectAreasToWatch(gameTypeStats, trends);

  // Clean strings formatted for direct response
  const trendDescriptions = trends.map(t => t.description);

  return {
    gameTypeStats,
    overall,
    strengths,
    areasToWatch,
    trends: trendDescriptions,
    rawTrends: trends
  };
}

module.exports = {
  formatGameName,
  computeMetrics,
  detectStrengths,
  detectAreasToWatch,
  calculateTrends,
  analyzeGameData
};
