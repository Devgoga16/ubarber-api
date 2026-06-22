import cron from "node-cron";
import { Appointment } from "../models/Appointment";
import { sendWhatsAppMessage } from "./manager";
import { buildReminderMessage } from "./messages";

async function sendDueReminders(): Promise<void> {
  const now = Date.now();
  const windowStart = new Date(now + 55 * 60_000);
  const windowEnd = new Date(now + 65 * 60_000);

  const appointments = await Appointment.find({
    status: { $in: ["pending", "in_progress"] },
    reminderSent: false,
    startsAt: { $gte: windowStart, $lte: windowEnd },
  })
    .populate("clientId", "name phone")
    .populate("serviceIds", "name")
    .populate({ path: "barberId", populate: { path: "userId", select: "name" } })
    .populate("businessId", "name");

  for (const appointment of appointments) {
    const client = appointment.clientId as unknown as { name: string; phone: string };
    const services = appointment.serviceIds as unknown as { name: string }[];
    const barber = appointment.barberId as unknown as { userId?: { name: string } };
    const business = appointment.businessId as unknown as { name: string };

    if (!client?.phone) continue;

    const message = buildReminderMessage({
      clientName: client.name,
      businessName: business?.name ?? "tu barbería",
      serviceNames: services.map((s) => s.name),
      barberName: barber?.userId?.name ?? "tu barbero",
      startsAt: appointment.startsAt,
    });

    const sent = await sendWhatsAppMessage(appointment.businessId.toString(), client.phone, message);
    if (sent) {
      appointment.reminderSent = true;
      await appointment.save();
    }
  }
}

export function startReminderCron(): void {
  cron.schedule("* * * * *", () => {
    sendDueReminders().catch((err) => console.error("[whatsapp] Error enviando recordatorios:", err));
  });
}
