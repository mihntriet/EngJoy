#!/usr/bin/env node

/**
 * Seed script – reads a JSON array of word entries and bulk-inserts into MongoDB.
 *
 * Usage:
 *   node src/scripts/seed.js <path-to-json>
 *   node src/scripts/seed.js data/words.json --drop   # drop collection first
 *
 * JSON format expected:
 * [
 *   {
 *     "word": "hello",
 *     "phonetics": [{ "text": "/həˈloʊ/", "audio": "" }],
 *     "meanings": [
 *       {
 *         "partOfSpeech": "interjection",
 *         "definitions": [{ "definition": "Used as a greeting." }],
 *         "examples": [{ "sentence": "Hello, how are you?" }]
 *       }
 *     ]
 *   }
 * ]
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = require('../config/env');
const Dictionary = require('../models/dictionary.model');
const logger = require('../utils/logger');

const BATCH_SIZE = 500;

async function loadJSON(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }

  const raw = fs.readFileSync(resolved, 'utf-8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error('JSON root must be an array of word objects');
  }

  return data;
}

function normaliseEntry(entry) {
  return {
    ...entry,
    word: String(entry.word || '').toLowerCase().trim(),
  };
}

async function seedBatch(batch, stats) {
  try {
    const result = await Dictionary.bulkWrite(
      batch.map((entry) => ({
        updateOne: {
          filter: { word: entry.word },
          update: { $set: entry },
          upsert: true,
        },
      })),
      { ordered: false }
    );

    stats.inserted += result.upsertedCount || 0;
    stats.updated += result.modifiedCount || 0;
    stats.matched += result.matchedCount || 0;
  } catch (err) {
    if (err.code === 11000 || err.writeErrors) {
      const writeErrors = err.writeErrors || [];
      const dupes = writeErrors.filter((e) => e.code === 11000);
      stats.duplicatesSkipped += dupes.length;
      stats.errors += writeErrors.length - dupes.length;

      if (writeErrors.length - dupes.length > 0) {
        const nonDupeErrors = writeErrors.filter((e) => e.code !== 11000);
        nonDupeErrors.forEach((e) => logger.error(`Write error: ${e.errmsg}`));
      }
    } else {
      throw err;
    }
  }
}

async function seed(filePath, shouldDrop) {
  logger.info('=== EngJoy Dictionary Seed ===');
  logger.info(`Source: ${filePath}`);

  await mongoose.connect(config.mongo.uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });
  logger.info(`MongoDB connected: ${mongoose.connection.host}`);

  if (shouldDrop) {
    await Dictionary.collection.drop().catch(() => {});
    logger.warn('Collection "dictionaries" dropped');
  }

  const rawEntries = await loadJSON(filePath);
  logger.info(`Loaded ${rawEntries.length} entries from JSON`);

  const entries = rawEntries.map(normaliseEntry).filter((e) => e.word.length > 0);
  const skippedEmpty = rawEntries.length - entries.length;
  if (skippedEmpty > 0) {
    logger.warn(`Skipped ${skippedEmpty} entries with empty word field`);
  }

  const stats = { inserted: 0, updated: 0, matched: 0, duplicatesSkipped: 0, errors: 0 };
  const totalBatches = Math.ceil(entries.length / BATCH_SIZE);

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = entries.slice(i, i + BATCH_SIZE);
    await seedBatch(batch, stats);
    logger.info(`Batch ${batchNum}/${totalBatches} processed (${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length})`);
  }

  logger.info('=== Seed Complete ===');
  logger.info(`  Inserted:   ${stats.inserted}`);
  logger.info(`  Updated:    ${stats.updated}`);
  logger.info(`  Matched:    ${stats.matched}`);
  logger.info(`  Dup-skips:  ${stats.duplicatesSkipped}`);
  logger.info(`  Errors:     ${stats.errors}`);

  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

// --- CLI ---
const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith('--'));
const shouldDrop = args.includes('--drop');

if (!filePath) {
  console.error('Usage: node src/scripts/seed.js <path-to-json> [--drop]');
  process.exit(1);
}

seed(filePath, shouldDrop)
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Seed failed', err);
    process.exit(1);
  });
