import { Router } from "express";
import mongoose from "mongoose";
import { authRouter } from "./auth.routes";
import { adminRouter } from "./admin.routes";
import { businessRouter } from "./business.routes";
import { publicRouter } from "./public.routes";

export const apiRouter = Router();

const dbStateLabels: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

apiRouter.get("/health", (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbStateLabels[dbState] ?? "unknown";
  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    db: dbStatus,
  });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/business", businessRouter);
apiRouter.use("/public", publicRouter);
