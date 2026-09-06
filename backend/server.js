const app = require('./src/app');
const config = require('./src/config/env');
const logger = require('./src/utils/logger');
const { connectPostgres } = require('./src/config/db.postgres');
const { connectMongo } = require('./src/config/db.mongo');
const { connectRedis } = require('./src/config/redis');

const start = async () => {
  try {
    await connectPostgres();
    await connectMongo();
    await connectRedis();

    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} [${config.nodeEnv}]`);
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', err);
  process.exit(1);
});

start();
