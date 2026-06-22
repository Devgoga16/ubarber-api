import { Schema, model, Types } from "mongoose";

export interface PlanDocument {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  priceCents: number;
  billingPeriod: "monthly" | "yearly";
  limits: {
    maxLocations: number;
    maxBarbers: number;
    maxAppointmentsPerMonth: number;
  };
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const planSchema = new Schema<PlanDocument>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    priceCents: { type: Number, required: true, min: 0 },
    billingPeriod: { type: String, enum: ["monthly", "yearly"], required: true },
    limits: {
      maxLocations: { type: Number, required: true, min: 1 },
      maxBarbers: { type: Number, required: true, min: 1 },
      maxAppointmentsPerMonth: { type: Number, required: true, min: 1 },
    },
    features: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Plan = model<PlanDocument>("Plan", planSchema);
