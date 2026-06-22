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
