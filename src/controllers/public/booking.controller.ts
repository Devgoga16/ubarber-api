import type { Request, Response } from "express";
import { randomBytes } from "crypto";
import { z } from "zod";
import { env } from "../../config/env";
import { Business } from "../../models/Business";
import { Subscription } from "../../models/Subscription";
import { Location } from "../../models/Location";
import { Service } from "../../models/Service";
import { Barber } from "../../models/Barber";
import { Client } from "../../models/Client";
import { Appointment } from "../../models/Appointment";
import { PaymentMethod } from "../../models/PaymentMethod";
import { getAvailableSlots, assertWithinBarberShift } from "../../services/shiftAvailability";
import { computeDepositCents } from "../../services/deposit";
import { AppError } from "../../utils/AppError";
import { sendWhatsAppMessage } from "../../whatsapp/manager";
import {
  buildClientAwaitingConfirmationMessage,
  buildOwnerNewBookingMessage,
  buildBarberConfirmationRequestMessage,
  buildAppointmentConfirmedMessage,
} from "../../whatsapp/messages";

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

  const [locations, services, barbers, paymentMethods] = await Promise.all([
    Location.find({ businessId: business._id, isActive: true }).select("name address"),
    Service.find({ businessId: business._id, isActive: true }).select(
      "name durationMinutes priceCents photo locationIds depositType depositValueCents depositValuePercent"
    ),
    Barber.find({ businessId: business._id, isActive: true })
      .select("locationIds favoriteServiceIds")
      .populate("userId", "name"),
    PaymentMethod.find({ businessId: business._id, isActive: true }).select("name"),
  ]);

  res.json({
    business: { name: business.name },
    bookable: isBookable,
    deposit: {
      enabled: business.depositEnabled,
      scope: business.depositScope,
      type: business.depositType,
      valueCents: business.depositValueCents,
      valuePercent: business.depositValuePercent,
    },
    locations,
    services,
    paymentMethods,
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
  depositMethod: z.enum(["proof_photo", "trust_code"]).optional(),
  depositProofPhoto: z.string().optional(),
  depositPaymentMethodId: z.string().optional(),
  trustCode: z.string().optional(),
});

export async function createPublicAppointment(req: Request, res: Response): Promise<void> {
  const { business, isBookable } = await resolveBookableBusiness(req.params.slug as string);
  if (!isBookable) {
    throw new AppError("Este negocio no está aceptando reservas en este momento", 409);
  }

  const data = createPublicAppointmentSchema.parse(req.body);
  const businessId = business._id;

  const barber = await Barber.findOne({ _id: data.barberId, businessId, isActive: true }).populate(
    "userId",
    "name"
  );
  if (!barber) {
    throw new AppError("Barbero no encontrado", 404);
  }
  const barberName =
    typeof barber.userId === "object" && barber.userId
      ? (barber.userId as unknown as { name: string }).name
      : "tu barbero";
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

  // --- Resolución del adelanto ---
  const requiredDepositCents = computeDepositCents(business, services);
  let depositStatus: "not_required" | "awaiting_barber" = "not_required";
  let depositMethod: "proof_photo" | "trust_code" | undefined;
  let depositProofPhoto: string | undefined;
  let depositPaymentMethodId: string | undefined;

  if (requiredDepositCents > 0) {
    if (data.depositMethod === "trust_code") {
      if (!data.trustCode || !business.trustCode || data.trustCode.trim() !== business.trustCode) {
        throw new AppError("El código no es válido. Pídele el código correcto al negocio.", 400);
      }
      depositMethod = "trust_code";
    } else {
      if (!data.depositProofPhoto) {
        throw new AppError("Debes adjuntar el comprobante del adelanto o usar el código del negocio", 400);
      }
      if (!data.depositPaymentMethodId) {
        throw new AppError("Debes indicar con qué método pagaste el adelanto", 400);
      }
      const method = await PaymentMethod.findOne({
        _id: data.depositPaymentMethodId,
        businessId,
        isActive: true,
      });
      if (!method) {
        throw new AppError("El método de pago seleccionado no es válido", 400);
      }
      depositMethod = "proof_photo";
      depositProofPhoto = data.depositProofPhoto;
      depositPaymentMethodId = method._id.toString();
    }
    depositStatus = "awaiting_barber";
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
    depositStatus,
    depositAmountCents: requiredDepositCents > 0 ? requiredDepositCents : undefined,
    depositMethod,
    depositProofPhoto,
    depositPaymentMethodId,
    confirmationToken: depositStatus === "awaiting_barber" ? randomBytes(20).toString("hex") : undefined,
  });

  if (depositStatus === "awaiting_barber") {
    sendWhatsAppMessage(
      businessId.toString(),
      client.phone,
      buildClientAwaitingConfirmationMessage({
        clientName: client.name,
        businessName: business.name,
        startsAt,
      })
    ).catch(() => {});

    if (business.phone) {
      sendWhatsAppMessage(
        businessId.toString(),
        business.phone,
        buildOwnerNewBookingMessage({
          businessName: business.name,
          clientName: client.name,
          barberName,
          startsAt,
        })
      ).catch(() => {});
    }

    if (barber.phone) {
      const confirmationUrl = `${env.publicWebUrl}/confirmar/${appointment.confirmationToken}`;
      sendWhatsAppMessage(
        businessId.toString(),
        barber.phone,
        buildBarberConfirmationRequestMessage({
          barberName,
          clientName: client.name,
          serviceNames: services.map((s) => s.name),
          startsAt,
          confirmationUrl,
        })
      ).catch(() => {});
    }
  } else {
    // Sin adelanto requerido: queda directamente como una cita normal pendiente,
    // igual que las que crea el staff — solo confirmamos al cliente.
    sendWhatsAppMessage(
      businessId.toString(),
      client.phone,
      buildAppointmentConfirmedMessage({
        recipientName: client.name,
        businessName: business.name,
        startsAt,
      })
    ).catch(() => {});
  }

  res.status(201).json({ appointmentId: appointment._id, depositStatus, requiredDepositCents });
}
