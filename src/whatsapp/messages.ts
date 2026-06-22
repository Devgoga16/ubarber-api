export function formatPenCents(cents: number): string {
  return (cents / 100).toLocaleString("es-PE", { style: "currency", currency: "PEN" });
}

export function buildReminderMessage(params: {
  clientName: string;
  businessName: string;
  serviceNames: string[];
  barberName: string;
  startsAt: Date;
}): string {
  const time = params.startsAt.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  return (
    `Hola ${params.clientName} 👋, te recordamos tu cita en *${params.businessName}* hoy a las *${time}*.\n` +
    `Servicio: ${params.serviceNames.join(", ")}\n` +
    `Barbero: ${params.barberName}\n\n` +
    `Te esperamos. Si no puedes asistir, avísanos con anticipación 🙏`
  );
}

function formatDateTime(date: Date): string {
  return `${date.toLocaleDateString("es-PE")} a las ${date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function buildClientAwaitingConfirmationMessage(params: {
  clientName: string;
  businessName: string;
  startsAt: Date;
}): string {
  return (
    `Hola ${params.clientName} 👋, tu solicitud de cita en *${params.businessName}* para el ${formatDateTime(
      params.startsAt
    )} fue recibida y está pendiente de confirmación del barbero.\n\n` +
    `Te avisamos en cuanto la confirme. ¡Gracias por tu paciencia!`
  );
}

export function buildOwnerNewBookingMessage(params: {
  businessName: string;
  clientName: string;
  barberName: string;
  startsAt: Date;
}): string {
  return (
    `📅 Nueva cita reservada en *${params.businessName}*.\n` +
    `Cliente: ${params.clientName}\n` +
    `Barbero: ${params.barberName}\n` +
    `Fecha: ${formatDateTime(params.startsAt)}\n\n` +
    `Está pendiente de que el barbero confirme disponibilidad.`
  );
}

export function buildBarberConfirmationRequestMessage(params: {
  barberName: string;
  clientName: string;
  serviceNames: string[];
  startsAt: Date;
  code: string;
}): string {
  return (
    `Hola ${params.barberName} 👋, tienes una nueva solicitud de cita:\n` +
    `Cliente: ${params.clientName}\n` +
    `Servicio: ${params.serviceNames.join(", ")}\n` +
    `Fecha: ${formatDateTime(params.startsAt)}\n\n` +
    `¿Tienes disponibilidad? Responde:\n` +
    `*SI ${params.code}* para confirmar\n` +
    `*NO ${params.code}* para rechazar\n\n` +
    `(También puedes confirmarlo desde la app, en "Mi agenda")`
  );
}

export function buildOwnerNeedsPaymentReviewMessage(params: {
  businessName: string;
  clientName: string;
  barberName: string;
  depositAmountCents: number;
}): string {
  return (
    `✅ ${params.barberName} confirmó disponibilidad para la cita de ${params.clientName} en *${params.businessName}*.\n\n` +
    `El cliente ya envió el comprobante de adelanto (${formatPenCents(params.depositAmountCents)}). ` +
    `Revísalo en la app para confirmar la cita.`
  );
}

export function buildAppointmentConfirmedMessage(params: {
  recipientName: string;
  businessName: string;
  startsAt: Date;
}): string {
  return (
    `🎉 Hola ${params.recipientName}, tu cita en *${params.businessName}* para el ${formatDateTime(
      params.startsAt
    )} quedó *confirmada*. ¡Te esperamos!`
  );
}

export function buildAppointmentRejectedMessage(params: {
  recipientName: string;
  businessName: string;
  reason?: string;
}): string {
  return (
    `Hola ${params.recipientName}, lamentablemente tu cita en *${params.businessName}* no pudo confirmarse` +
    `${params.reason ? ` (${params.reason})` : ""}. Por favor agenda en otro horario. Disculpa las molestias.`
  );
}

export function buildPaymentSummaryMessage(params: {
  clientName: string;
  businessName: string;
  serviceNames: string[];
  totalPriceCents: number;
  paymentMethodName: string;
}): string {
  return (
    `Hola ${params.clientName} 👋, gracias por tu visita a *${params.businessName}*.\n\n` +
    `*Resumen de tu atención:*\n` +
    `Servicio: ${params.serviceNames.join(", ")}\n` +
    `Total pagado: ${formatPenCents(params.totalPriceCents)}\n` +
    `Método de pago: ${params.paymentMethodName}\n\n` +
    `¡Te esperamos en tu próxima visita! ✂️`
  );
}
