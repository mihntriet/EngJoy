require('dotenv').config();
const { Client } = require('pg');
const mongoose = require('mongoose');
const Redis = require('ioredis');

async function testConnections() {
    console.log('⏳ Đang kiểm tra hệ thống Database...\n');

    // 1. PostgreSQL
    try {
        const pgClient = new Client({
            host: process.env.PG_HOST,
            port: process.env.PG_PORT,
            database: process.env.PG_DATABASE,
            user: process.env.PG_USER,
            password: process.env.PG_PASSWORD,
        });
        await pgClient.connect();
        console.log('✅ PostgreSQL: Kết nối thành công tới DB ->', process.env.PG_DATABASE);
        await pgClient.end();
    } catch (err) {
        console.error('❌ PostgreSQL: Lỗi ->', err.message);
    }

    // 2. MongoDB
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB: Kết nối thành công!');
        await mongoose.connection.close();
    } catch (err) {
        console.error('❌ MongoDB: Lỗi ->', err.message);
    }

    // 3. Redis (ioredis)
    try {
        const redisClient = new Redis({
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: parseInt(process.env.REDIS_PORT, 10) || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            db: parseInt(process.env.REDIS_DB, 10) || 0,
            lazyConnect: true,
        });
        await redisClient.connect();
        await redisClient.ping();
        console.log(`✅ Redis: Kết nối thành công tới DB số ${process.env.REDIS_DB || 0}!`);
        await redisClient.quit();
    } catch (err) {
        console.error('❌ Redis: Lỗi ->', err.message);
    }
}

testConnections();