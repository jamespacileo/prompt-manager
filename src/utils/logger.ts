import { consola, createConsola, LogLevel } from "consola";

const getLogLevel = (level: string | undefined): LogLevel => {
  switch (level) {
    case 'fatal': return 0;
    case 'error': return 0;
    case 'warn': return 1;
    case 'log': return 2;
    case 'info': return 3;
    case 'success': return 3;
    case 'debug': return 4;
    case 'trace': return 5;
    default: return 3; // default to 'info'
  }
};

export const logger = createConsola({
  level: getLogLevel(process.env.LOG_LEVEL),
  // fancy: true,
  formatOptions: {
    date: false,
    colors: true,
    compact: true,
  },
});
