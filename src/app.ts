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
  app.use(express.json());
  app.use(cookieParser());
  if (env.nodeEnv !== "test") {
    app.use(morgan("dev"));
  }

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
