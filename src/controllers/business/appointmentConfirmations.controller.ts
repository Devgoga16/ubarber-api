import type { Request, Response } from "express";
import { z } from "zod";
import { Appointment } from "../../models/Appointment";
import { Barber } from "../../models/Barber";
import { Business } from "../../models/Business";
import { AppError } from "../../utils/AppError";
import { sendWhatsAppMessage } from "../../whatsapp/manager";
import {
  buildOwnerNeedsPaymentReviewMessage,
  buildAppointmentConfirmedMessage,
  buildAppointmentRejectedMessage,
} from "../../whatsapp/messages";

async function resolveOwnBarberId(req: Request): Promise<string> {
  const barber = await Barber.findOne({
    businessId: req.auth!.businessId,
    userId: req.auth!.userId,
  });
  if (!barber) {
    throw new AppError("No tienes un perfil de barbero asociado", 404);
  }
  return barber._id.toString();
}

export async function listPendingConfirmations(req: Request, res: Response): Promise<void> {
  const businessId = req.auth!.businessId;
  const filter: Record<string, unknown> = { businessId };

  if (req.auth!.role === "barber") {
    filter.barberId = await resolveOwnBarberId(req);
    filter.depositStatus = "awaiting_barber";
  } else {
    filter.depositStatus = "awaiting_owner_review";
  }

  const appointments = await Appointment.find(filter)
    .populate("clientId", "name phone")
    .populate("serviceIds", "name")
    .populate({ path: "barberId", populate: { path: "userId", select: "name" } })
    .sort({ startsAt: 1 });

  res.json(appointments);
}

async function loadAppointmentForConfirmation(req: Request, expectedDepositStatus: string) {
  const filter: Record<string, unknown> = { _id: req.params.id, businessId: req.auth!.businessId };
  if (req.auth!.role === "barber") {
    filter.barberId = await resolveOwnBarberId(req);
  }

  const appointment = await Appointment.findOne(filter)
    .populate("clientId", "name phone")
    .populate({ path: "barberId", populate: { path: "userId", select: "name" } });
  if (!appointment) {
    throw new AppError("Cita no encontrada", 404);
  }
  if (appointment.depositStatus !== expectedDepositStatus) {
    throw new AppError("Esta cita ya no está en ese estado", 409);
  }
  return appointment;
}

export async function confirmAvailability(req: Request, res: Response): Promise<void> {
  const appointment = await loadAppointmentForConfirmation(req, "awaiting_barber");
  const business = await Business.findById(req.auth!.businessId);

  const client = appointment.clientId as unknown as { name: string; phone: string };
  const barber = appointment.barberId as unknown as { userId?: { name: string } };
  const barberName = barber?.userId?.name ?? "el barbero";

  appointment.barberAvailabilityConfirmedAt = new Date();

  if (appointment.depositMethod === "trust_code") {
    appointment.depositStatus = "confirmed";
    appointment.depositConfirmedAt = new Date();
    await appointment.save();

    const businessId = req.auth!.businessId!;
    if (client?.phone) {
      sendWhatsAppMessage(
        businessId,
        client.phone,
        buildAppointmentConfirmedMessage({
          recipientName: client.name,
          businessName: business?.name ?? "el negocio",
          startsAt: appointment.startsAt,
        })
      ).catch(() => {});
    }
  } else {
    appointment.depositStatus = "awaiting_owner_review";
    await appointment.save();

    const businessId = req.auth!.businessId!;
    if (business?.phone) {
      sendWhatsAppMessage(
        businessId,
        business.phone,
        buildOwnerNeedsPaymentReviewMessage({
          businessName: business.name,
          clientName: client?.name ?? "cliente",
          barberName,
          depositAmountCents: appointment.depositAmountCents ?? 0,
        })
      ).catch(() => {});
    }
  }

  res.json(appointment);
}

const rejectSchema = z.object({ reason: z.string().optional() });

export async function rejectAvailability(req: Request, res: Response): Promise<void> {
  const { reason } = rejectSchema.parse(req.body);
  const appointment = await loadAppointmentForConfirmation(req, "awaiting_barber");
  const business = await Business.findById(req.auth!.businessId);
  const client = appointment.clientId as unknown as { name: string; phone: string };

  appointment.status = "cancelled";
  appointment.depositStatus = "rejected";
  appointment.rejectionReason = reason;
  await appointment.save();

  const businessId = req.auth!.businessId!;
  if (client?.phone) {
    sendWhatsAppMessage(
      businessId,
      client.phone,
      buildAppointmentRejectedMessage({
        recipientName: client.name,
        businessName: business?.name ?? "el negocio",
        reason,
      })
    ).catch(() => {});
  }

  res.json(appointment);
}

export async function confirmDeposit(req: Request, res: Response): Promise<void> {
  const appointment = await loadAppointmentForConfirmation(req, "awaiting_owner_review");
  const business = await Business.findById(req.auth!.businessId);
  const client = appointment.clientId as unknown as { name: string; phone: string };
  const barber = appointment.barberId as unknown as { phone?: string };

  appointment.depositStatus = "confirmed";
  appointment.depositConfirmedAt = new Date();
  await appointment.save();

  const businessId = req.auth!.businessId!;
  if (client?.phone) {
    sendWhatsAppMessage(
      businessId,
      client.phone,
      buildAppointmentConfirmedMessage({
        recipientName: client.name,
        businessName: business?.name ?? "el negocio",
        startsAt: appointment.startsAt,
      })
    ).catch(() => {});
  }
  if (barber?.phone) {
    sendWhatsAppMessage(
      businessId,
      barber.phone,
      buildAppointmentConfirmedMessage({
        recipientName: "barbero",
        businessName: business?.name ?? "el negocio",
        startsAt: appointment.startsAt,
      })
    ).catch(() => {});
  }

  res.json(appointment);
}

export async function rejectDeposit(req: Request, res: Response): Promise<void> {
  const { reason } = rejectSchema.parse(req.body);
  const appointment = await loadAppointmentForConfirmation(req, "awaiting_owner_review");
  const business = await Business.findById(req.auth!.businessId);
  const client = appointment.clientId as unknown as { name: string; phone: string };
  const barber = appointment.barberId as unknown as { phone?: string };

  appointment.status = "cancelled";
  appointment.depositStatus = "rejected";
  appointment.rejectionReason = reason ?? "No se pudo verificar el adelanto";
  await appointment.save();

  const businessId = req.auth!.businessId!;
  if (client?.phone) {
    sendWhatsAppMessage(
      businessId,
      client.phone,
      buildAppointmentRejectedMessage({
        recipientName: client.name,
        businessName: business?.name ?? "el negocio",
        reason: appointment.rejectionReason,
      })
    ).catch(() => {});
  }
  if (barber?.phone) {
    sendWhatsAppMessage(
      businessId,
      barber.phone,
      buildAppointmentRejectedMessage({
        recipientName: "barbero",
        businessName: business?.name ?? "el negocio",
        reason: appointment.rejectionReason,
      })
    ).catch(() => {});
  }

  res.json(appointment);
}
