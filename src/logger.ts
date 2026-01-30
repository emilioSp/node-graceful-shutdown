type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogFormat = 'json' | 'text';

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
};

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private logLevel: LogLevel;
  private logFormat: LogFormat;

  constructor() {
    const level = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
    const format = (process.env.LOG_FORMAT || 'text').toLowerCase() as LogFormat;

    this.logLevel = LOG_LEVELS[level] !== undefined ? level : 'info';
    this.logFormat = format === 'json' ? 'json' : 'text';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.logLevel];
  }

  private formatOutput(entry: LogEntry): string {
    if (this.logFormat === 'json') {
      return JSON.stringify(entry);
    }

    const { timestamp, level, message, ...rest } = entry;
    const metadata =
      Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
    return `${message}${metadata}`;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };

    const output = this.formatOutput(entry);
    level === 'error' ? console.error(output) : console.log(output);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log('error', message, meta);
  }
}

export const logger = new Logger();
