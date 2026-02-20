require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const { initDb } = require('./appDb');
const auth = require('./routes/auth');
const api = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

initDb();

let sessionStore = undefined;
if (process.env.DATABASE_URL) {
  const pgSession = require('connect-pg-simple')(session);
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } });
  sessionStore = new pgSession({ pool, tableName: 'session' });
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'fam-secret-change-in-prod',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === '1',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      httpOnly: true,
    },
  })
);

app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth', auth);
app.use('/api', api);

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Fam running at http://localhost:${PORT}`);
  if (process.env.DATABASE_URL) console.log('Using PostgreSQL + session store');
  if (HOST === '0.0.0.0') {
    console.log(`Access from other devices: http://[YOUR_IP]:${PORT}`);
  }
});
