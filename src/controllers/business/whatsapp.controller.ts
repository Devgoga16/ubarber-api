import type { Request, Response } from "express";
import {
  connectBusinessWhatsApp,
  disconnectBusinessWhatsApp,
  getSessionStatus,
} from "../../whatsapp/manager";

export async function getWhatsAppStatus(req: Request, res: Response): Promise<void> {
  const businessId = req.auth!.businessId!;
  const { status, qrDataUrl } = getSessionStatus(businessId);
  res.json({ status, qr: qrDataUrl ?? null });
}

export async function connectWhatsApp(req: Request, res: Response): Promise<void> {
  const businessId = req.auth!.businessId!;
  await connectBusinessWhatsApp(businessId);
  res.status(202).json({ message: "Conectando, escanea el código QR" });
}

export async function disconnectWhatsApp(req: Request, res: Response): Promise<void> {
  const businessId = req.auth!.businessId!;
  await disconnectBusinessWhatsApp(businessId);
  res.json({ message: "WhatsApp desconectado" });
}
