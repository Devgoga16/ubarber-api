import { Schema, model, Types } from "mongoose";
import { APPOINTMENT_STATUSES, type AppointmentStatus } from "../types/roles";

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
  receiptPhoto?: string;
  reminderSent: boolean;
  notes?: string;
  source: "staff" | "public";
  createdBy?: Types.ObjectId;
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
    receiptPhoto: { type: String },
    reminderSent: { type: Boolean, default: false },
    notes: { type: String, trim: true },
    source: { type: String, enum: ["staff", "public"], default: "staff" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Acelera la validación de choques de horario por barbero.
appointmentSchema.index({ barberId: 1, startsAt: 1, endsAt: 1 });

export const Appointment = model<AppointmentDocument>("Appointment", appointmentSchema);
