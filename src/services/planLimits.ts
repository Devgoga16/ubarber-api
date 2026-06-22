import { Subscription } from "../models/Subscription";
import { Plan } from "../models/Plan";
import { Location } from "../models/Location";
import { Barber } from "../models/Barber";
import { AppError } from "../utils/AppError";

async function getActivePlan(businessId: string) {
  const subscription = await Subscription.findOne({ businessId });
  if (!subscription) {
    throw new AppError("Suscripción no encontrada", 404);
  }
  const plan = await Plan.findById(subscription.planId);
  if (!plan) {
    throw new AppError("Plan no encontrado", 404);
  }
  return plan;
}

export async function assertCanCreateLocation(businessId: string): Promise<void> {
  const plan = await getActivePlan(businessId);
  const count = await Location.countDocuments({ businessId, isActive: true });
  if (count >= plan.limits.maxLocations) {
    throw new AppError(
      `Tu plan permite hasta ${plan.limits.maxLocations} sede(s). Actualiza tu plan para agregar más.`,
      402
    );
  }
}

export async function assertCanCreateBarber(businessId: string): Promise<void> {
  const plan = await getActivePlan(businessId);
  const count = await Barber.countDocuments({ businessId, isActive: true });
  if (count >= plan.limits.maxBarbers) {
    throw new AppError(
      `Tu plan permite hasta ${plan.limits.maxBarbers} barbero(s). Actualiza tu plan para agregar más.`,
      402
    );
  }
}
