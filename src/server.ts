import { createApp } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

async function main() {
  await connectDB();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`[server] uBarber API escuchando en puerto ${env.port}`);
  });
}

main().catch((err) => {
  console.error("[server] Error fatal al iniciar:", err);
  process.exit(1);
});
