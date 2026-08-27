/**
 * timeService.js
 * Real-time time synchronization service for DementiaCare AI.
 * 
 * Fetches internet standard time from timeapi.io with instant fallback
 * to system Date on any network interruption.
 */

const DEFAULT_TIMEZONE = "Asia/Kolkata";
const TIME_API_ENDPOINT = "https://timeapi.io/api/v1/time/current/zone?timeZone=";

/**
 * Returns current Date and formatted time object.
 * Queries network time API with a fast timeout (1500ms),
 * with immediate fallback to system local clock.
 * 
 * @param {string} [timeZone=DEFAULT_TIMEZONE] - Target IANA TimeZone identifier
 * @returns {Promise<{ date: Date, timeStr: string, time24: string, time12: string, source: 'network'|'system', timeZone: string }>}
 */
async function getCurrentTime(timeZone = DEFAULT_TIMEZONE) {
  try {
    // Use AbortController for quick timeout fallback
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const response = await fetch(`${TIME_API_ENDPOINT}${encodeURIComponent(timeZone)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && (data.dateTime || data.time)) {
        const dateObj = data.dateTime ? new Date(data.dateTime) : new Date();
        const hour = data.hour !== undefined ? data.hour : dateObj.getHours();
        const minute = data.minute !== undefined ? data.minute : dateObj.getMinutes();
        const second = data.seconds !== undefined ? data.seconds : dateObj.getSeconds();

        const hh = String(hour).padStart(2, '0');
        const mm = String(minute).padStart(2, '0');
        const ss = String(second).padStart(2, '0');

        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        const time12 = `${String(displayHour).padStart(2, '0')}:${mm} ${period}`;

        return {
          date: dateObj,
          time24: `${hh}:${mm}`,
          time12: time12,
          timeStr: `${hh}:${mm}:${ss}`,
          source: 'network',
          timeZone
        };
      }
    }
  } catch (error) {
    // Immediate silent fallback to system Date on any error/timeout
  }

  return getSystemTime(timeZone);
}

/**
 * Synchronously retrieves system clock formatted for the given timezone.
 * 
 * @param {string} [timeZone=DEFAULT_TIMEZONE]
 * @returns {{ date: Date, timeStr: string, time24: string, time12: string, source: 'system', timeZone: string }}
 */
function getSystemTime(timeZone = DEFAULT_TIMEZONE) {
  const now = new Date();
  
  let hours = now.getHours();
  let minutes = now.getMinutes();
  let seconds = now.getSeconds();

  try {
    const timeParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).formatToParts(now);

    const hPart = timeParts.find(p => p.type === 'hour');
    const mPart = timeParts.find(p => p.type === 'minute');
    const sPart = timeParts.find(p => p.type === 'second');

    if (hPart) hours = parseInt(hPart.value, 10);
    if (mPart) minutes = parseInt(mPart.value, 10);
    if (sPart) seconds = parseInt(sPart.value, 10);
  } catch (e) {
    // Fall back to direct local hours/minutes
  }

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const time12 = `${String(displayHour).padStart(2, '0')}:${mm} ${period}`;

  return {
    date: now,
    time24: `${hh}:${mm}`,
    time12: time12,
    timeStr: `${hh}:${mm}:${ss}`,
    source: 'system',
    timeZone
  };
}

module.exports = {
  DEFAULT_TIMEZONE,
  getCurrentTime,
  getSystemTime
};
