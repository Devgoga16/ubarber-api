import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  getPublicBusinessInfo,
  getPublicAvailability,
  createPublicAppointment,
} from "../controllers/public/booking.controller";

export const publicRouter = Router();

publicRouter.get("/:slug", asyncHandler(getPublicBusinessInfo));
publicRouter.get("/:slug/availability", asyncHandler(getPublicAvailability));
publicRouter.post("/:slug/appointments", asyncHandler(createPublicAppointment));
