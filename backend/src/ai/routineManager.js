/**
 * routineManager.js
 * Modular daily routine schedule and reminder management for the Caretaker AI module.
 * 
 * Manages daily wellness, hydration, brain exercises, and medication reminder schedules,
 * executes real-time trigger matching against system and network clock (timeService),
 * logs adherence/completion events, and calculates daily compliance rates.
 */

const { getCurrentTime, getSystemTime } = require("./timeService");

const DEFAULT_ROUTINES = [
  {
    id: "morning_tablet",
    title: "Morning Tablet",
    time: "09:00", // 24-hour HH:mm
    displayTime: "09:00 AM",
    category: "medication",
    message: "Time for your morning tablet! 💊",
    icon: "💊"
  },
  {
    id: "brain_exercise",
    title: "Brain Exercise",
    time: "11:00",
    displayTime: "11:00 AM",
    category: "cognitive",
    message: "Ready for a fun 5-minute memory game? 🧠",
    icon: "🧠"
  },
  {
    id: "hydration_check",
    title: "Hydration Check",
    time: "15:00",
    displayTime: "03:00 PM",
    category: "wellness",
    message: "Let's take a quick break for a glass of water! 🥛",
    icon: "🥛"
  },
  {
    id: "evening_tablet",
    title: "Evening Tablet",
    time: "20:00",
    displayTime: "08:00 PM",
    category: "medication",
    message: "Time for your evening tablet before bed! 🌙",
    icon: "🌙"
  }
];

// In-memory event store for logged routine events
let inMemoryEventLogs = [];

/**
 * Returns a cloned list of default daily routines
 * @returns {Array<Object>}
 */
function getDefaultRoutines() {
  return JSON.parse(JSON.stringify(DEFAULT_ROUTINES));
}

/**
 * Extracts current local hours and minutes in HH:MM format from Date object or system time
 * @param {Date} [dateObj=new Date()] 
 * @returns {{ time24: string, hours: number, minutes: number }}
 */
function extractCurrentTimeHHMM(dateObj = new Date()) {
  const d = dateObj instanceof Date ? dateObj : new Date();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return {
    time24: `${hh}:${mm}`,
    hours,
    minutes
  };
}

/**
 * Converts a time representation (Date object, "09:00", "09:00 AM", ISO string) into minutes from midnight.
 * @param {string|Date} [timeInput=new Date()] 
 * @returns {number} Minutes from midnight (0 - 1439)
 */
function timeToMinutes(timeInput = new Date()) {
  if (!timeInput) {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  if (timeInput instanceof Date) {
    return timeInput.getHours() * 60 + timeInput.getMinutes();
  }

  if (typeof timeInput === "string") {
    // Check if ISO date string e.g. "2026-08-27T09:15:00Z"
    if (timeInput.includes("T") || timeInput.includes("-")) {
      const parsedDate = new Date(timeInput);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.getHours() * 60 + parsedDate.getMinutes();
      }
    }

    // Match 12-hour or 24-hour time format: "09:00", "9:00 AM", "3:00 PM"
    const match = timeInput.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3] ? match[3].toUpperCase() : null;

      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;

      return hours * 60 + minutes;
    }
  }

  return 0;
}

/**
 * Retrieves active reminders within a given time window around a reference time (default: new Date() system time).
 * 
 * @param {string|Date} [referenceTime=new Date()] - Reference time to check (defaults directly to new Date() system time)
 * @param {Object} [options] - Configuration options
 * @param {number} [options.windowMinutes=30] - Active time window in minutes after schedule time
 * @param {Array<Object>} [options.routines] - Custom routine definitions (defaults to DEFAULT_ROUTINES)
 * @returns {Array<Object>} List of active routine reminders
 */
function getActiveReminders(referenceTime = new Date(), options = {}) {
  const windowMinutes = options.windowMinutes !== undefined ? options.windowMinutes : 30;
  const routines = Array.isArray(options.routines) && options.routines.length > 0
    ? options.routines
    : DEFAULT_ROUTINES;

  const currentMinutes = timeToMinutes(referenceTime || new Date());

  return routines.filter(routine => {
    const routineMinutes = timeToMinutes(routine.time);
    // Active if current time is within [routineMinutes - 5, routineMinutes + windowMinutes]
    return currentMinutes >= (routineMinutes - 5) && currentMinutes <= (routineMinutes + windowMinutes);
  });
}

