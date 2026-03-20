import { createServer } from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { logger } from "./lib/logger.js";
import { startMatchingJob } from "./modules/matching/matching.job.js";
import { createSocketServer } from "./modules/sockets/socket.server.js";

const server = createServer(app);
createSocketServer(server);

server.listen(env.PORT, () => {
  logger.info(`Server listening on http://localhost:${env.PORT}`);
  startMatchingJob();
});

const shutdown = async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
