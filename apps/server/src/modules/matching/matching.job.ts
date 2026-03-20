import cron from "node-cron";
import { logger } from "../../lib/logger.js";
import { runMatchingCycle } from "./matching.engine.js";

export const startMatchingJob = () => {
  cron.schedule("* * * * *", async () => {
    try {
      await runMatchingCycle();
    } catch (error) {
      logger.error("Matching job failed", error);
    }
  });

  logger.info("Matching job scheduled for every minute");
};
