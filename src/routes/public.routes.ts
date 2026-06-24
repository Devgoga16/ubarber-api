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

export const publicRouter = Router();

publicRouter.get("/confirmations/:token", asyncHandler(getConfirmation));
publicRouter.post("/confirmations/:token/accept", asyncHandler(acceptConfirmation));
publicRouter.post("/confirmations/:token/reject", asyncHandler(rejectConfirmation));

publicRouter.get("/:slug", asyncHandler(getPublicBusinessInfo));
publicRouter.get("/:slug/availability", asyncHandler(getPublicAvailability));
publicRouter.post("/:slug/appointments", asyncHandler(createPublicAppointment));
