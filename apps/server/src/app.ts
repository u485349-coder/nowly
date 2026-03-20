import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { analyticsRouter } from "./modules/analytics/analytics.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { availabilityRouter } from "./modules/availability/availability.routes.js";
import { discordRouter } from "./modules/discord/discord.routes.js";
import { friendsRouter } from "./modules/friends/friends.routes.js";
import { hangoutsRouter } from "./modules/hangouts/hangouts.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

export const app = express();

app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "nowly-server",
    timestamp: new Date().toISOString()
  });
});

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/availability", availabilityRouter);
app.use("/friends", friendsRouter);
app.use("/hangouts", hangoutsRouter);
app.use("/discord", discordRouter);
app.use("/analytics", analyticsRouter);

app.use(
  (
    error: Error,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction
  ) => {
    response.status(500).json({
      error: error.message || "Internal server error"
    });
  }
);
