// /src/lib/logger.ts
interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  private formatLog(level: LogEntry['level'], message: string, metadata?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      metadata
    };
  }

  private writeLog(entry: LogEntry) {
    const logString = this.isDevelopment 
      ? `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${entry.metadata ? '\n' + JSON.stringify(entry.metadata, null, 2) : ''}`
      : JSON.stringify(entry);

    switch (entry.level) {
      case 'error':
        console.error(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      case 'info':
        console.info(logString);
        break;
      case 'debug':
        if (this.isDevelopment) {
          console.debug(logString);
        }
        break;
    }
  }

  info(message: string, metadata?: Record<string, any>) {
    this.writeLog(this.formatLog('info', message, metadata));
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.writeLog(this.formatLog('warn', message, metadata));
  }

  error(message: string, metadata?: Record<string, any>) {
    this.writeLog(this.formatLog('error', message, metadata));
  }

  debug(message: string, metadata?: Record<string, any>) {
    this.writeLog(this.formatLog('debug', message, metadata));
  }
}

export const logger = new Logger();