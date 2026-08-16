import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend -- notification.service.js
// Delivery layer for digests (and, longer-term, any other user-facing
// notification). Two channels -- email via Resend, push via FCM -- kept
// behind small dedicated functions so digestGenerator.js's
// sendDigestNotification() doesn't need to know which channel(s) a user
// actually has enabled; it just calls this and lets the channel routing
// happen here based on user.digestSettings.channel.
//
// Both providers are OPTIONAL in env.js (RESEND_API_KEY / FCM_SERVER_KEY
// may be unset in early development) -- missing credentials log a
// warning and skip that channel rather than throwing, so a dev running
// locally without real API keys doesn't get blocked on notification
// delivery to test the rest of the app.
// ----------------------------------------------------------------------

const RESEND_API_URL = "https://api.resend.com/emails";
const FCM_SEND_URL = "https://fcm.googleapis.com/fcm/send";

/**
 * Routes a generated digest to the user's configured channel(s).
 * Called by services/llm/digestGenerator.js immediately after a Digest
 * document is created.
 */
export async function sendDigestNotification(user, digest) {
  const channel = user.digestSettings.channel;
  const tasks = [];

  if (channel === "email" || channel === "both") {
    tasks.push(sendDigestEmail(user, digest));
  }
  if (channel === "push" || channel === "both") {
    tasks.push(sendDigestPush(user, digest));
  }

  // Run both channels in parallel but don't let one channel's failure
  // hide the other's success/failure -- allSettled, not Promise.all.
  const results = await Promise.allSettled(tasks);
  results.forEach((r) => {
    if (r.status === "rejected") {
      logger.error("Digest delivery channel failed", { userId: user._id.toString(), error: r.reason?.message });
    }
  });
}

// ---- Email ------------------------------------------------------------------

async function sendDigestEmail(user, digest) {
  if (!env.RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not configured — skipping digest email", { userId: user._id.toString() });
    return;
  }
  if (!user.email) return;

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: user.email,
      subject: buildEmailSubject(digest),
      html: buildEmailHtml(user, digest),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend request failed (${response.status}): ${body}`);
  }
}

function buildEmailSubject(digest) {
  const { overdue, dueToday } = digest.stats;
  if (overdue > 0) return `${overdue} thing${overdue > 1 ? "s" : ""} overdue — your Memora digest`;
  if (dueToday > 0) return `${dueToday} thing${dueToday > 1 ? "s" : ""} due today — your Memora digest`;
  return "Your Memora digest";
}

function buildEmailHtml(user, digest) {
  const itemRows = digest.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #2a2e42;">
            <p style="margin: 0; color: #EDEFF5; font-size: 15px;">${escapeHtml(item.text)}</p>
            <p style="margin: 4px 0 0; color: #8A8FA3; font-size: 12px; font-family: monospace;">${escapeHtml(item.due)}</p>
          </td>
        </tr>`
    )
    .join("");

  return `
  <div style="background:#0F1220; padding: 32px 16px; font-family: -apple-system, sans-serif;">
    <div style="max-width: 480px; margin: 0 auto;">
      <p style="color:#D4A24C; font-size: 13px; letter-spacing: 0.5px; margin: 0 0 16px;">MEMORA</p>
      <h1 style="color:#EDEFF5; font-size: 22px; margin: 0 0 8px;">Good morning, ${escapeHtml(user.name.split(" ")[0])}.</h1>
      <p style="color:#8A8FA3; font-size: 14px; margin: 0 0 24px;">Here's what's still open.</p>
      <table style="width: 100%; border-collapse: collapse;">${itemRows}</table>
      ${digest.stats.kept > 0 ? `<p style="color:#5EC8B8; font-size: 13px; margin-top: 20px;">✓ ${digest.stats.kept} kept since your last digest.</p>` : ""}
      <a href="${env.CLIENT_URL}/commitments" style="display:inline-block; margin-top: 24px; background:#D4A24C; color:#0F1220; text-decoration:none; padding: 12px 24px; border-radius: 999px; font-size: 14px; font-weight: 600;">Open Memora</a>
    </div>
  </div>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---- Push ---------------------------------------------------------------------

async function sendDigestPush(user, digest) {
  if (!env.FCM_SERVER_KEY) {
    logger.warn("FCM_SERVER_KEY not configured — skipping digest push", { userId: user._id.toString() });
    return;
  }
  if (!user.pushTokens?.length) return;

  const { title, body } = buildPushCopy(digest);

  const results = await Promise.allSettled(
    user.pushTokens.map((token) =>
      fetch(FCM_SEND_URL, {
        method: "POST",
        headers: {
          Authorization: `key=${env.FCM_SERVER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: token,
          notification: { title, body, sound: "default" },
          data: { type: "digest", digestId: digest.id },
        }),
      })
    )
  );

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    logger.warn("Some push notifications failed to send", { userId: user._id.toString(), failureCount: failures.length });
  }
}

function buildPushCopy(digest) {
  const { overdue, dueToday, kept } = digest.stats;

  if (overdue > 0) {
    return { title: "Something's overdue", body: `${overdue} thing${overdue > 1 ? "s" : ""} slipped past due — worth a look.` };
  }
  if (dueToday > 0) {
    return { title: "Due today", body: `${dueToday} thing${dueToday > 1 ? "s" : ""} due today.` };
  }
  if (kept > 0) {
    return { title: "Nice work", body: `You kept ${kept} commitment${kept > 1 ? "s" : ""}. Nothing else pending.` };
  }
  return { title: "Memora", body: "Your daily digest is ready." };
}

export default { sendDigestNotification };