import { consola, createConsola, LogLevel } from "consola";
import chalk from 'chalk';
import { JSONSchema7 } from 'json-schema';

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
  formatOptions: {
    date: false,
    colors: true,
    compact: true,
  }
});

export function prettyPrintJsonSchema(schema: JSONSchema7, indent: number = 0): string {
  const spaces = ' '.repeat(indent);
  let output = '';

  if (schema.type === 'object' && schema.properties) {
    output += `${spaces}${chalk.cyan('{')}${chalk.yellow('object')}\n`;
    for (const [key, value] of Object.entries(schema.properties)) {
      output += `${spaces}  ${chalk.green(key)}: ${prettyPrintJsonSchema(value as JSONSchema7, indent + 2)}\n`;
    }
    output += `${spaces}${chalk.cyan('}')}`;
  } else if (schema.type === 'array' && schema.items) {
    output += `${spaces}${chalk.cyan('[')}${chalk.yellow('array')}\n`;
    output += `${spaces}  ${prettyPrintJsonSchema(schema.items as JSONSchema7, indent + 2)}\n`;
    output += `${spaces}${chalk.cyan(']')}`;
  } else {
    output += `${spaces}${chalk.yellow(schema.type as string)}`;
    if (schema.enum) {
      output += ` ${chalk.magenta('enum')}(${schema.enum.map(v => chalk.blue(JSON.stringify(v))).join(', ')})`;
    }
  }

  return output;
}
