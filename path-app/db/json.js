const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MOMENTS_FILE = path.join(DATA_DIR, 'moments.json');
const FRIENDS_FILE = path.join(DATA_DIR, 'friends.json');
const FAMS_FILE = path.join(DATA_DIR, 'fams.json');
const FAM_MEMBERS_FILE = path.join(DATA_DIR, 'fam_members.json');
const FAM_INVITES_FILE = path.join(DATA_DIR, 'fam_invites.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const REACTIONS_FILE = path.join(DATA_DIR, 'reactions.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, defaultVal = []) {
  ensureDir();
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

function writeJson(file, data) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

let users = [];
let moments = [];
let friends = [];
let fams = [];
let famMembers = [];
let famInvites = [];
let comments = [];
let reactions = [];

function load() {
  users = readJson(USERS_FILE, []);
  moments = readJson(MOMENTS_FILE, []);
  friends = readJson(FRIENDS_FILE, []);
  fams = readJson(FAMS_FILE, []);
  famMembers = readJson(FAM_MEMBERS_FILE, []);
  famInvites = readJson(FAM_INVITES_FILE, []);
  comments = readJson(COMMENTS_FILE, []);
  reactions = readJson(REACTIONS_FILE, []);
}

function save() {
  writeJson(USERS_FILE, users);
  writeJson(MOMENTS_FILE, moments);
  writeJson(FRIENDS_FILE, friends);
  writeJson(FAMS_FILE, fams);
  writeJson(FAM_MEMBERS_FILE, famMembers);
  writeJson(FAM_INVITES_FILE, famInvites);
  writeJson(COMMENTS_FILE, comments);
  writeJson(REACTIONS_FILE, reactions);
}

function initDb() {
  load();
  return {};
}

function getDb() {
  load();
  const uid = (id) => Number(id);
  const eq = (a, b) => uid(a) === uid(b);

  return {
    async getUserByEmail(email) {
      const e = (email || '').toLowerCase().trim();
      return users.find(u => u.email === e) || null;
    },
    async getUserById(id) {
      const u = users.find(u => eq(u.id, id));
      return u ? { ...u, id: uid(u.id) } : null;
    },
    async createUser({ email, password, name }) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync(password, 10);
      const id = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
      const user = {
        id,
        email: email.toLowerCase().trim(),
        password_hash: hash,
        name: (name || '').trim(),
        avatar_url: null,
        cover_url: null,
        bio: null,
        created_at: new Date().toISOString(),
      };
      users.push(user);
      save();
      return { id: user.id, email: user.email, name: user.name, avatar_url: null, cover_url: null, bio: null, created_at: user.created_at };
    },
    async updateUser(userId, { name, avatar_url, cover_url, bio }) {
      const user = users.find(u => eq(u.id, userId));
      if (!user) return null;
      if (name !== undefined) user.name = (name || '').trim() || user.name;
      if (avatar_url !== undefined) user.avatar_url = (avatar_url || '').trim() || null;
      if (cover_url !== undefined) user.cover_url = (cover_url || '').trim() || null;
      if (bio !== undefined) user.bio = (bio || '').trim() || null;
      save();
      return this.getUserById(userId);
    },
    async getFriendIds(userId) {
      const myId = uid(userId);
      const myFamIds = famMembers.filter(fm => fm.user_id === myId).map(fm => uid(fm.fam_id));
      const ids = new Set([myId]);
      famMembers.filter(fm => myFamIds.includes(uid(fm.fam_id))).forEach(fm => ids.add(uid(fm.user_id)));
      return ids;
    },
    async getFamsForUser(userId) {
      const myId = uid(userId);
      const myFamIds = famMembers.filter(fm => fm.user_id === myId).map(fm => uid(fm.fam_id));
      return fams.filter(f => myFamIds.includes(uid(f.id))).map(f => {
        const member_count = famMembers.filter(fm => fm.fam_id === uid(f.id)).length;
        return { id: uid(f.id), name: f.name, created_by: uid(f.created_by), created_at: f.created_at, member_count };
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    async getFamById(famId) {
      const f = fams.find(f => eq(f.id, famId));
      return f ? { id: uid(f.id), name: f.name, created_by: uid(f.created_by), created_at: f.created_at } : null;
    },
    async createFam({ name, created_by }) {
      const id = fams.length ? Math.max(...fams.map(f => f.id)) + 1 : 1;
      const fam = { id, name: (name || 'My Fam').trim(), created_by: uid(created_by), created_at: new Date().toISOString() };
      fams.push(fam);
      famMembers.push({ fam_id: id, user_id: uid(created_by), invited_by: null, joined_at: new Date().toISOString() });
      save();
      return { id: fam.id, name: fam.name, created_by: fam.created_by, created_at: fam.created_at };
    },
    async addFamMember(famId, userId, invitedBy = null) {
      const fid = uid(famId);
      const uidUser = uid(userId);
      if (famMembers.some(fm => fm.fam_id === fid && fm.user_id === uidUser)) return true;
      famMembers.push({ fam_id: fid, user_id: uidUser, invited_by: invitedBy ? uid(invitedBy) : null, joined_at: new Date().toISOString() });
      save();
      return true;
    },
    async getFamMembers(famId) {
      const fid = uid(famId);
      return famMembers.filter(fm => fm.fam_id === fid).map(fm => {
        const u = users.find(u => eq(u.id, fm.user_id));
        return u ? { id: uid(u.id), email: u.email, name: u.name, avatar_url: u.avatar_url, joined_at: fm.joined_at } : null;
      }).filter(Boolean).sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at));
    },
    async isFamMember(famId, userId) {
      return famMembers.some(fm => eq(fm.fam_id, famId) && eq(fm.user_id, userId));
    },
    async getPendingInvitesByEmail(email) {
      const e = (email || '').toLowerCase().trim();
      return famInvites.filter(inv => (inv.email || '').toLowerCase() === e).map(inv => uid(inv.fam_id));
    },
    async addFamInvite(famId, email, invitedBy) {
      const e = (email || '').toLowerCase().trim();
      if (famInvites.some(inv => eq(inv.fam_id, famId) && (inv.email || '').toLowerCase() === e)) return;
      famInvites.push({ fam_id: uid(famId), email: e, invited_by: uid(invitedBy), created_at: new Date().toISOString() });
      save();
    },
    async deletePendingInvitesForEmail(famIds, email) {
      const e = (email || '').toLowerCase().trim();
      const idSet = new Set((famIds || []).map(fid => uid(fid)));
      famInvites = famInvites.filter(inv => (inv.email || '').toLowerCase() !== e || !idSet.has(uid(inv.fam_id)));
      save();
    },
    async getMomentsForUserIds(friendIds, limit = 100) {
      const idSet = new Set([...friendIds].map(uid));
      return moments
        .filter(m => idSet.has(uid(m.user_id)))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit)
        .map(m => ({ id: uid(m.id), user_id: uid(m.user_id), type: m.type, body: m.body, image_url: m.image_url, created_at: m.created_at }));
    },
    async getUsersByIds(ids) {
      const idSet = new Set(ids.map(uid));
      return users.filter(u => idSet.has(uid(u.id))).map(u => ({ ...u, id: uid(u.id) }));
    },
    async getCommentsByMomentIds(momentIds) {
      const idSet = new Set(momentIds.map(uid));
      const byMoment = {};
      comments.filter(c => idSet.has(uid(c.moment_id))).forEach(c => {
        const mid = uid(c.moment_id);
        if (!byMoment[mid]) byMoment[mid] = [];
        byMoment[mid].push({ id: uid(c.id), moment_id: mid, user_id: uid(c.user_id), body: c.body, created_at: c.created_at });
      });
      return byMoment;
    },
    async getReactionsByMomentIds(momentIds) {
      const idSet = new Set(momentIds.map(uid));
      const byMoment = {};
      reactions.filter(r => idSet.has(uid(r.moment_id))).forEach(r => {
        const mid = uid(r.moment_id);
        if (!byMoment[mid]) byMoment[mid] = [];
        byMoment[mid].push({ id: uid(r.id), moment_id: mid, user_id: uid(r.user_id), emoji: r.emoji, created_at: r.created_at });
      });
      return byMoment;
    },
    async insertMoment({ user_id, type, body, image_url }) {
      const id = moments.length ? Math.max(...moments.map(m => m.id)) + 1 : 1;
      const moment = {
        id,
        user_id: uid(user_id),
        type,
        body: (body || '').trim() || null,
        image_url: image_url || null,
        created_at: new Date().toISOString(),
      };
      moments.push(moment);
      save();
      return { id: moment.id, user_id: moment.user_id, type: moment.type, body: moment.body, image_url: moment.image_url, created_at: moment.created_at };
    },
    async getMomentById(id) {
      const m = moments.find(m => eq(m.id, id));
      return m ? { id: uid(m.id), user_id: uid(m.user_id), type: m.type, body: m.body, image_url: m.image_url, created_at: m.created_at } : null;
    },
    async insertComment({ moment_id, user_id, body }) {
      const id = comments.length ? Math.max(...comments.map(c => c.id)) + 1 : 1;
      const comment = { id, moment_id: uid(moment_id), user_id: uid(user_id), body, created_at: new Date().toISOString() };
      comments.push(comment);
      save();
      return { id: comment.id, moment_id: comment.moment_id, user_id: comment.user_id, body: comment.body, created_at: comment.created_at };
    },
    async upsertReaction(momentId, userId, emoji) {
      const mid = uid(momentId);
      const userIdNum = uid(userId);
      const allowed = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
      let existing = reactions.find(r => r.moment_id === mid && (r.user_id === userIdNum || String(r.user_id) === String(userIdNum)));
      if (emoji) {
        if (!allowed.includes(emoji)) throw new Error('Invalid emoji');
        if (existing) {
          if (existing.emoji === emoji) {
            reactions = reactions.filter(r => r.id !== existing.id);
          } else {
            existing.emoji = emoji;
          }
        } else {
          const id = reactions.length ? Math.max(...reactions.map(r => r.id)) + 1 : 1;
          reactions.push({ id, moment_id: mid, user_id: userIdNum, emoji, created_at: new Date().toISOString() });
        }
      } else {
        if (existing) reactions = reactions.filter(r => r.id !== existing.id);
      }
      save();
      const momentReactions = reactions.filter(r => r.moment_id === mid);
      const reactionCounts = {};
      momentReactions.forEach(r => { reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1; });
      const myReaction = momentReactions.find(r => r.user_id === userIdNum || String(r.user_id) === String(userIdNum));
      return { reactionCounts, my_reaction: myReaction ? myReaction.emoji : null };
    },
    async getUsersSearch(excludeUserId, q, limit = 20) {
      let list = users.filter(u => uid(u.id) !== uid(excludeUserId));
      if (q && q.length >= 2) {
        const lower = q.toLowerCase();
        list = list.filter(u => (u.name || '').toLowerCase().includes(lower) || (u.email || '').toLowerCase().includes(lower));
      }
      return list.slice(0, limit).map(u => ({ id: uid(u.id), email: u.email, name: u.name, avatar_url: u.avatar_url }));
    },
  };
}

module.exports = { initDb, getDb };
