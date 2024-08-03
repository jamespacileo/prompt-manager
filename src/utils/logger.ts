import { createLogger, format, type Logger, transports } from "winston";
import "winston-daily-rotate-file";
import chalk from "chalk";
import type { JSONSchema7 } from "json-schema";
import path from "path";
import fs from "fs";

// Ensure log directory exists
const logDirectory = path.join(process.cwd(), ".fury");
if (!fs.existsSync(logDirectory)) {
	fs.mkdirSync(logDirectory, { recursive: true });
}

// Define log level mapping
const getLogLevel = (level: string | undefined): string => {
	switch (level) {
		case "fatal":
			return "error";
		case "error":
			return "error";
		case "warn":
			return "warn";
		case "log":
			return "info";
		case "info":
			return "info";
		case "success":
			return "info";
		case "debug":
			return "debug";
		case "trace":
			return "silly";
		default:
			return "info"; // default to 'info'
	}
};

// Create logger with daily rotate file transport
export const logger: Logger & { success: (message: string) => void } =
	createLogger({
		level: getLogLevel(process.env.LOG_LEVEL),
		format: format.combine(
			format.timestamp(),
			format.printf(({ timestamp, level, message }) => {
				return `${timestamp} ${level}: ${message}`;
			}),
		),
		transports: [
			new transports.DailyRotateFile({
				filename: path.join(logDirectory, "log-%DATE%.log"),
				datePattern: "YYYY-MM-DD",
				maxFiles: "14d", // keep logs for 14 days
			}),
			new transports.Console({
				format: format.combine(
					format.colorize(),
					format.printf(({ level, message }) => {
						return `${level}: ${message}`;
					}),
				),
			}),
		],
	}) as Logger & { success: (message: string) => void };

// Extend logger to add a success method
logger.success = (message: string) => {
	logger.log({ level: "info", message: chalk.green(message) });
};

export function prettyPrintJsonSchema(
	schema: JSONSchema7,
	indent = 0,
): string {
	const spaces = " ".repeat(indent);
	let output = "";

	if (schema.type === "object" && schema.properties) {
		output += `${spaces}${chalk.cyan("{")}${chalk.yellow("object")}\n`;
		for (const [key, value] of Object.entries(schema.properties)) {
			output += `${spaces}  ${chalk.green(key)}: ${prettyPrintJsonSchema(value as JSONSchema7, indent + 2)}\n`;
		}
		output += `${spaces}${chalk.cyan("}")}`;
	} else if (schema.type === "array" && schema.items) {
		output += `${spaces}${chalk.cyan("[")}${chalk.yellow("array")}\n`;
		output += `${spaces}  ${prettyPrintJsonSchema(schema.items as JSONSchema7, indent + 2)}\n`;
		output += `${spaces}${chalk.cyan("]")}`;
	} else {
		output += `${spaces}${chalk.yellow(schema.type as string)}`;
		if (schema.enum) {
			output += ` ${chalk.magenta("enum")}(${schema.enum.map((v) => chalk.blue(JSON.stringify(v))).join(", ")})`;
		}
	}

	return output;
}
