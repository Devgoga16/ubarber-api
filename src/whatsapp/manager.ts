import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
} from "baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import { useMongoAuthState } from "./mongoAuthState";
import { WhatsAppSession, type WhatsAppConnectionStatus } from "../models/WhatsAppSession";
import { Appointment } from "../models/Appointment";
import { Barber } from "../models/Barber";
import { Business } from "../models/Business";
import {
  buildOwnerNeedsPaymentReviewMessage,
  buildAppointmentConfirmedMessage,
  buildAppointmentRejectedMessage,
} from "./messages";

interface SessionEntry {
  socket: WASocket;
  status: WhatsAppConnectionStatus;
  qrDataUrl?: string;
}

const sessions = new Map<string, SessionEntry>();

function logger() {
  // Baileys solo necesita un logger con esta forma mínima; silenciamos el ruido por defecto.
  const noop = () => {};
  const base: any = { level: "silent", info: noop, error: noop, warn: noop, debug: noop, trace: noop };
  base.child = () => base;
  return base;
}

export function getSessionStatus(businessId: string): {
  status: WhatsAppConnectionStatus;
  qrDataUrl?: string;
} {
  const entry = sessions.get(businessId);
  if (!entry) return { status: "disconnected" };
  return { status: entry.status, qrDataUrl: entry.qrDataUrl };
}

export async function connectBusinessWhatsApp(businessId: string): Promise<void> {
  const existing = sessions.get(businessId);
  if (existing && existing.status !== "disconnected") {
    return;
  }

  const { state, saveCreds } = await useMongoAuthState(businessId);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    auth: state,
    version,
    logger: logger(),
    printQRInTerminal: false,
  });

  sessions.set(businessId, { socket, status: "connecting" });
  await WhatsAppSession.findOneAndUpdate(
    { businessId },
    { status: "connecting" },
    { upsert: true }
  );

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe || !msg.message) continue;
      const text =
        msg.message.conversation ?? msg.message.extendedTextMessage?.text ?? undefined;
      if (!text) continue;
      const senderJid = msg.key.remoteJid;
      if (!senderJid) continue;
      handleIncomingReply(businessId, senderJid, text).catch(() => {});
    }
  });

  socket.ev.on("connection.update", async (update) => {
    const entry = sessions.get(businessId);
    if (!entry) return;

    if (update.qr) {
      entry.qrDataUrl = await QRCode.toDataURL(update.qr);
      entry.status = "connecting";
    }

    if (update.connection === "open") {
      entry.status = "connected";
      entry.qrDataUrl = undefined;
      const phoneNumber = socket.user?.id?.split(":")[0];
      await WhatsAppSession.findOneAndUpdate(
        { businessId },
        { status: "connected", phoneNumber },
        { upsert: true }
      );
    }

    if (update.connection === "close") {
      const statusCode = (update.lastDisconnect?.error as Boom)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        sessions.delete(businessId);
        await WhatsAppSession.findOneAndUpdate(
          { businessId },
          { status: "disconnected", authData: undefined, phoneNumber: undefined },
          { upsert: true }
        );
        return;
      }

      entry.status = "disconnected";
      await WhatsAppSession.findOneAndUpdate(
        { businessId },
        { status: "disconnected" },
        { upsert: true }
      );
      // Reintenta automáticamente salvo que haya sido un logout explícito.
      connectBusinessWhatsApp(businessId).catch(() => {});
    }
  });
}

export async function disconnectBusinessWhatsApp(businessId: string): Promise<void> {
  const entry = sessions.get(businessId);
  if (entry) {
    await entry.socket.logout().catch(() => {});
    sessions.delete(businessId);
  }
  await WhatsAppSession.findOneAndUpdate(
    { businessId },
    { status: "disconnected", authData: undefined, phoneNumber: undefined },
    { upsert: true }
  );
}

function toWhatsAppJid(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  // Números peruanos guardados a 9 dígitos sin código de país: se asume +51.
  const withCountryCode = digits.length === 9 ? `51${digits}` : digits;
  return `${withCountryCode}@s.whatsapp.net`;
}

export async function sendWhatsAppMessage(businessId: string, phone: string, text: string): Promise<boolean> {
  const entry = sessions.get(businessId);
  if (!entry || entry.status !== "connected") return false;

  try {
    await entry.socket.sendMessage(toWhatsAppJid(phone), { text });
    return true;
  } catch {
    return false;
  }
}

function jidToDigits(jid: string): string {
  return jid.split("@")[0].replace(/\D/g, "");
}

/**
 * Permite que un barbero conteste por WhatsApp con texto plano (ej. "SI a1b2c3" / "NO a1b2c3")
 * en vez de tener que abrir la app — WhatsApp ya no soporta botones interactivos de forma
 * confiable fuera de la API oficial de Meta, así que esta es la vía "responder por WhatsApp".
 */
async function handleIncomingReply(businessId: string, senderJid: string, text: string): Promise<void> {
  const match = text.trim().match(/^(si|sí|no)\s+([a-f0-9]{4,8})$/i);
  if (!match) return;

  const decision = match[1].toLowerCase().startsWith("s") ? "confirm" : "reject";
  const code = match[2].toLowerCase();
  const senderDigits = jidToDigits(senderJid);

  const candidates = await Appointment.find({ businessId, depositStatus: "awaiting_barber" })
    .populate("clientId", "name phone")
    .populate({ path: "barberId", populate: { path: "userId", select: "name" } });

  const target = candidates.find((a) => a._id.toString().slice(-6) === code);
  if (!target) return;

  const barber = target.barberId as unknown as { phone?: string; userId?: { name: string } };
  if (!barber?.phone || jidToDigits(barber.phone) !== senderDigits) return; // solo el barbero asignado puede confirmar

  const business = await Business.findById(businessId);
  const client = target.clientId as unknown as { name: string; phone: string };

  if (decision === "confirm") {
    target.barberAvailabilityConfirmedAt = new Date();
    if (target.depositMethod === "trust_code") {
      target.depositStatus = "confirmed";
      target.depositConfirmedAt = new Date();
      await target.save();
      if (client?.phone) {
        await sendWhatsAppMessage(
          businessId,
          client.phone,
          buildAppointmentConfirmedMessage({
            recipientName: client.name,
            businessName: business?.name ?? "el negocio",
            startsAt: target.startsAt,
          })
        );
      }
    } else {
      target.depositStatus = "awaiting_owner_review";
      await target.save();
      if (business?.phone) {
        await sendWhatsAppMessage(
          businessId,
          business.phone,
          buildOwnerNeedsPaymentReviewMessage({
            businessName: business.name,
            clientName: client?.name ?? "cliente",
            barberName: barber.userId?.name ?? "el barbero",
            depositAmountCents: target.depositAmountCents ?? 0,
          })
        );
      }
    }
  } else {
    target.status = "cancelled";
    target.depositStatus = "rejected";
    target.rejectionReason = "El barbero no tiene disponibilidad";
    await target.save();
    if (client?.phone) {
      await sendWhatsAppMessage(
        businessId,
        client.phone,
        buildAppointmentRejectedMessage({
          recipientName: client.name,
          businessName: business?.name ?? "el negocio",
          reason: target.rejectionReason,
        })
      );
    }
  }
}

export async function reconnectAllSessions(): Promise<void> {
  const connectedSessions = await WhatsAppSession.find({ status: { $ne: "disconnected" } });
  for (const session of connectedSessions) {
    connectBusinessWhatsApp(session.businessId.toString()).catch(() => {});
  }
}
