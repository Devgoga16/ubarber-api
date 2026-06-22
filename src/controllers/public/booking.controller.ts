import type { Request, Response } from "express";
import { z } from "zod";
import { Business } from "../../models/Business";
import { Subscription } from "../../models/Subscription";
import { Location } from "../../models/Location";
import { Service } from "../../models/Service";
import { Barber } from "../../models/Barber";
import { Client } from "../../models/Client";
import { Appointment } from "../../models/Appointment";
import { getAvailableSlots } from "../../services/shiftAvailability";
import { assertWithinBarberShift } from "../../services/shiftAvailability";
import { AppError } from "../../utils/AppError";
import { sendWhatsAppMessage } from "../../whatsapp/manager";

async function resolveBookableBusiness(slug: string) {
  const business = await Business.findOne({ slug });
  if (!business) {
    throw new AppError("Negocio no encontrado", 404);
  }
  const subscription = await Subscription.findOne({ businessId: business._id });
  const isBookable = subscription && ["trial", "active"].includes(subscription.status);
  return { business, isBookable: Boolean(isBookable) };
}

export async function getPublicBusinessInfo(req: Request, res: Response): Promise<void> {
  const { business, isBookable } = await resolveBookableBusiness(req.params.slug as string);

  const [locations, services, barbers] = await Promise.all([
    Location.find({ businessId: business._id, isActive: true }).select("name address"),
    Service.find({ businessId: business._id, isActive: true }).select(
      "name durationMinutes priceCents photo locationIds"
    ),
    Barber.find({ businessId: business._id, isActive: true })
      .select("locationIds favoriteServiceIds")
      .populate("userId", "name"),
  ]);

  res.json({
    business: { name: business.name },
    bookable: isBookable,
    locations,
    services,
    barbers: barbers.map((b) => {
      const user = b.userId as unknown as { name: string } | null;
      return {
        _id: b._id,
        name: user && typeof user === "object" ? user.name : "Barbero",
        locationIds: b.locationIds,
        favoriteServiceIds: b.favoriteServiceIds,
      };
    }),
  });
}

const availabilityQuerySchema = z.object({
  barberId: z.string(),
  locationId: z.string(),
  date: z.string(), // YYYY-MM-DD
  durationMinutes: z.coerce.number().int().min(5),
});

export async function getPublicAvailability(req: Request, res: Response): Promise<void> {
  const { business, isBookable } = await resolveBookableBusiness(req.params.slug as string);
  if (!isBookable) {
    res.json({ slots: [] });
    return;
  }

  const { barberId, locationId, date, durationMinutes } = availabilityQuerySchema.parse(req.query);

  const barber = await Barber.findOne({ _id: barberId, businessId: business._id, isActive: true });
  if (!barber) {
    throw new AppError("Barbero no encontrado", 404);
  }

  const [year, month, day] = date.split("-").map(Number);
  const targetDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

  const busyAppointments = await Appointment.find({
    barberId,
    status: { $nin: ["cancelled", "no_show"] },
    startsAt: { $gte: targetDate, $lte: dayEnd },
  }).select("startsAt endsAt");

  const slots = getAvailableSlots(
    barber,
    locationId,
    targetDate,
    durationMinutes,
    busyAppointments.map((a) => ({ startsAt: a.startsAt, endsAt: a.endsAt }))
  );

  res.json({ slots });
}

const createPublicAppointmentSchema = z.object({
  locationId: z.string(),
  barberId: z.string(),
  serviceIds: z.array(z.string()).min(1),
  startsAt: z.coerce.date(),
  client: z.object({
    name: z.string().min(2),
    phone: z.string().min(6),
  }),
});

export async function createPublicAppointment(req: Request, res: Response): Promise<void> {
  const { business, isBookable } = await resolveBookableBusiness(req.params.slug as string);
  if (!isBookable) {
    throw new AppError("Este negocio no está aceptando reservas en este momento", 409);
  }

  const data = createPublicAppointmentSchema.parse(req.body);
  const businessId = business._id;

  const barber = await Barber.findOne({ _id: data.barberId, businessId, isActive: true });
  if (!barber) {
    throw new AppError("Barbero no encontrado", 404);
  }
  if (!barber.locationIds.some((id) => id.toString() === data.locationId)) {
    throw new AppError("Ese barbero no trabaja en la sede seleccionada", 400);
  }

  const services = await Service.find({
    _id: { $in: data.serviceIds },
    businessId,
    isActive: true,
  });
  if (services.length !== data.serviceIds.length) {
    throw new AppError("Uno o más servicios no son válidos", 400);
  }

  const durationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalPriceCents = services.reduce((sum, s) => sum + s.priceCents, 0);
  const startsAt = data.startsAt;
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

  assertWithinBarberShift(barber, data.locationId, startsAt, endsAt);

  const conflict = await Appointment.findOne({
    barberId: barber._id,
    status: { $nin: ["cancelled", "no_show"] },
    startsAt: { $lt: endsAt },
    endsAt: { $gt: startsAt },
  });
  if (conflict) {
    throw new AppError("Ese horario ya no está disponible, elige otro", 409);
  }

  const client = await Client.findOneAndUpdate(
    { businessId, phone: data.client.phone.trim() },
    { $setOnInsert: { businessId, phone: data.client.phone.trim(), name: data.client.name } },
    { upsert: true, new: true }
  );

  const appointment = await Appointment.create({
    businessId,
    locationId: data.locationId,
    barberId: barber._id,
    clientId: client._id,
    serviceIds: data.serviceIds,
    startsAt,
    endsAt,
    totalPriceCents,
    source: "public",
  });

  const confirmationMessage = `Hola ${client.name} 👋, tu cita en *${business.name}* quedó agendada para el ${startsAt.toLocaleDateString("es-PE")} a las ${startsAt.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}. ¡Te esperamos!`;
  sendWhatsAppMessage(businessId.toString(), client.phone, confirmationMessage).catch(() => {});

  res.status(201).json({ appointmentId: appointment._id });
}
