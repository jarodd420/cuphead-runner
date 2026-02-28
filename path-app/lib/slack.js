// Post user feedback to a Slack channel via Incoming Webhook.
// Set SLACK_FEEDBACK_WEBHOOK_URL to the webhook URL for your #bots-channel (or any channel).
const webhookUrl = process.env.SLACK_FEEDBACK_WEBHOOK_URL || '';

/**
 * Send a feedback message to Slack.
 * @param {{ name?: string, email?: string }} user - Logged-in user (name, email) for context
 * @param {string} message - The feedback/suggestion text
 * @returns {Promise<boolean>} - true if sent, false if webhook not configured or request failed
 */
async function sendFeedbackToSlack(user, message) {
  if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) return false;
  const text = (message || '').trim();
  if (!text) return false;

  const name = (user && user.name) ? String(user.name).trim() : 'Unknown';
  const email = (user && user.email) ? String(user.email).trim() : '';

  // Slack mrkdwn: *bold* _italic_
  const body = {
    text: `*Fam feedback / suggestion*`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Fam feedback / suggestion*\n*From:* ${escapeSlack(name)}${email ? ` • ${escapeSlack(email)}` : ''}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: escapeSlack(text),
        },
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error('[slack] Webhook error:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error('[slack] Feedback send failed:', e.message);
    return false;
  }
}

function escapeSlack(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(>/g, '&gt;');
}

module.exports = { sendFeedbackToSlack };
