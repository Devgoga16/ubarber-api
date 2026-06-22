import type { BusinessDocument, DepositType } from "../models/Business";
import type { ServiceDocument } from "../models/Service";

function applyDeposit(type: DepositType, valueCents: number, valuePercent: number, baseCents: number): number {
  return type === "percentage" ? Math.round(baseCents * (valuePercent / 100)) : valueCents;
}

/**
 * Calcula el adelanto requerido para un set de servicios, según la configuración del negocio:
 * - scope "global": mismo % o monto fijo para el total de la cita.
 * - scope "per_service": cada servicio puede traer su propio % o monto; si no lo define,
 *   cae en la configuración global como default.
 */
export function computeDepositCents(
  business: Pick<
    BusinessDocument,
    "depositEnabled" | "depositScope" | "depositType" | "depositValueCents" | "depositValuePercent"
  >,
  services: Pick<ServiceDocument, "priceCents" | "depositType" | "depositValueCents" | "depositValuePercent">[]
): number {
  if (!business.depositEnabled) return 0;

  if (business.depositScope === "global") {
    const totalCents = services.reduce((sum, s) => sum + s.priceCents, 0);
    return applyDeposit(
      business.depositType,
      business.depositValueCents,
      business.depositValuePercent,
      totalCents
    );
  }

  return services.reduce((sum, s) => {
    const type = s.depositType ?? business.depositType;
    const valueCents = s.depositValueCents ?? business.depositValueCents;
    const valuePercent = s.depositValuePercent ?? business.depositValuePercent;
    return sum + applyDeposit(type, valueCents, valuePercent, s.priceCents);
  }, 0);
}

export function generateTrustCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
