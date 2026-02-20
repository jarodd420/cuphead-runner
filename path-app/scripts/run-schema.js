/**
 * Run db/schema.sql against DATABASE_URL. Use for first deploy or migrations.
 * Usage: DATABASE_URL=postgresql://... node scripts/run-schema.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Set DATABASE_URL to run the schema.');
  process.exit(1);
}

const sql = fs.readFileSync(schemaPath, 'utf8');
// Strip line comments, then split by semicolon+newline so we get full statements
const noComments = sql.replace(/--[^\n]*/g, '');
const statements = noComments
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0);

async function run() {
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  try {
    for (const statement of statements) {
      const q = statement.endsWith(';') ? statement : statement + ';';
      await pool.query(q);
    }
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Schema error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
