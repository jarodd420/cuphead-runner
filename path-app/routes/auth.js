const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../appDb');

const router = express.Router();

function profileFromUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url || null,
    cover_url: user.cover_url || null,
    bio: user.bio || null,
  };
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const db = getDb();
  const user = await db.getUserByEmail(email);
  if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  req.session.userId = user.id;
  req.session.user = profileFromUser(user);
  res.json({ user: req.session.user });
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 100;

function validateSignup(body) {
  const { email, password, password_confirm, name, accept_terms } = body || {};
  const emailStr = (email || '').toString().trim().toLowerCase();
  const passwordStr = (password || '').toString();
  const nameStr = (name || '').toString().trim();

  if (!emailStr) return { error: 'Email is required' };
  if (!EMAIL_REGEX.test(emailStr)) return { error: 'Please enter a valid email address' };
  if (emailStr.length > 255) return { error: 'Email is too long' };

  if (!passwordStr) return { error: 'Password is required' };
  if (passwordStr.length < MIN_PASSWORD_LENGTH) return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  if (!/[a-zA-Z]/.test(passwordStr)) return { error: 'Password must include at least one letter' };
  if (!/\d/.test(passwordStr)) return { error: 'Password must include at least one number' };
  if (password_confirm !== undefined && passwordStr !== (password_confirm || '').toString()) {
    return { error: 'Passwords do not match' };
  }

  if (!nameStr) return { error: 'Name is required' };
  if (nameStr.length > MAX_NAME_LENGTH) return { error: `Name must be ${MAX_NAME_LENGTH} characters or less` };

  if (accept_terms !== true && accept_terms !== 'true' && accept_terms !== 'on') {
    return { error: 'You must accept the Terms of Service and Privacy Policy' };
  }

  return { email: emailStr, password: passwordStr, name: nameStr };
}

router.post('/signup', async (req, res) => {
  const validated = validateSignup(req.body);
  if (validated.error) {
    return res.status(400).json({ error: validated.error });
  }
  const { email, password, name } = validated;
  const db = getDb();
  const existing = await db.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }
  const user = await db.createUser({ email, password, name });
  await db.createFam({ name: 'My Fam', created_by: user.id });
  const pendingFamIds = await db.getPendingInvitesByEmail(email);
  for (const famId of pendingFamIds) {
    await db.addFamMember(famId, user.id, null);
  }
  if (pendingFamIds.length) await db.deletePendingInvitesForEmail(pendingFamIds, email);
  req.session.userId = user.id;
  req.session.user = profileFromUser(user);
  res.status(201).json({ user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get('/me', async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Not logged in' });
  const db = getDb();
  const user = await db.getUserById(req.session.userId);
  const profile = user ? profileFromUser(user) : req.session.user;
  res.json({ user: profile });
});

module.exports = router;
