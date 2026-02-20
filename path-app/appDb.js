// Scalable DB entry point: use PostgreSQL if DATABASE_URL is set, else JSON files
if (process.env.DATABASE_URL) {
  module.exports = require('./db/pg');
} else {
  module.exports = require('./db/json');
}
