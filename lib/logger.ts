type LogLevel = "info" | "warn" | "error";

const prefix = "[GameExperience]";

function emit(level: LogLevel, message: string, ...args: unknown[]) {
  const fn =
    level === "info" ? console.log : level === "warn" ? console.warn : console.error;
  fn(`${prefix} ${message}`, ...args);
}

export const logger = {
  info: (message: string, ...args: unknown[]) => emit("info", message, ...args),
  warn: (message: string, ...args: unknown[]) => emit("warn", message, ...args),
  error: (message: string, ...args: unknown[]) => emit("error", message, ...args),
};
