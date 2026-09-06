const { createLogger, format, transports } = require('winston');
const config = require('../config/env');

const logger = createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'engjoy-api' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ level, message, timestamp, stack }) => {
          return stack
            ? `${timestamp} ${level}: ${message}\n${stack}`
            : `${timestamp} ${level}: ${message}`;
        })
      ),
    }),
  ],
});

if (config.nodeEnv === 'production') {
  logger.add(
    new transports.File({ filename: 'logs/error.log', level: 'error', maxsize: 5242880, maxFiles: 5 })
  );
  logger.add(
    new transports.File({ filename: 'logs/combined.log', maxsize: 5242880, maxFiles: 5 })
  );
}

module.exports = logger;
