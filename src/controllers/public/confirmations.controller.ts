import type { Request, Response } from "express";
import { z } from "zod";
import { Appointment } from "../../models/Appointment";
import { Business } from "../../models/Business";
import { AppError } from "../../utils/AppError";
import { confirmBarberAvailability, rejectBarberAvailability } from "../../services/appointmentConfirmation";

async function loadAppointmentByToken(token: string) {
  const appointment = await Appointment.findOne({ confirmationToken: token })
    .populate("clientId", "name phone")
    .populate("serviceIds", "name")
    .populate({ path: "barberId", populate: { path: "userId", select: "name" } });
  if (!appointment) {
    throw new AppError("Este enlace ya no es válido", 404);
  }
  return appointment;
}

export async function getConfirmation(req: Request, res: Response): Promise<void> {
  const appointment = await loadAppointmentByToken(req.params.token as string);
  const business = await Business.findById(appointment.businessId).select("name");
  const client = appointment.clientId as unknown as { name: string };
  const barber = appointment.barberId as unknown as { userId?: { name: string } };
  const services = appointment.serviceIds as unknown as { name: string }[];

  res.json({
    businessName: business?.name ?? "el negocio",
    barberName: barber?.userId?.name ?? "el barbero",
    clientName: client?.name ?? "cliente",
    serviceNames: services.map((s) => s.name),
    startsAt: appointment.startsAt,
    depositAmountCents: appointment.depositAmountCents ?? 0,
    depositStatus: appointment.depositStatus,
  });
}

export async function acceptConfirmation(req: Request, res: Response): Promise<void> {
  const appointment = await loadAppointmentByToken(req.params.token as string);
  if (appointment.depositStatus !== "awaiting_barber") {
    throw new AppError("Esta cita ya no está esperando confirmación", 409);
  }
  await confirmBarberAvailability(appointment as any);
  res.json({ depositStatus: appointment.depositStatus });
}

const rejectSchema = z.object({ reason: z.string().optional() });

export async function rejectConfirmation(req: Request, res: Response): Promise<void> {
  const { reason } = rejectSchema.parse(req.body);
  const appointment = await loadAppointmentByToken(req.params.token as string);
  if (appointment.depositStatus !== "awaiting_barber") {
    throw new AppError("Esta cita ya no está esperando confirmación", 409);
  }
  await rejectBarberAvailability(appointment as any, reason);
  res.json({ depositStatus: appointment.depositStatus });
}
