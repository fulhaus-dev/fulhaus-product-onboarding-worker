import { env } from "@worker/config/environment.js";
import pino, { type LoggerOptions } from "pino";

// Define pino options with type checking
const pinoOptions: LoggerOptions = {
	level: env.LOG_LEVEL,
	name: "app-logger",
};

if (env.NODE_ENV === "development") {
	pinoOptions.transport = {
		target: "pino-pretty",
		options: {
			colorize: true,
			translateTime: "SYS:standard", // More readable timestamp format
			ignore: "pid,hostname,name", // Hide pid, hostname, and the logger name in pretty print
		},
	};
}

// Explicitly type the logger instance
const logger = pino(pinoOptions);

export default logger;
