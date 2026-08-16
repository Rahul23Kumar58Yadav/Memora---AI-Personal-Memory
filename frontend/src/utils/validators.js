// ----------------------------------------------------------------------
// Memora — validators.js
// Shared validation logic for auth forms and beyond. Keeps SignupPage's
// password-strength meter and both auth forms' error messages consistent
// instead of re-implementing regex checks per component.
// ----------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return EMAIL_REGEX.test(String(email).trim().toLowerCase());
}

export function isRequired(value) {
  return value !== null && value !== undefined && String(value).trim().length > 0;
}

/**
 * Password strength, 0–4. Mirrors the meter shown on SignupPage.
 * Returns { score, label, checks } where checks flags which rules passed.
 */
export function getPasswordStrength(password = "") {
  const checks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  const labels = ["Weak", "Fair", "Good", "Strong"];

  return {
    score,
    label: password ? labels[Math.max(score - 1, 0)] : "",
    checks,
  };
}

export function isValidPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

/**
 * Validates the login form. Returns an error string, or "" if valid.
 */
export function validateLoginForm({ email, password }) {
  if (!isRequired(email) || !isRequired(password)) {
    return "Enter your email and password to continue.";
  }
  if (!isValidEmail(email)) {
    return "Enter a valid email address.";
  }
  return "";
}

/**
 * Validates the signup form. Returns an error string, or "" if valid.
 */
export function validateSignupForm({ name, email, password, agreed }) {
  if (!isRequired(name) || !isRequired(email) || !isRequired(password)) {
    return "Fill in every field to create your account.";
  }
  if (!isValidEmail(email)) {
    return "Enter a valid email address.";
  }
  if (!isValidPassword(password)) {
    return "Use at least 8 characters for your password.";
  }
  if (!agreed) {
    return "Accept the terms to continue.";
  }
  return "";
}

/**
 * Validates a snooze/due-date picker value — must be a real date and
 * not in the past.
 */
export function validateFutureDate(dateString) {
  if (!isRequired(dateString)) return "Pick a date.";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "That doesn't look like a valid date.";
  if (startOfToday() > date) return "Pick a date that hasn't already passed.";
  return "";
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Basic client-side check before hitting the search API — avoids firing
 * a request for a 1-character query.
 */
export function isSearchableQuery(query, minLength = 2) {
  return isRequired(query) && String(query).trim().length >= minLength;
}