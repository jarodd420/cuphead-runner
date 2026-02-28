// Send invite email via Resend. No-op if RESEND_API_KEY is not set.
const from = process.env.RESEND_FROM || 'Fam <onboarding@resend.dev>';

/**
 * Send a fam-invite email to the given address.
 * @param {string} to - Recipient email
 * @param {string} famName - Name of the fam they're invited to
 * @param {string} [inviterName] - Name of the person who invited them
 * @param {string} signupUrl - Full URL to the app signup page
 * @returns {Promise<boolean>} - true if sent, false if skipped (no API key) or failed
 */
async function sendInviteEmail(to, famName, inviterName, signupUrl) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey || !to || !famName || !signupUrl) return false;
  try {
    const { Resend } = require('resend');
    const resend = new Resend(apiKey);
    const who = (inviterName || 'Someone').trim();
    const subject = `You're invited to "${famName}" on Fam`;
    const html = `
      <p>${escapeHtml(who)} invited you to join <strong>${escapeHtml(famName)}</strong> on Fam.</p>
      <p>Sign up with this email to join and see moments from your circle:</p>
      <p><a href="${escapeHtml(signupUrl)}">${escapeHtml(signupUrl)}</a></p>
      <p>If you didn't expect this invite, you can ignore this email.</p>
    `.trim();
    const { error } = await resend.emails.send({ from, to: [to], subject, html });
    if (error) {
      console.error('[email] Resend error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[email] Invite send failed:', e.message);
    return false;
  }
}

function escapeHtml(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { sendInviteEmail };
