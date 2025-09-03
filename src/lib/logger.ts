// Logger utility for consistent logging across the app
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
}

class Logger {
  private isDevelopment = __DEV__;
  private logs: LogEntry[] = [];

  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(entry);

    // In development, always log to console
    if (this.isDevelopment) {
      const prefix = `[${level.toUpperCase()}]`;
      switch (level) {
        case 'debug':
          console.log(prefix, message, data || '');
          break;
        case 'info':
          console.log(prefix, message, data || '');
          break;
        case 'warn':
          console.warn(prefix, message, data || '');
          break;
        case 'error':
          console.error(prefix, message, data || '');
          break;
      }
    } else {
      // In production, only log errors and warnings
      if (level === 'error' || level === 'warn') {
        console.error(`[${level.toUpperCase()}]`, message, data || '');
      }
    }
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  // Get logs for debugging (development only)
  getLogs(): LogEntry[] {
    return this.isDevelopment ? this.logs : [];
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }
}

export const logger = new Logger();
