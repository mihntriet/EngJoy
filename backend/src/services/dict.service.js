const { redis } = require('../config/redis');
const Dictionary = require('../models/dictionary.model');
const logger = require('../utils/logger');

const CACHE_PREFIX = 'dict:';
const CACHE_TTL = 86400; // 24 hours in seconds

class DictService {
  /**
   * Get word definition. Redis-first → MongoDB fallback → cache-set.
   * Gracefully degrades when Redis is unavailable.
   */
  async getDefinition(word) {
    const normalised = word.toLowerCase().trim();
    if (!normalised) {
      const err = new Error('Word parameter is required');
      err.statusCode = 400;
      throw err;
    }

    const cacheKey = `${CACHE_PREFIX}${normalised}`;

    // 1. Try Redis
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug(`Cache HIT for "${normalised}"`);
        return JSON.parse(cached);
      }
      logger.debug(`Cache MISS for "${normalised}"`);
    } catch (redisErr) {
      logger.warn(`Redis read failed for "${normalised}", falling back to DB`, redisErr.message);
    }

    // 2. Query MongoDB
    const entry = await Dictionary.findOne({
      word: normalised,
      isActive: true,
    }).lean();

    if (!entry) {
      const err = new Error(`Word "${normalised}" not found`);
      err.statusCode = 404;
      throw err;
    }

    // 3. Write-back to Redis (fire-and-forget, don't block response)
    try {
      await redis.set(cacheKey, JSON.stringify(entry), 'EX', CACHE_TTL);
      logger.debug(`Cached "${normalised}" (TTL ${CACHE_TTL}s)`);
    } catch (redisErr) {
      logger.warn(`Redis write failed for "${normalised}"`, redisErr.message);
    }

    return entry;
  }

  /**
   * Invalidate cache for a specific word (call after update/delete).
   */
  async invalidate(word) {
    const normalised = word.toLowerCase().trim();
    try {
      await redis.del(`${CACHE_PREFIX}${normalised}`);
      logger.debug(`Cache invalidated for "${normalised}"`);
    } catch (err) {
      logger.warn(`Cache invalidation failed for "${normalised}"`, err.message);
    }
  }

  /**
   * Bulk-invalidate by pattern (e.g. after seed).
   */
  async invalidateAll() {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${CACHE_PREFIX}*`, 'COUNT', 200);
        cursor = nextCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== '0');
      logger.info('All dictionary cache entries invalidated');
    } catch (err) {
      logger.warn('Bulk cache invalidation failed', err.message);
    }
  }
}

module.exports = new DictService();
