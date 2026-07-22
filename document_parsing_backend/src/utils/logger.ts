import winston from 'winston';
import { loggingConfig } from '../config/config';
import { getRequestId, getCorrelationId } from '../logging/correlation';

const levels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  http: 4,
  debug: 5,
  trace: 6,
};

const colors = {
  fatal: 'red',
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  trace: 'gray',
};

// Custom format to inject request context data automatically from AsyncLocalStorage
const addCorrelationData = winston.format((info) => {
  info.requestId = getRequestId() || null;
  info.correlationId = getCorrelationId() || null;
  info.service = 'document-processor-agent';
  return info;
});

const prettyFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  addCorrelationData(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const reqId = info.requestId ? ` [Req:${info.requestId}]` : '';
    const execution = info.executionTimeMs !== undefined ? ` [${info.executionTimeMs}ms]` : '';
    const errStack = info.stack ? `\n${info.stack}` : '';
    return `[${info.timestamp}] [${info.level}]${reqId}${execution}: ${info.message}${errStack}`;
  })
);

const jsonFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  addCorrelationData(),
  winston.format.timestamp(),
  winston.format.json()
);

winston.addColors(colors);

const selectedFormat = loggingConfig.logFormat === 'json' ? jsonFormat : prettyFormat;

const winstonLogger = winston.createLogger({
  level: loggingConfig.logLevel,
  levels,
  format: selectedFormat,
  transports: [
    new winston.transports.Console(),
  ],
});

// Extend type safety for custom levels
export interface StructuredLogger extends winston.Logger {
  fatal: winston.LeveledLogMethod;
  error: winston.LeveledLogMethod;
  warn: winston.LeveledLogMethod;
  info: winston.LeveledLogMethod;
  http: winston.LeveledLogMethod;
  debug: winston.LeveledLogMethod;
  trace: winston.LeveledLogMethod;
}

export const logger = winstonLogger as StructuredLogger;
export default logger;
