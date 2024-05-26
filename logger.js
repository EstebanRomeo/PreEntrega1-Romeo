const winston = require('winston');

const levels = {
  fatal: 0,
  error: 1,
  warning: 2,
  info: 3,
  http: 4,
  debug: 5,
};

const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
);

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      format,
    ),
  }),
  new winston.transports.File({
    filename: 'errors.log',
    level: 'error',
    format,
  }),
];

const logger = winston.createLogger({
  levels,
  level: level(),
  format,
  transports,
});

module.exports = logger;
