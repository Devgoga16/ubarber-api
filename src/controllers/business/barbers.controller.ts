import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { z } from "zod";
import { User } from "../../models/User";
import { Barber } from "../../models/Barber";
import { Service } from "../../models/Service";
import { Review } from "../../models/Review";
import { assertCanCreateBarber } from "../../services/planLimits";
import { AppError } from "../../utils/AppError";

const shiftSchema = z.object({
  locationId: z.string(),
  day: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
});

const createBarberSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  locationIds: z.array(z.string()).min(1),
  specialties: z.array(z.string()).default([]),
  commissionPercentage: z.number().min(0).max(100).optional(),
  shifts: z.array(shiftSchema).default([]),
});

const updateBarberSchema = z.object({
  phone: z.string().optional(),
  photo: z.string().optional(),
  locationIds: z.array(z.string()).min(1).optional(),
  specialties: z.array(z.string()).optional(),
  commissionPercentage: z.number().min(0).max(100).optional(),
  shifts: z.array(shiftSchema).optional(),
});

async function withRatings<T extends { _id: Types.ObjectId }>(barbers: T[]) {
  const barberIds = barbers.map((b) => b._id);
  const ratings = await Review.aggregate([
    { $match: { barberId: { $in: barberIds } } },
    { $group: { _id: "$barberId", average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const ratingMap = new Map(ratings.map((r) => [r._id.toString(), { average: r.average, count: r.count }]));
  return barbers.map((b) => ({
    ...b,
    ratingAverage: ratingMap.get(b._id.toString())?.average ?? null,
    ratingCount: ratingMap.get(b._id.toString())?.count ?? 0,
  }));
}

export async function listBarbers(req: Request, res: Response): Promise<void> {
  const barbers = await Barber.find({ businessId: req.auth!.businessId })
    .populate("userId", "name email isActive")
    .sort({ createdAt: 1 });
  const withRatingsList = await withRatings(barbers.map((b) => b.toObject()));
  res.json(withRatingsList);
}

export async function createBarber(req: Request, res: Response): Promise<void> {
  const businessId = req.auth!.businessId!;
  await assertCanCreateBarber(businessId);
  const data = createBarberSchema.parse(req.body);

  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) {
    throw new AppError("Ya existe un usuario con ese email", 409);
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await User.create({
    businessId,
    name: data.name,
    email: data.email,
    passwordHash,
    role: "barber",
    locationIds: data.locationIds,
  });

  const barber = await Barber.create({
    businessId,
    userId: user._id,
    locationIds: data.locationIds,
    phone: data.phone,
    specialties: data.specialties,
    commissionPercentage: data.commissionPercentage,
    shifts: data.shifts,
  });

  res.status(201).json(barber);
}

export async function updateBarber(req: Request, res: Response): Promise<void> {
  const data = updateBarberSchema.parse(req.body);
  const barber = await Barber.findOneAndUpdate(
    { _id: req.params.id, businessId: req.auth!.businessId },
    data,
    { new: true }
  );
  if (!barber) {
    throw new AppError("Barbero no encontrado", 404);
  }
  if (data.locationIds) {
    await User.findByIdAndUpdate(barber.userId, { locationIds: data.locationIds });
  }
  res.json(barber);
}

export async function getMyBarberProfile(req: Request, res: Response): Promise<void> {
  const barber = await Barber.findOne({
    businessId: req.auth!.businessId,
    userId: req.auth!.userId,
  }).populate("userId", "name email isActive");
  if (!barber) {
    throw new AppError("No tienes un perfil de barbero asociado", 404);
  }
  const [withRatingsList] = await withRatings([barber.toObject()]);
  res.json(withRatingsList);
}

const updateMyShiftsSchema = z.object({ shifts: z.array(shiftSchema) });

export async function updateMyShifts(req: Request, res: Response): Promise<void> {
  const { shifts } = updateMyShiftsSchema.parse(req.body);

  const barber = await Barber.findOne({
    businessId: req.auth!.businessId,
    userId: req.auth!.userId,
  });
  if (!barber) {
    throw new AppError("No tienes un perfil de barbero asociado", 404);
  }

  const allowedLocationIds = new Set(barber.locationIds.map((id) => id.toString()));
  const hasInvalidLocation = shifts.some((shift) => !allowedLocationIds.has(shift.locationId));
  if (hasInvalidLocation) {
    throw new AppError("Solo puedes definir turnos en sedes donde trabajas", 400);
  }

  barber.shifts = shifts as unknown as typeof barber.shifts;
  await barber.save();
  res.json(barber);
}

const favoritesSchema = z.object({ serviceIds: z.array(z.string()).max(5) });

async function applyFavoriteServices(
  filter: Record<string, unknown>,
  serviceIds: string[],
  businessId: string
) {
  const services = await Service.find({ _id: { $in: serviceIds }, businessId });
  if (services.length !== serviceIds.length) {
    throw new AppError("Uno o más servicios no son válidos", 400);
  }
  const barber = await Barber.findOneAndUpdate(
    filter,
    { favoriteServiceIds: serviceIds },
    { new: true }
  );
  if (!barber) {
    throw new AppError("Barbero no encontrado", 404);
  }
  return barber;
}

export async function setMyFavoriteServices(req: Request, res: Response): Promise<void> {
  const { serviceIds } = favoritesSchema.parse(req.body);
  const barber = await applyFavoriteServices(
    { businessId: req.auth!.businessId, userId: req.auth!.userId },
    serviceIds,
    req.auth!.businessId!
  );
  res.json(barber);
}

export async function setBarberFavoriteServices(req: Request, res: Response): Promise<void> {
  const { serviceIds } = favoritesSchema.parse(req.body);
  const barber = await applyFavoriteServices(
    { _id: req.params.id, businessId: req.auth!.businessId },
    serviceIds,
    req.auth!.businessId!
  );
  res.json(barber);
}

const setStatusSchema = z.object({ isActive: z.boolean() });

export async function setBarberStatus(req: Request, res: Response): Promise<void> {
  const { isActive } = setStatusSchema.parse(req.body);
  const businessId = req.auth!.businessId!;

  if (isActive) {
    await assertCanCreateBarber(businessId);
  }

  const barber = await Barber.findOneAndUpdate(
    { _id: req.params.id, businessId },
    { isActive },
    { new: true }
  );
  if (!barber) {
    throw new AppError("Barbero no encontrado", 404);
  }
  await User.findByIdAndUpdate(barber.userId, { isActive });
  res.json(barber);
}
