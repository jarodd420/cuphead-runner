const express = require('express');
const multer = require('multer');
const { getDb } = require('../appDb');
const { uploadToSupabase } = require('../lib/storage');
const { sendInviteEmail } = require('../lib/email');
const { sendFeedbackToSlack } = require('../lib/slack');
const { appendFeedbackToKanban } = require('../lib/github');

function looksLikeRealFeedback(text) {
  if (!text || text.length < 10) return false;
  const letters = (text.match(/[a-zA-Z]/g) || []).length;
  if (letters < 2) return false;
  return true;
}

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function requireAuth(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: 'Not logged in' });
  next();
}

router.use(requireAuth);

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowed.includes(req.file.mimetype)) return res.status(400).json({ error: 'Invalid file type' });
  const ext = (req.file.mimetype === 'image/jpeg' ? 'jpg' : req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/gif' ? 'gif' : 'webp');
  const path = `${req.session.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  try {
    const url = await uploadToSupabase(req.file.buffer, req.file.mimetype, path);
    if (!url) return res.status(503).json({ error: 'Image storage not configured (set SUPABASE_URL and SUPABASE_SERVICE_KEY)' });
    res.json({ url });
  } catch (e) {
    console.error('[upload] Supabase storage error:', e.message);
    res.status(500).json({ error: e.message || 'Upload failed' });
  }
});

router.get('/timeline', async (req, res) => {
  const db = getDb();
  const userId = req.session.userId;
  const friendIds = await db.getFriendIds(userId);
  const moments = await db.getMomentsForUserIds(friendIds, 100);
  const userIds = [...new Set(moments.map(m => m.user_id))];
  const users = await db.getUsersByIds(userIds);
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));
  const momentIds = moments.map(m => m.id);
  const commentsByMoment = await db.getCommentsByMomentIds(momentIds);
  const reactionsByMoment = await db.getReactionsByMomentIds(momentIds);
  const rows = moments.map(m => {
    const momentComments = (commentsByMoment[m.id] || [])
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(c => ({
        id: c.id,
        user_id: c.user_id,
        user_name: userMap[c.user_id]?.name,
        body: c.body,
        created_at: c.created_at,
      }));
    const momentReactions = reactionsByMoment[m.id] || [];
    const reactionCounts = {};
    momentReactions.forEach(r => {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
    });
    const myReaction = momentReactions.find(r => r.user_id == userId || String(r.user_id) === String(userId));
    return {
      id: m.id,
      user_id: m.user_id,
      type: m.type,
      body: m.body,
      image_url: m.image_url,
      created_at: m.created_at,
      user_name: userMap[m.user_id]?.name,
      user_avatar: userMap[m.user_id]?.avatar_url,
      user_cover: userMap[m.user_id]?.cover_url,
      comments: momentComments,
      reactions: reactionCounts,
      my_reaction: myReaction ? myReaction.emoji : null,
    };
  });
  res.json({ moments: rows });
});

router.post('/moments', async (req, res) => {
  const { type, body, image_url } = req.body || {};
  if (!type) return res.status(400).json({ error: 'Moment type required' });
  const db = getDb();
  const moment = await db.insertMoment({
    user_id: req.session.userId,
    type,
    body: (body || '').trim() || null,
    image_url: image_url || null,
  });
  const user = await db.getUserById(moment.user_id);
  res.status(201).json({
    moment: {
      ...moment,
      user_name: user?.name,
      user_avatar: user?.avatar_url,
    },
  });
});

router.post('/moments/:id/comments', async (req, res) => {
  const momentId = Number(req.params.id);
  const { body } = req.body || {};
  const bodyTrim = (body || '').trim();
  if (!bodyTrim) return res.status(400).json({ error: 'Comment text required' });
  const db = getDb();
  const userId = req.session.userId;
  const friendIds = await db.getFriendIds(userId);
  const moment = await db.getMomentById(momentId);
  if (!moment) return res.status(404).json({ error: 'Moment not found' });
  if (!friendIds.has(moment.user_id)) return res.status(403).json({ error: 'Cannot comment on this moment' });
  const comment = await db.insertComment({ moment_id: momentId, user_id: userId, body: bodyTrim });
  const user = await db.getUserById(userId);
  res.status(201).json({
    comment: {
      id: comment.id,
      user_id: comment.user_id,
      user_name: user?.name,
      body: comment.body,
      created_at: comment.created_at,
    },
  });
});

async function handleReaction(req, res) {
  const { moment_id: rawMomentId, emoji } = req.body || {};
  const momentId = Number(rawMomentId);
  if (rawMomentId == null || rawMomentId === '' || Number.isNaN(momentId)) return res.status(400).json({ error: 'Invalid moment id' });
  const db = getDb();
  const userId = req.session.userId;
  const friendIds = await db.getFriendIds(userId);
  const moment = await db.getMomentById(momentId);
  if (!moment) return res.status(404).json({ error: 'Moment not found' });
  if (!friendIds.has(moment.user_id)) return res.status(403).json({ error: 'Cannot react to this moment' });
  let result;
  try {
    result = await db.upsertReaction(momentId, userId, emoji);
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Invalid emoji' });
  }
  res.json({ reactions: result.reactionCounts, my_reaction: result.my_reaction });
}

router.post('/reactions', handleReaction);
router.post('/moments/:id/reactions', (req, res) => {
  req.body = req.body || {};
  req.body.moment_id = req.params.id;
  req.body.emoji = req.body.emoji;
  return handleReaction(req, res);
});

router.get('/users', async (req, res) => {
  const db = getDb();
  const q = (req.query.q || '').trim().toLowerCase();
  const users = await db.getUsersSearch(req.session.userId, q, 30);
  res.json({ users });
});

router.get('/fams', async (req, res) => {
  const db = getDb();
  const fams = await db.getFamsForUser(req.session.userId);
  const famsWithMembers = await Promise.all(fams.map(async (f) => {
    const members = await db.getFamMembers(f.id);
    return {
      ...f,
      members: members.map((m) => ({ id: m.id, name: m.name, avatar_url: m.avatar_url })),
    };
  }));
  res.json({ fams: famsWithMembers });
});

router.post('/fams', async (req, res) => {
  const { name } = req.body || {};
  const db = getDb();
  const fam = await db.createFam({ name: (name || '').trim() || 'My Fam', created_by: req.session.userId });
  res.status(201).json({ fam });
});

router.get('/fams/:id/members', async (req, res) => {
  const famId = Number(req.params.id);
  if (Number.isNaN(famId)) return res.status(400).json({ error: 'Invalid fam' });
  const db = getDb();
  const isMember = await db.isFamMember(famId, req.session.userId);
  if (!isMember) return res.status(403).json({ error: 'Not a member of this fam' });
  const members = await db.getFamMembers(famId);
  res.json({ members });
});

router.post('/fams/:id/invite', async (req, res) => {
  const famId = Number(req.params.id);
  const { email } = req.body || {};
  const emailStr = (email || '').toString().trim().toLowerCase();
  if (!emailStr) return res.status(400).json({ error: 'Email required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) return res.status(400).json({ error: 'Invalid email' });
  const db = getDb();
  const isMember = await db.isFamMember(famId, req.session.userId);
  if (!isMember) return res.status(403).json({ error: 'Not a member of this fam' });
  const existingUser = await db.getUserByEmail(emailStr);
  if (existingUser) {
    await db.addFamMember(famId, existingUser.id, req.session.userId);
    res.json({ ok: true, added: true, message: 'Added to fam' });
    return;
  }
  await db.addFamInvite(famId, emailStr, req.session.userId);
  const fam = await db.getFamById(famId);
  const inviter = await db.getUserById(req.session.userId);
  const baseUrl = (process.env.INVITE_BASE_URL || '').trim() || `${req.protocol}://${req.get('host') || req.hostname}`;
  const signupUrl = `${baseUrl.replace(/\/$/, '')}/`;
  const hasResendKey = !!(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim());
  const sent = await sendInviteEmail(emailStr, (fam && fam.name) || 'a fam', inviter && inviter.name, signupUrl);
  if (!sent) {
    console.warn('[invite] Email not sent. RESEND_API_KEY set:', hasResendKey);
  }
  res.json({
    ok: true,
    invited: true,
    message: sent ? 'Invite sent. They\'ll get an email and can sign up to join.' : 'Invite saved. They\'ll join when they sign up. (Configure RESEND_API_KEY to send invite emails.)',
  });
});

