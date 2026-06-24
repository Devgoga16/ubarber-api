import { createApp } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { reconnectAllSessions } from "./whatsapp/manager";
import { startReminderCron } from "./whatsapp/reminderCron";
import { startBillingCron } from "./services/billingCron";

// Baileys dispara internamente promesas (p.ej. sendPassiveIq al cerrarse el socket)
// que pueden rechazarse fuera de nuestro código, sin un .catch posible. Sin este handler,
// Node 22 trata ese unhandledRejection como fatal y mata el proceso entero.
process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled rejection (ignorada para no caer el proceso):", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[server] Uncaught exception (ignorada para no caer el proceso):", err);
});

async function main() {
  await connectDB();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`[server] uBarber API escuchando en puerto ${env.port}`);
  });

  reconnectAllSessions().catch((err) =>
    console.error("[whatsapp] Error reconectando sesiones:", err)
  );
  startReminderCron();
  startBillingCron();
}

main().catch((err) => {
  console.error("[server] Error fatal al iniciar:", err);
  process.exit(1);
});
