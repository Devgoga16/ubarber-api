import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { listPlans, createPlan, updatePlan, setPlanActive } from "../controllers/admin/plans.controller";
import { createBusiness, listBusinesses, getBusiness } from "../controllers/admin/businesses.controller";
import { changePlan, setStatus, registerPayment } from "../controllers/admin/subscriptions.controller";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("super_admin"));

adminRouter.get("/plans", asyncHandler(listPlans));
adminRouter.post("/plans", asyncHandler(createPlan));
adminRouter.patch("/plans/:id", asyncHandler(updatePlan));
adminRouter.patch("/plans/:id/active", asyncHandler(setPlanActive));

adminRouter.get("/businesses", asyncHandler(listBusinesses));
adminRouter.post("/businesses", asyncHandler(createBusiness));
adminRouter.get("/businesses/:id", asyncHandler(getBusiness));

adminRouter.patch("/businesses/:businessId/subscription/plan", asyncHandler(changePlan));
adminRouter.patch("/businesses/:businessId/subscription/status", asyncHandler(setStatus));
adminRouter.post("/businesses/:businessId/subscription/payments", asyncHandler(registerPayment));
