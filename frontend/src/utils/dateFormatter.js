// ----------------------------------------------------------------------
// Memora — dateFormatter.js
// All date/time display logic in one place. Backend sends raw ISO
// timestamps; components should never format dates inline — call these
// instead so "Today, 6:00 PM" / "3 days ago" stays consistent everywhere.
// ----------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/**
 * Formats a due date/time the way commitment cards show it:
 * "Today, 6:00 PM" | "Tomorrow" | "Fri, Aug 8" | "No deadline set"
 */
export function formatDueDate(isoString) {
  if (!isoString) return "No deadline set";

  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS);

  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 6) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Relative "time ago" for source context lines: "2 minutes ago",
 * "3 days ago", "just now".
 */
export function formatTimeAgo(isoString) {
  if (!isoString) return "";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.round(diffMs / 1000);

  if (diffSec < 30) return "just now";
  if (diffSec < 60) return `${diffSec} seconds ago`;

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;

  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;

  const diffWeek = Math.round(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek} week${diffWeek === 1 ? "" : "s"} ago`;

  return new Date(isoString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Derives the urgency bucket from a due date, mirroring backend logic
 * for optimistic UI updates before the server responds.
 * Returns one of: "overdue" | "today" | "upcoming" | "stale"
 */
export function getUrgencyFromDueDate(isoString) {
  if (!isoString) return "stale";

  const date = new Date(isoString);
  const now = new Date();

  if (date < now && !isSameDay(date, now)) return "overdue";
  if (isSameDay(date, now)) return date < now ? "overdue" : "today";
  return "upcoming";
}

/**
 * Groups a due date into the section labels CommitmentList expects:
 * "Overdue" | "Today" | "This week" | "Fading" | "Kept"
 */
export function getCommitmentGroup({ dueDate, urgency }) {
  if (urgency === "kept") return "Kept";
  if (!dueDate) return "Fading";

  const bucket = getUrgencyFromDueDate(dueDate);
  if (bucket === "overdue") return "Overdue";
  if (bucket === "today") return "Today";

  const diffDays = Math.round((startOfDay(dueDate) - startOfDay(new Date())) / DAY_MS);
  return diffDays <= 7 ? "This week" : "Fading";
}

/**
 * "August 2026" — used to group digest history by month.
 */
export function formatMonthYear(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/**
 * "Today" | "Yesterday" | "Aug 3" — used as the DigestCard day label.
 */
export function formatDayLabel(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  if (isSameDay(date, now)) return "Today";
  if (isSameDay(date, new Date(now.getTime() - DAY_MS))) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Full readable date for detail views: "August 3, 2026, 6:00 PM"
 */
export function formatFullDateTime(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * HH:mm (24h) — for <input type="time"> values, e.g. digest delivery time.
 */
export function toTimeInputValue(isoString) {
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}