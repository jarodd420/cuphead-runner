const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

let pool;

function getPool() {
  if (!pool) {
    const conn = process.env.DATABASE_URL;
    if (!conn) throw new Error('DATABASE_URL is required for PostgreSQL');
    pool = new Pool({
      connectionString: conn,
      ssl: conn.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

async function initDb() {
  getPool();
  return {};
}

function getDb() {
  const client = getPool();

  return {
    async getUserByEmail(email) {
      const e = (email || '').toLowerCase().trim();
      const r = await client.query('SELECT * FROM users WHERE email = $1', [e]);
      return r.rows[0] || null;
    },
    async getUserById(id) {
      const r = await client.query('SELECT * FROM users WHERE id = $1', [Number(id)]);
      const u = r.rows[0];
      if (!u) return null;
      return { ...u, id: Number(u.id) };
    },
    async createUser({ email, password, name }) {
      const hash = bcrypt.hashSync(password, 10);
      const r = await client.query(
        `INSERT INTO users (email, password_hash, name, avatar_url, cover_url, bio)
         VALUES ($1, $2, $3, NULL, NULL, NULL)
         RETURNING id, email, name, avatar_url, cover_url, bio, created_at`,
        [email.toLowerCase().trim(), hash, (name || '').trim()]
      );
      const row = r.rows[0];
      return { id: Number(row.id), email: row.email, name: row.name, avatar_url: row.avatar_url, cover_url: row.cover_url, bio: row.bio, created_at: row.created_at };
    },
    async updateUser(userId, { name, avatar_url, cover_url, bio }) {
      const id = Number(userId);
      const updates = [];
      const values = [];
      let i = 1;
      if (name !== undefined) { updates.push(`name = $${i++}`); values.push((name || '').trim() || null); }
      if (avatar_url !== undefined) { updates.push(`avatar_url = $${i++}`); values.push((avatar_url || '').trim() || null); }
      if (cover_url !== undefined) { updates.push(`cover_url = $${i++}`); values.push((cover_url || '').trim() || null); }
      if (bio !== undefined) { updates.push(`bio = $${i++}`); values.push((bio || '').trim() || null); }
      if (updates.length === 0) return this.getUserById(id);
      values.push(id);
      await client.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${i}`, values);
      return this.getUserById(id);
    },
    async getFriendIds(userId) {
      const uid = Number(userId);
      const r = await client.query(
        `SELECT DISTINCT fm.user_id FROM fam_members fm
         INNER JOIN fam_members me ON me.fam_id = fm.fam_id AND me.user_id = $1`,
        [uid]
      );
      const ids = new Set([uid]);
      r.rows.forEach(row => ids.add(Number(row.user_id)));
      return ids;
    },
    async getFamsForUser(userId) {
      const r = await client.query(
        `SELECT f.id, f.name, f.created_by, f.created_at,
                (SELECT COUNT(*) FROM fam_members WHERE fam_id = f.id) AS member_count
         FROM fams f
         INNER JOIN fam_members fm ON fm.fam_id = f.id AND fm.user_id = $1
         ORDER BY f.created_at DESC`,
        [Number(userId)]
      );
      return r.rows.map(row => ({
        id: Number(row.id),
        name: row.name,
        created_by: Number(row.created_by),
        created_at: row.created_at,
        member_count: Number(row.member_count),
      }));
    },
    async getFamById(famId) {
      const r = await client.query('SELECT * FROM fams WHERE id = $1', [Number(famId)]);
      const row = r.rows[0];
      return row ? { id: Number(row.id), name: row.name, created_by: Number(row.created_by), created_at: row.created_at } : null;
    },
    async createFam({ name, created_by }) {
      const r = await client.query(
        `INSERT INTO fams (name, created_by) VALUES ($1, $2) RETURNING id, name, created_by, created_at`,
        [(name || 'My Fam').trim(), Number(created_by)]
      );
      const row = r.rows[0];
      await client.query('INSERT INTO fam_members (fam_id, user_id, invited_by) VALUES ($1, $2, NULL)', [row.id, Number(created_by)]);
      return { id: Number(row.id), name: row.name, created_by: Number(row.created_by), created_at: row.created_at };
    },
    async addFamMember(famId, userId, invitedBy = null) {
      const fid = Number(famId);
      const uid = Number(userId);
      const r = await client.query('SELECT 1 FROM fam_members WHERE fam_id = $1 AND user_id = $2', [fid, uid]);
      if (r.rows.length) return true;
      await client.query('INSERT INTO fam_members (fam_id, user_id, invited_by) VALUES ($1, $2, $3)', [fid, uid, invitedBy ? Number(invitedBy) : null]);
      return true;
    },
    async getFamMembers(famId) {
      const r = await client.query(
        `SELECT u.id, u.email, u.name, u.avatar_url, fm.joined_at
         FROM fam_members fm
         INNER JOIN users u ON u.id = fm.user_id
         WHERE fm.fam_id = $1 ORDER BY fm.joined_at ASC`,
        [Number(famId)]
      );
      return r.rows.map(row => ({ id: Number(row.id), email: row.email, name: row.name, avatar_url: row.avatar_url, joined_at: row.joined_at }));
    },
    async isFamMember(famId, userId) {
      const r = await client.query('SELECT 1 FROM fam_members WHERE fam_id = $1 AND user_id = $2', [Number(famId), Number(userId)]);
      return r.rows.length > 0;
    },
    async getPendingInvitesByEmail(email) {
      const e = (email || '').toLowerCase().trim();
      const r = await client.query('SELECT fam_id FROM fam_invites WHERE LOWER(email) = $1', [e]);
      return r.rows.map(row => Number(row.fam_id));
    },
    async addFamInvite(famId, email, invitedBy) {
      const e = (email || '').toLowerCase().trim();
      await client.query(
        `INSERT INTO fam_invites (fam_id, email, invited_by) VALUES ($1, $2, $3)
         ON CONFLICT (fam_id, email) DO NOTHING`,
        [Number(famId), e, Number(invitedBy)]
      );
    },
    async deletePendingInvitesForEmail(famIds, email) {
      const e = (email || '').toLowerCase().trim();
      if (!famIds.length) return;
      await client.query('DELETE FROM fam_invites WHERE LOWER(email) = $1 AND fam_id = ANY($2::int[])', [e, famIds]);
    },
    async getMomentsForUserIds(friendIds, limit = 100) {
      if (!friendIds.size) return [];
      const ids = Array.from(friendIds);
      const r = await client.query(
        `SELECT * FROM moments WHERE user_id = ANY($1::int[]) ORDER BY created_at DESC LIMIT $2`,
        [ids, limit]
      );
      return r.rows.map(row => ({
        id: Number(row.id),
        user_id: Number(row.user_id),
        type: row.type,
        body: row.body,
        image_url: row.image_url,
        created_at: row.created_at,
      }));
    },
    async getUsersByIds(ids) {
      if (!ids.length) return [];
      const r = await client.query('SELECT * FROM users WHERE id = ANY($1::int[])', [ids]);
      return r.rows.map(u => ({ ...u, id: Number(u.id) }));
    },
    async getCommentsByMomentIds(momentIds) {
      if (!momentIds.length) return {};
      const r = await client.query('SELECT * FROM comments WHERE moment_id = ANY($1::int[]) ORDER BY created_at', [momentIds]);
      const byMoment = {};
      r.rows.forEach(c => {
        const mid = Number(c.moment_id);
        if (!byMoment[mid]) byMoment[mid] = [];
        byMoment[mid].push({ id: Number(c.id), moment_id: mid, user_id: Number(c.user_id), body: c.body, created_at: c.created_at });
      });
      return byMoment;
    },
    async getReactionsByMomentIds(momentIds) {
      if (!momentIds.length) return {};
      const r = await client.query('SELECT * FROM reactions WHERE moment_id = ANY($1::int[])', [momentIds]);
      const byMoment = {};
      r.rows.forEach(row => {
        const mid = Number(row.moment_id);
        if (!byMoment[mid]) byMoment[mid] = [];
        byMoment[mid].push({ id: Number(row.id), moment_id: mid, user_id: Number(row.user_id), emoji: row.emoji, created_at: row.created_at });
      });
      return byMoment;
    },
    async insertMoment({ user_id, type, body, image_url }) {
      const r = await client.query(
        `INSERT INTO moments (user_id, type, body, image_url) VALUES ($1, $2, $3, $4)
         RETURNING id, user_id, type, body, image_url, created_at`,
        [Number(user_id), type, (body || '').trim() || null, image_url || null]
      );
      const row = r.rows[0];
      return { id: Number(row.id), user_id: Number(row.user_id), type: row.type, body: row.body, image_url: row.image_url, created_at: row.created_at };
    },
    async getMomentById(id) {
      const r = await client.query('SELECT * FROM moments WHERE id = $1', [Number(id)]);
      const m = r.rows[0];
      return m ? { id: Number(m.id), user_id: Number(m.user_id), type: m.type, body: m.body, image_url: m.image_url, created_at: m.created_at } : null;
    },
    async insertComment({ moment_id, user_id, body }) {
      const r = await client.query(
        `INSERT INTO comments (moment_id, user_id, body) VALUES ($1, $2, $3)
         RETURNING id, moment_id, user_id, body, created_at`,
        [Number(moment_id), Number(user_id), body]
      );
      const row = r.rows[0];
      return { id: Number(row.id), moment_id: Number(row.moment_id), user_id: Number(row.user_id), body: row.body, created_at: row.created_at };
    },
    async upsertReaction(momentId, userId, emoji) {
      const mid = Number(momentId);
      const uid = Number(userId);
      if (emoji) {
        await client.query(
          `INSERT INTO reactions (moment_id, user_id, emoji) VALUES ($1, $2, $3)
           ON CONFLICT (moment_id, user_id) DO UPDATE SET emoji = $3`,
          [mid, uid, emoji]
        );
      } else {
        await client.query('DELETE FROM reactions WHERE moment_id = $1 AND user_id = $2', [mid, uid]);
      }
      const r = await client.query('SELECT * FROM reactions WHERE moment_id = $1', [mid]);
      const counts = {};
      const myReaction = r.rows.find(x => Number(x.user_id) === uid);
      r.rows.forEach(row => { counts[row.emoji] = (counts[row.emoji] || 0) + 1; });
      return { reactionCounts: counts, my_reaction: myReaction ? myReaction.emoji : null };
    },
    async getUsersSearch(excludeUserId, q, limit = 20) {
      let sql = 'SELECT id, email, name, avatar_url FROM users WHERE id != $1';
      const params = [Number(excludeUserId)];
      if (q && q.length >= 2) {
        params.push('%' + q + '%');
        sql += ' AND (LOWER(name) LIKE $2 OR LOWER(email) LIKE $2)';
      }
      sql += ' ORDER BY name LIMIT $' + (params.length + 1);
      params.push(limit);
      const r = await client.query(sql, params);
      return r.rows.map(u => ({ id: Number(u.id), email: u.email, name: u.name, avatar_url: u.avatar_url }));
    },
  };
}

module.exports = { initDb, getDb };
