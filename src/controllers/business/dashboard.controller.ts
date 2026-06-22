import type { Request, Response } from "express";
import { Appointment } from "../../models/Appointment";
import { Client } from "../../models/Client";
import { Subscription } from "../../models/Subscription";

function dayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  const businessId = req.auth!.businessId;
  const today = dayBounds(new Date());
  const yesterday = dayBounds(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const [
    todayAppointmentsCount,
    yesterdayAppointmentsCount,
    activeClientsCount,
    todayRevenueAgg,
    yesterdayRevenueAgg,
    pendingCount,
    yesterdayPendingCount,
    recentAppointments,
    popularServicesAgg,
  ] = await Promise.all([
    Appointment.countDocuments({
      businessId,
      startsAt: { $gte: today.start, $lte: today.end },
      status: { $ne: "cancelled" },
    }),
    Appointment.countDocuments({
      businessId,
      startsAt: { $gte: yesterday.start, $lte: yesterday.end },
      status: { $ne: "cancelled" },
    }),
    Client.countDocuments({ businessId, isActive: true }),
    Appointment.aggregate([
      {
        $match: {
          businessId,
          startsAt: { $gte: today.start, $lte: today.end },
          paid: true,
        },
      },
      { $group: { _id: null, total: { $sum: "$totalPriceCents" } } },
    ]),
    Appointment.aggregate([
      {
        $match: {
          businessId,
          startsAt: { $gte: yesterday.start, $lte: yesterday.end },
          paid: true,
        },
      },
      { $group: { _id: null, total: { $sum: "$totalPriceCents" } } },
    ]),
    Appointment.countDocuments({
      businessId,
      startsAt: { $gte: today.start, $lte: today.end },
      status: "pending",
    }),
    Appointment.countDocuments({
      businessId,
      startsAt: { $gte: yesterday.start, $lte: yesterday.end },
      status: "pending",
    }),
    Appointment.find({ businessId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("clientId", "name")
      .populate("serviceIds", "name priceCents"),
    Appointment.aggregate([
      {
        $match: {
          businessId,
          status: { $ne: "cancelled" },
          startsAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      },
      { $unwind: "$serviceIds" },
      { $group: { _id: "$serviceIds", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 4 },
      {
        $lookup: { from: "services", localField: "_id", foreignField: "_id", as: "service" },
      },
      { $unwind: "$service" },
    ]),
  ]);

  const todayRevenueCents = todayRevenueAgg[0]?.total ?? 0;
  const yesterdayRevenueCents = yesterdayRevenueAgg[0]?.total ?? 0;
  const totalServiceUsages = popularServicesAgg.reduce((sum, s) => sum + s.count, 0);

  res.json({
    todayAppointmentsCount,
    todayAppointmentsDelta: todayAppointmentsCount - yesterdayAppointmentsCount,
    activeClientsCount,
    todayRevenueCents,
    todayRevenueDeltaCents: todayRevenueCents - yesterdayRevenueCents,
    pendingCount,
    pendingDelta: pendingCount - yesterdayPendingCount,
    recentAppointments,
    popularServices: popularServicesAgg.map((s) => ({
      serviceId: s._id,
      name: s.service.name,
      priceCents: s.service.priceCents,
      count: s.count,
      percentage: totalServiceUsages > 0 ? Math.round((s.count / totalServiceUsages) * 100) : 0,
    })),
  });
}

export async function getMySubscription(req: Request, res: Response): Promise<void> {
  const subscription = await Subscription.findOne({ businessId: req.auth!.businessId }).populate(
    "planId"
  );
  res.json(subscription);
}
