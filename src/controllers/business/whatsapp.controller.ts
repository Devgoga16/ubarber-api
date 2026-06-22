import type { Request, Response } from "express";
import {
  connectBusinessWhatsApp,
  disconnectBusinessWhatsApp,
  getSessionStatus,
} from "../../whatsapp/manager";

export async function getWhatsAppStatus(req: Request, res: Response): Promise<void> {
  const businessId = req.auth!.businessId!;
  const { status, qrDataUrl } = getSessionStatus(businessId);
  // El QR es el "login" de WhatsApp del negocio: solo owner/manager pueden verlo y escanearlo.
  const canSeeQr = req.auth!.role === "owner" || req.auth!.role === "manager";
  res.json({ status, qr: canSeeQr ? qrDataUrl ?? null : null });
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
