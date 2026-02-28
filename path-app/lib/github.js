/**
 * Append a feedback item to the Backlog section of FAM_KANBAN.md in the GitHub repo.
 * Requires: GITHUB_TOKEN, GITHUB_REPO (owner/repo). Optional: GITHUB_KANBAN_PATH (default FAM_KANBAN.md), GITHUB_KANBAN_BRANCH (default main).
 * @param {string} feedbackText - The suggestion/feedback text
 * @param {string} [fromName] - User name for the "(from Name)" label
 * @returns {Promise<boolean>} - true if updated, false if skipped or failed
 */
async function appendFeedbackToKanban(feedbackText, fromName) {
  const token = (process.env.GITHUB_TOKEN || '').trim();
  const repo = (process.env.GITHUB_REPO || '').trim(); // owner/repo
  const path = (process.env.GITHUB_KANBAN_PATH || 'FAM_KANBAN.md').trim();
  const branch = (process.env.GITHUB_KANBAN_BRANCH || 'main').trim();
  if (!token || !repo || !feedbackText) return false;
  const [owner, repoName] = repo.split('/').map(s => s.trim());
  if (!owner || !repoName) return false;

  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };

  try {
    const getUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${path}?ref=${branch}`;
    const getRes = await fetch(getUrl, { headers });
    if (!getRes.ok) {
      if (getRes.status === 404) {
        console.warn('[github] Kanban file not found:', path);
        return false;
      }
      console.error('[github] GET file failed:', getRes.status, await getRes.text());
      return false;
    }
    const getData = await getRes.json();
    const sha = getData.sha;
    let content = Buffer.from(getData.content, 'base64').toString('utf8');

    const label = fromName ? ` (from ${fromName})` : '';
    const safeText = feedbackText.replace(/\r?\n/g, ' ').trim().slice(0, 200);
    const newLine = `- [ ]${label} ${safeText}\n`;

    const backlogHeader = '## Backlog / To do';
    const idx = content.indexOf(backlogHeader);
    if (idx === -1) {
      console.warn('[github] Backlog section not found in kanban');
      return false;
    }
    const afterHeader = idx + backlogHeader.length;
    const nextSection = content.indexOf('\n## ', afterHeader);
    const insertAt = nextSection === -1 ? content.length : nextSection;
    const before = content.slice(0, insertAt);
    const after = content.slice(insertAt);
    if (!before.trimEnd().endsWith('\n')) {
      content = before + '\n' + newLine + after;
    } else {
      content = before + newLine + after;
    }

    const putUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${path}`;
    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Fam kanban: add feedback from app',
        content: Buffer.from(content, 'utf8').toString('base64'),
        sha,
        branch,
      }),
    });
    if (!putRes.ok) {
      console.error('[github] PUT file failed:', putRes.status, await putRes.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error('[github] Kanban update failed:', e.message);
    return false;
  }
}

module.exports = { appendFeedbackToKanban };