/**
 * Real-time routine checker using network internet time (with system Date fallback).
 * 
 * @param {Object} [options]
 * @param {string} [options.timeZone="Asia/Kolkata"]
 * @param {number} [options.windowMinutes=30]
 * @param {Array<Object>} [options.routines]
 * @returns {Promise<{ activeReminders: Array<Object>, currentTime: Object }>}
 */
async function checkRealTimeRoutines(options = {}) {
  const timeZone = options.timeZone || "Asia/Kolkata";
  const currentTime = await getCurrentTime(timeZone);
  const activeReminders = getActiveReminders(currentTime.date, options);

  return {
    activeReminders,
    currentTime
  };
}

/**
 * Logs a routine interaction event (e.g. "completed", "snoozed", "dismissed").
 * 
 * @param {string} routineId - Identifier of the routine
 * @param {string} [status="completed"] - Event status ("completed" | "snoozed" | "dismissed")
 * @param {string|Date} [timestamp=new Date()] - Event timestamp (defaults to current system time)
 * @param {Array<Object>} [externalLogs] - Optional external array to append to
 * @returns {Object} The recorded event log object
 */
function logRoutineEvent(routineId, status = "completed", timestamp = new Date(), externalLogs = null) {
  const formattedTimestamp = timestamp instanceof Date ? timestamp.toISOString() : String(timestamp);
  
  const event = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    routineId,
    status: status.toLowerCase(),
    timestamp: formattedTimestamp
  };

  if (Array.isArray(externalLogs)) {
    externalLogs.push(event);
  } else {
    inMemoryEventLogs.push(event);
  }

  return event;
}

/**
 * Calculates daily routine completion compliance rate and summary stats.
 * 
 * @param {Array<Object>} [routines] - Array of routine definitions (defaults to DEFAULT_ROUTINES)
 * @param {Array<Object>} [logs] - Array of routine log events (defaults to in-memory logs)
 * @param {string|Date} [targetDate] - Optional date filter ("YYYY-MM-DD")
 * @returns {Object} Compliance report
 */
function calculateCompliance(routines = null, logs = null, targetDate = null) {
  const routineList = Array.isArray(routines) && routines.length > 0 ? routines : DEFAULT_ROUTINES;
  const activeLogs = Array.isArray(logs) ? logs : inMemoryEventLogs;
  const totalRoutines = routineList.length;

  let filteredLogs = activeLogs;
  if (targetDate) {
    const dateStr = typeof targetDate === "string" 
      ? targetDate.substring(0, 10) 
      : new Date(targetDate).toISOString().substring(0, 10);

    filteredLogs = activeLogs.filter(log => {
      const logDate = log.timestamp ? log.timestamp.substring(0, 10) : "";
      return logDate === dateStr;
    });
  }

  const completedRoutines = new Set();
  const snoozedRoutines = new Set();

  filteredLogs.forEach(log => {
    if (log.status === "completed") {
      completedRoutines.add(log.routineId);
    } else if (log.status === "snoozed") {
      snoozedRoutines.add(log.routineId);
    }
  });

  const completedCount = completedRoutines.size;
  const snoozedCount = snoozedRoutines.size;
  const complianceRate = totalRoutines > 0 ? Math.round((completedCount / totalRoutines) * 100) : 0;

  return {
    totalRoutines,
    completedCount,
    snoozedCount,
    pendingCount: Math.max(0, totalRoutines - completedCount),
    complianceRate,
    summaryText: `${completedCount} of ${totalRoutines} daily routines completed (${complianceRate}% adherence)`
  };
}

/**
 * Clears in-memory logs (useful for unit tests)
 */
function clearLogs() {
  inMemoryEventLogs = [];
}

module.exports = {
  DEFAULT_ROUTINES,
  getDefaultRoutines,
  extractCurrentTimeHHMM,
  timeToMinutes,
  getActiveReminders,
  checkRealTimeRoutines,
  logRoutineEvent,
  calculateCompliance,
  clearLogs
};
