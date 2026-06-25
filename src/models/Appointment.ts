import { Schema, model, Types } from "mongoose";
import { APPOINTMENT_STATUSES, type AppointmentStatus } from "../types/roles";

export const DEPOSIT_STATUSES = [
  "not_required",
  "awaiting_barber",
  "awaiting_owner_review",
  "confirmed",
  "rejected",
] as const;
export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];

export interface AppointmentDocument {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  locationId: Types.ObjectId;
  barberId: Types.ObjectId;
  clientId: Types.ObjectId;
  serviceIds: Types.ObjectId[];
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  totalPriceCents: number;
  paid: boolean;
  paidAt?: Date;
  paymentMethodId?: Types.ObjectId;
  finalPaymentAmountCents?: number;
  receiptPhoto?: string;
  reminderSent: boolean;
  notes?: string;
  source: "staff" | "public";
  createdBy?: Types.ObjectId;
  depositStatus: DepositStatus;
  depositAmountCents?: number;
  depositMethod?: "proof_photo" | "trust_code";
  depositProofPhoto?: string;
  depositPaymentMethodId?: Types.ObjectId;
  barberAvailabilityConfirmedAt?: Date;
  depositConfirmedAt?: Date;
  rejectionReason?: string;
  confirmationToken?: string;
  reviewToken?: string;
  reviewSubmittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<AppointmentDocument>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true, index: true },
    barberId: { type: Schema.Types.ObjectId, ref: "Barber", required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    serviceIds: [{ type: Schema.Types.ObjectId, ref: "Service", required: true }],
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    status: { type: String, enum: APPOINTMENT_STATUSES, required: true, default: "pending" },
    totalPriceCents: { type: Number, required: true, min: 0 },
    paid: { type: Boolean, default: false },
    paidAt: { type: Date },
    paymentMethodId: { type: Schema.Types.ObjectId, ref: "PaymentMethod" },
    finalPaymentAmountCents: { type: Number, min: 0 },
    receiptPhoto: { type: String },
    reminderSent: { type: Boolean, default: false },
    notes: { type: String, trim: true },
    source: { type: String, enum: ["staff", "public"], default: "staff" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    depositStatus: { type: String, enum: DEPOSIT_STATUSES, default: "not_required" },
    depositAmountCents: { type: Number, min: 0 },
    depositMethod: { type: String, enum: ["proof_photo", "trust_code"] },
    depositProofPhoto: { type: String },
    depositPaymentMethodId: { type: Schema.Types.ObjectId, ref: "PaymentMethod" },
    barberAvailabilityConfirmedAt: { type: Date },
    depositConfirmedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    confirmationToken: { type: String, index: true, sparse: true },
    reviewToken: { type: String, index: true, sparse: true },
    reviewSubmittedAt: { type: Date },
  },
  { timestamps: true }
);

// Acelera la validación de choques de horario por barbero.
appointmentSchema.index({ barberId: 1, startsAt: 1, endsAt: 1 });

export const Appointment = model<AppointmentDocument>("Appointment", appointmentSchema);
