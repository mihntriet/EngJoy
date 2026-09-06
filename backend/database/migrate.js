#!/usr/bin/env node

/**
 * Migration script – reads database/schema.sql and executes it against PostgreSQL.
 *
 * Usage:
 *   node database/migrate.js          # Run migration (idempotent, safe on existing DB)
 *   node database/migrate.js --force  # Drop all tables first, then re-create
 *   npm run db:migrate
 *   npm run db:migrate -- --force
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SCHEMA_PATH = path.resolve(__dirname, 'schema.sql');

const DROP_SQL = `
  DROP TRIGGER IF EXISTS trg_player_profiles_updated_at ON player_profiles;
  DROP TRIGGER IF EXISTS trg_user_progress_updated_at ON user_progress;
  DROP TRIGGER IF EXISTS trg_learning_phases_updated_at ON learning_phases;
  DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
  DROP FUNCTION IF EXISTS trigger_set_updated_at();
  DROP TABLE IF EXISTS idempotency_keys CASCADE;
  DROP TABLE IF EXISTS player_profiles CASCADE;
  DROP TABLE IF EXISTS user_progress CASCADE;
  DROP TABLE IF EXISTS learning_phases CASCADE;
  DROP TABLE IF EXISTS users CASCADE;
  DROP TYPE IF EXISTS progress_status;
  DROP TYPE IF EXISTS phase_status;
  DROP TYPE IF EXISTS user_role;
`;

async function migrate(force = false) {
  const client = new Client({
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT, 10) || 5432,
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
  });

  try {
    await client.connect();
    console.log(`✅ Connected to PostgreSQL → ${process.env.PG_DATABASE}`);

    if (!fs.existsSync(SCHEMA_PATH)) {
      throw new Error(`Schema file not found: ${SCHEMA_PATH}`);
    }

    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');

    if (force) {
      console.log('⚠️  --force flag detected: dropping all tables, types, triggers...');
      await client.query(DROP_SQL);
      console.log('🗑️  Dropped successfully');
    }

    console.log('⏳ Executing schema.sql...');
    await client.query(schemaSql);
    console.log('✅ Migration completed successfully!');

    // Verify tables exist
    const { rows } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n📋 Tables in database:');
    rows.forEach((r, i) => console.log(`   ${i + 1}. ${r.table_name}`));

    // Verify enums
    const { rows: enums } = await client.query(`
      SELECT t.typname AS enum_name,
             string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      GROUP BY t.typname
      ORDER BY t.typname;
    `);

    if (enums.length > 0) {
      console.log('\n📋 Enum types:');
      enums.forEach((e) => console.log(`   • ${e.enum_name}: ${e.values}`));
    }

    // Check player_profiles count
    const { rows: profileCount } = await client.query(`SELECT COUNT(*) FROM player_profiles;`);
    console.log(`\n🎮 Player profiles in database: ${profileCount[0].count}`);

    console.log('\n🎉 Done!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

const force = process.argv.includes('--force');
migrate(force);