router.get('/profile', async (req, res) => {
  const db = getDb();
  const userId = req.session.userId;
  const user = await db.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    profile: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url || null,
      cover_url: user.cover_url || null,
      bio: user.bio || null,
    },
  });
});

router.patch('/profile', async (req, res) => {
  const { name, avatar_url, cover_url, bio } = req.body || {};
  const db = getDb();
  const userId = req.session.userId;
  const user = await db.updateUser(userId, { name, avatar_url, cover_url, bio });
  if (!user) return res.status(404).json({ error: 'User not found' });
  req.session.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    cover_url: user.cover_url,
    bio: user.bio,
  };
  res.json({
    profile: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      cover_url: user.cover_url,
      bio: user.bio,
    },
  });
});

router.post('/feedback', async (req, res) => {
  const message = (req.body && req.body.message) ? String(req.body.message).trim() : '';
  if (!message) return res.status(400).json({ error: 'Please enter your feedback or suggestion.' });
  if (message.length > 2000) return res.status(400).json({ error: 'Message is too long (max 2000 characters).' });
  const db = getDb();
  const user = await db.getUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  const sent = await sendFeedbackToSlack(
    { name: user.name, email: user.email },
    message
  );
  if (!sent) return res.status(503).json({ error: 'Feedback is not configured (Slack webhook missing). Your message was not sent.' });
  if (looksLikeRealFeedback(message)) {
    await appendFeedbackToKanban(message, user.name || undefined);
  }
  res.json({ ok: true, message: 'Thanks! Your feedback has been sent.' });
});

module.exports = router;
