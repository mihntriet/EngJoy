const Redis = require('ioredis');
const config = require('./env');
const logger = require('../utils/logger');

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  db: config.redis.db,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) return null;
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error', err));
redis.on('close', () => logger.warn('Redis connection closed'));

const connectRedis = async () => {
  try {
    await redis.connect();
    await redis.ping();
    logger.info(`Redis ready on ${config.redis.host}:${config.redis.port}`);
  } catch (err) {
    logger.error('Redis connection failed – cache will be bypassed', err);
  }
};

module.exports = { redis, connectRedis };
