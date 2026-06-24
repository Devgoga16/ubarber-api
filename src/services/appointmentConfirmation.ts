import type { HydratedDocument } from "mongoose";
import type { AppointmentDocument } from "../models/Appointment";
import { Business } from "../models/Business";
import { sendWhatsAppMessage } from "../whatsapp/manager";
import {
  buildOwnerNeedsPaymentReviewMessage,
  buildAppointmentConfirmedMessage,
  buildAppointmentRejectedMessage,
} from "../whatsapp/messages";

type PopulatedAppointment = HydratedDocument<AppointmentDocument> & {
  clientId: { name: string; phone: string };
  barberId: { phone?: string; userId?: { name: string } };
};

/** Confirma que el barbero tiene disponibilidad para la cita y avisa a quien corresponda. */
export async function confirmBarberAvailability(appointment: PopulatedAppointment): Promise<void> {
  const businessId = appointment.businessId.toString();
  const business = await Business.findById(businessId);
  const client = appointment.clientId;
  const barberName = appointment.barberId?.userId?.name ?? "el barbero";

  appointment.barberAvailabilityConfirmedAt = new Date();

  if (appointment.depositMethod === "trust_code") {
    appointment.depositStatus = "confirmed";
    appointment.depositConfirmedAt = new Date();
    await appointment.save();

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
}

/** Rechaza la cita por falta de disponibilidad del barbero y avisa al cliente. */
export async function rejectBarberAvailability(
  appointment: PopulatedAppointment,
  reason?: string
): Promise<void> {
  const businessId = appointment.businessId.toString();
  const business = await Business.findById(businessId);
  const client = appointment.clientId;

  appointment.status = "cancelled";
  appointment.depositStatus = "rejected";
  appointment.rejectionReason = reason ?? "El barbero no tiene disponibilidad";
  await appointment.save();

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
}
