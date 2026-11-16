import winston from "winston";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "debug",

  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    // winston.format.colorize({ level: true }),
    winston.format.printf(({ timestamp, level, message, ...payload }) => {
      const formatPayload =
        Object.keys(payload).length > 0 ? `| ${JSON.stringify(payload)}` : "";
      return `${timestamp} [${level}]: ${message} => ${formatPayload}`;
    })
  ),

  transports: [
    // new winston.transports.File({
    //   filename: logAppFile,
    //   level: "info",
    //   format: winston.format.json(),
    // }),
    // new winston.transports.File({
    //   filename: logAppErrorFile,
    //   level: "error",
    //   format: winston.format.json(),
    // }),
    // new winston.transports.File({
    //   filename: logAppDebugFile,
    //   level: "debug",
    //   format: winston.format.json(),
    // }),
  ],
});

// Always on, so errors show in the terminal and in `docker logs` (the HTTP
// transport below can't deliver anything when the database is down).
logger.add(
  new winston.transports.Console({
    format: winston.format.simple(),
  })
);

if (process.env.NODE_ENV === "production") {
  logger.add(
    new winston.transports.Http({
      // This server posts logs to itself. Next sets PORT on startup
      // (3000 in the Docker image, 3001 with `pnpm start`).
      host: "localhost",
      port: Number(process.env.PORT) || 3000,
      path: "/api/logs",
      headers: {
        Authorization: `Bearer ${process.env.LOG_TOKEN_SECRET}`,
      },
      handleExceptions: true,
      format: winston.format.json(),
    })
  );
}
