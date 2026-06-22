import type { Request, Response } from "express";
import { z } from "zod";
import { Appointment } from "../../models/Appointment";
import { Service } from "../../models/Service";
import { Barber } from "../../models/Barber";
import { APPOINTMENT_STATUSES } from "../../types/roles";
import { AppError } from "../../utils/AppError";
import { assertWithinBarberShift } from "../../services/shiftAvailability";
import { sendWhatsAppMessage } from "../../whatsapp/manager";
import { buildPaymentSummaryMessage } from "../../whatsapp/messages";

const createAppointmentSchema = z.object({
  locationId: z.string(),
  barberId: z.string().optional(),
  clientId: z.string(),
  serviceIds: z.array(z.string()).min(1),
  startsAt: z.coerce.date(),
  notes: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES),
});

const registerPaymentSchema = z.object({
  paymentMethodId: z.string(),
  receiptPhoto: z.string().optional(),
});

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

export async function listAppointments(req: Request, res: Response): Promise<void> {
  const { locationId, barberId, from, to, status } = req.query;
  const filter: Record<string, unknown> = { businessId: req.auth!.businessId };
  if (typeof locationId === "string") filter.locationId = locationId;
  if (typeof status === "string") filter.status = status;

  // Un barbero solo puede ver su propia agenda, sin importar qué barberId le pidan por query.
  if (req.auth!.role === "barber") {
    filter.barberId = await resolveOwnBarberId(req);
  } else if (typeof barberId === "string") {
    filter.barberId = barberId;
  }

  if (typeof from === "string" || typeof to === "string") {
    filter.startsAt = {
      ...(typeof from === "string" ? { $gte: new Date(from) } : {}),
      ...(typeof to === "string" ? { $lte: new Date(to) } : {}),
    };
  }

  const appointments = await Appointment.find(filter)
    .populate("clientId", "name phone")
    .populate("serviceIds", "name durationMinutes priceCents")
    .populate("paymentMethodId", "name")
    .sort({ startsAt: 1 });
  res.json(appointments);
}

export async function createAppointment(req: Request, res: Response): Promise<void> {
  const businessId = req.auth!.businessId!;
  const data = createAppointmentSchema.parse(req.body);

  // Un barbero solo puede agendarse citas a sí mismo, sin importar qué barberId le pidan por body.
  const barberId = req.auth!.role === "barber" ? await resolveOwnBarberId(req) : data.barberId;
  if (!barberId) {
    throw new AppError("Debes indicar el barbero de la cita", 400);
  }

  const barber = await Barber.findOne({ _id: barberId, businessId });
  if (!barber) {
    throw new AppError("Barbero no encontrado", 404);
  }
  if (!barber.locationIds.some((id) => id.toString() === data.locationId)) {
    throw new AppError("Ese barbero no trabaja en la sede seleccionada", 400);
  }

  const services = await Service.find({ _id: { $in: data.serviceIds }, businessId });
  if (services.length !== data.serviceIds.length) {
    throw new AppError("Uno o más servicios no son válidos", 400);
  }

  const durationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalPriceCents = services.reduce((sum, s) => sum + s.priceCents, 0);
  const startsAt = data.startsAt;
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

  assertWithinBarberShift(barber, data.locationId, startsAt, endsAt);

  const conflict = await Appointment.findOne({
    barberId,
    status: { $nin: ["cancelled", "no_show"] },
    startsAt: { $lt: endsAt },
    endsAt: { $gt: startsAt },
  });
  if (conflict) {
    throw new AppError("El barbero ya tiene una cita en ese horario", 409);
  }

  const appointment = await Appointment.create({
    businessId,
    locationId: data.locationId,
    barberId,
    clientId: data.clientId,
    serviceIds: data.serviceIds,
    startsAt,
    endsAt,
    totalPriceCents,
    notes: data.notes,
    createdBy: req.auth!.userId,
  });

  res.status(201).json(appointment);
}

export async function updateAppointmentStatus(req: Request, res: Response): Promise<void> {
  const { status } = updateStatusSchema.parse(req.body);
  const filter: Record<string, unknown> = { _id: req.params.id, businessId: req.auth!.businessId };

  if (req.auth!.role === "barber") {
    filter.barberId = await resolveOwnBarberId(req);
  }

  const appointment = await Appointment.findOneAndUpdate(filter, { status }, { new: true });
  if (!appointment) {
    throw new AppError("Cita no encontrada", 404);
  }
  res.json(appointment);
}

export async function registerAppointmentPayment(req: Request, res: Response): Promise<void> {
  const data = registerPaymentSchema.parse(req.body);
  const filter: Record<string, unknown> = { _id: req.params.id, businessId: req.auth!.businessId };

  if (req.auth!.role === "barber") {
    filter.barberId = await resolveOwnBarberId(req);
  }

  const appointment = await Appointment.findOneAndUpdate(
    filter,
    {
      paid: true,
      paidAt: new Date(),
      paymentMethodId: data.paymentMethodId,
      ...(data.receiptPhoto ? { receiptPhoto: data.receiptPhoto } : {}),
    },
    { new: true }
  )
    .populate("clientId", "name phone")
    .populate("serviceIds", "name")
    .populate("paymentMethodId", "name")
    .populate("businessId", "name");
  if (!appointment) {
    throw new AppError("Cita no encontrada", 404);
  }

  const client = appointment.clientId as unknown as { name: string; phone: string };
  const services = appointment.serviceIds as unknown as { name: string }[];
  const paymentMethod = appointment.paymentMethodId as unknown as { name: string };
  const business = appointment.businessId as unknown as { name: string };

  if (client?.phone) {
    const message = buildPaymentSummaryMessage({
      clientName: client.name,
      businessName: business?.name ?? "tu barbería",
      serviceNames: services.map((s) => s.name),
      totalPriceCents: appointment.totalPriceCents,
      paymentMethodName: paymentMethod?.name ?? "—",
    });
    sendWhatsAppMessage(req.auth!.businessId!, client.phone, message).catch(() => {});
  }

  res.json(appointment);
}
