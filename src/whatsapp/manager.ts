import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
} from "baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import { useMongoAuthState } from "./mongoAuthState";
import { WhatsAppSession, type WhatsAppConnectionStatus } from "../models/WhatsAppSession";

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

export async function reconnectAllSessions(): Promise<void> {
  const connectedSessions = await WhatsAppSession.find({ status: { $ne: "disconnected" } });
  for (const session of connectedSessions) {
    connectBusinessWhatsApp(session.businessId.toString()).catch(() => {});
  }
}
