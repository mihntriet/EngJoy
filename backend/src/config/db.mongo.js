const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

const connectMongo = async () => {
  try {
    await mongoose.connect(config.mongo.uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    logger.error('MongoDB connection error', err);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

module.exports = { connectMongo };
