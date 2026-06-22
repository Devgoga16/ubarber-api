import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import { requireBusinessContext } from "../middlewares/tenant";
import { subscriptionGate } from "../middlewares/subscriptionGate";
import { asyncHandler } from "../utils/asyncHandler";

import {
  listLocations,
  createLocation,
  updateLocation,
  setLocationStatus,
} from "../controllers/business/locations.controller";
import {
  listBarbers,
  createBarber,
  updateBarber,
  setBarberStatus,
  getMyBarberProfile,
  updateMyShifts,
  setMyFavoriteServices,
  setBarberFavoriteServices,
} from "../controllers/business/barbers.controller";
import {
  listClients,
  createClient,
  updateClient,
  setClientStatus,
} from "../controllers/business/clients.controller";
import {
  listServices,
  createService,
  updateService,
  setServiceStatus,
} from "../controllers/business/services.controller";
import {
  listAppointments,
  createAppointment,
  updateAppointmentStatus,
  registerAppointmentPayment,
} from "../controllers/business/appointments.controller";
import {
  listPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  setPaymentMethodStatus,
} from "../controllers/business/paymentMethods.controller";
import { getDashboardStats, getMySubscription } from "../controllers/business/dashboard.controller";
import { getPublicLinkInfo } from "../controllers/business/publicLink.controller";
import {
  getWhatsAppStatus,
  connectWhatsApp,
  disconnectWhatsApp,
} from "../controllers/business/whatsapp.controller";

export const businessRouter = Router();

businessRouter.use(requireAuth, requireBusinessContext, subscriptionGate);

const manage = requireRole("owner", "manager");

businessRouter.get("/locations", asyncHandler(listLocations));
businessRouter.post("/locations", manage, asyncHandler(createLocation));
businessRouter.patch("/locations/:id", manage, asyncHandler(updateLocation));
businessRouter.patch("/locations/:id/status", manage, asyncHandler(setLocationStatus));

businessRouter.get("/barbers/me", requireRole("barber"), asyncHandler(getMyBarberProfile));
businessRouter.patch("/barbers/me/shifts", requireRole("barber"), asyncHandler(updateMyShifts));
businessRouter.patch(
  "/barbers/me/favorites",
  requireRole("barber"),
  asyncHandler(setMyFavoriteServices)
);

businessRouter.get("/barbers", manage, asyncHandler(listBarbers));
businessRouter.post("/barbers", manage, asyncHandler(createBarber));
businessRouter.patch("/barbers/:id", manage, asyncHandler(updateBarber));
businessRouter.patch("/barbers/:id/status", manage, asyncHandler(setBarberStatus));
businessRouter.patch("/barbers/:id/favorites", manage, asyncHandler(setBarberFavoriteServices));

businessRouter.get("/clients", asyncHandler(listClients));
businessRouter.post("/clients", manage, asyncHandler(createClient));
businessRouter.patch("/clients/:id", manage, asyncHandler(updateClient));
businessRouter.patch("/clients/:id/status", manage, asyncHandler(setClientStatus));

businessRouter.get("/services", asyncHandler(listServices));
businessRouter.post("/services", manage, asyncHandler(createService));
businessRouter.patch("/services/:id", manage, asyncHandler(updateService));
businessRouter.patch("/services/:id/status", manage, asyncHandler(setServiceStatus));

businessRouter.get("/public-link", manage, asyncHandler(getPublicLinkInfo));

businessRouter.get("/dashboard/stats", manage, asyncHandler(getDashboardStats));
businessRouter.get("/subscription", asyncHandler(getMySubscription));

businessRouter.get("/appointments", asyncHandler(listAppointments));
businessRouter.post("/appointments", asyncHandler(createAppointment));
businessRouter.patch("/appointments/:id/status", asyncHandler(updateAppointmentStatus));
businessRouter.patch("/appointments/:id/payment", asyncHandler(registerAppointmentPayment));

businessRouter.get("/whatsapp/status", manage, asyncHandler(getWhatsAppStatus));
businessRouter.post("/whatsapp/connect", manage, asyncHandler(connectWhatsApp));
businessRouter.post("/whatsapp/disconnect", manage, asyncHandler(disconnectWhatsApp));

businessRouter.get("/payment-methods", asyncHandler(listPaymentMethods));
businessRouter.post("/payment-methods", manage, asyncHandler(createPaymentMethod));
businessRouter.patch("/payment-methods/:id", manage, asyncHandler(updatePaymentMethod));
businessRouter.patch("/payment-methods/:id/status", manage, asyncHandler(setPaymentMethodStatus));
