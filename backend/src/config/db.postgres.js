const { Pool } = require('pg');
const config = require('./env');
const logger = require('../utils/logger');

const pool = new Pool({
  host: config.pg.host,
  port: config.pg.port,
  database: config.pg.database,
  user: config.pg.user,
  password: config.pg.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  logger.info('PostgreSQL client connected');
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL error', err);
  process.exit(1);
});

const connectPostgres = async () => {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT NOW()');
    logger.info(`PostgreSQL connected at ${res.rows[0].now}`);
  } finally {
    client.release();
  }
};

module.exports = { pool, connectPostgres };
