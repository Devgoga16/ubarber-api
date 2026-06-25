import type { Request, Response } from "express";
import { z } from "zod";
import { Appointment } from "../../models/Appointment";
import { Review } from "../../models/Review";
import { Business } from "../../models/Business";
import { AppError } from "../../utils/AppError";

export async function getReviewInfo(req: Request, res: Response): Promise<void> {
  const appointment = await Appointment.findOne({ reviewToken: req.params.token })
    .populate("clientId", "name")
    .populate("serviceIds", "name")
    .populate({ path: "barberId", populate: { path: "userId", select: "name" } });
  if (!appointment) {
    throw new AppError("Este enlace ya no es válido", 404);
  }

  const business = await Business.findById(appointment.businessId).select("name");
  const barber = appointment.barberId as unknown as { userId?: { name: string } };
  const services = appointment.serviceIds as unknown as { name: string }[];

  res.json({
    businessName: business?.name ?? "el negocio",
    barberName: barber?.userId?.name ?? "tu barbero",
    serviceNames: services.map((s) => s.name),
    startsAt: appointment.startsAt,
    alreadySubmitted: Boolean(appointment.reviewSubmittedAt),
  });
}

const submitReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export async function submitReview(req: Request, res: Response): Promise<void> {
  const data = submitReviewSchema.parse(req.body);

  // Update atómico condicionado a que no se haya usado antes: evita que el mismo enlace
  // se reutilice por una doble petición o que alguien lo guarde para calificar varias veces.
  const appointment = await Appointment.findOneAndUpdate(
    { reviewToken: req.params.token, reviewSubmittedAt: { $exists: false } },
    { reviewSubmittedAt: new Date() },
    { new: true }
  ).populate("clientId", "name");
  if (!appointment) {
    throw new AppError("Este enlace ya fue usado o no es válido", 409);
  }

  const client = appointment.clientId as unknown as { name: string };

  await Review.create({
    businessId: appointment.businessId,
    barberId: appointment.barberId,
    appointmentId: appointment._id,
    clientName: client?.name ?? "Cliente",
    rating: data.rating,
    comment: data.comment,
  });

  res.status(201).json({ ok: true });
}
