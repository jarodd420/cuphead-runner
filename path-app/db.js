const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MOMENTS_FILE = path.join(DATA_DIR, 'moments.json');
const FRIENDS_FILE = path.join(DATA_DIR, 'friends.json');
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
let comments = [];
let reactions = [];

function load() {
  users = readJson(USERS_FILE, []);
  moments = readJson(MOMENTS_FILE, []);
  friends = readJson(FRIENDS_FILE, []);
  comments = readJson(COMMENTS_FILE, []);
  reactions = readJson(REACTIONS_FILE, []);
}

function save() {
  writeJson(USERS_FILE, users);
  writeJson(MOMENTS_FILE, moments);
  writeJson(FRIENDS_FILE, friends);
  writeJson(COMMENTS_FILE, comments);
  writeJson(REACTIONS_FILE, reactions);
}

function initDb() {
  load();
  return { users, moments, friends, comments, reactions };
}

function getDb() {
  return {
    get users() { return users; },
    get moments() { return moments; },
    get friends() { return friends; },
    get comments() { return comments; },
    get reactions() { return reactions; },
    load,
    save,
  };
}

module.exports = { initDb, getDb, load, save };
