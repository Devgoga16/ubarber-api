import cron from "node-cron";
import { runBillingSweep } from "./billing";

export function startBillingCron(): void {
  cron.schedule("0 3 * * *", () => {
    runBillingSweep().catch((err) => console.error("[billing] Error en el sweep de facturación:", err));
  });
}
