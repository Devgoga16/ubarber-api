import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  getPublicBusinessInfo,
  getPublicAvailability,
  createPublicAppointment,
} from "../controllers/public/booking.controller";
import {
  getConfirmation,
  acceptConfirmation,
  rejectConfirmation,
} from "../controllers/public/confirmations.controller";
import { listPublicPlans } from "../controllers/public/plans.controller";

export const publicRouter = Router();

publicRouter.get("/confirmations/:token", asyncHandler(getConfirmation));
publicRouter.post("/confirmations/:token/accept", asyncHandler(acceptConfirmation));
publicRouter.post("/confirmations/:token/reject", asyncHandler(rejectConfirmation));

publicRouter.get("/plans", asyncHandler(listPublicPlans));

publicRouter.get("/:slug", asyncHandler(getPublicBusinessInfo));
publicRouter.get("/:slug/availability", asyncHandler(getPublicAvailability));
publicRouter.post("/:slug/appointments", asyncHandler(createPublicAppointment));
