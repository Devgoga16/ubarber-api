import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

export function createApp() {
  const app = express();

  app.use(helmet());
  // En desarrollo aceptamos cualquier origen (el puerto de Vite varía si 5173 está ocupado).
  // En producción se restringe a env.corsOrigin (dominio real de la web).
  app.use(
    cors({
      origin: env.nodeEnv === "production" ? env.corsOrigin : true,
      credentials: true,
    })
  );
  // Las fotos (recibo de depósito, comprobante, etc) llegan como base64 en el body JSON.
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());
  if (env.nodeEnv !== "test") {
    app.use(morgan("dev"));
  }

  // Dokploy y otros healthchecks suelen pegarle a la raíz, no a /api/health.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/", (_req, res) => {
    res.json({ status: "ok", service: "ubarber-api" });
  });

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
