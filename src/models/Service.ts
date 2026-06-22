import { Schema, model, Types } from "mongoose";
import type { DepositType } from "./Business";

export interface ServiceDocument {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  locationIds: Types.ObjectId[]; // sedes donde aplica
  name: string;
  durationMinutes: number;
  priceCents: number;
  photo?: string;
  // Solo se usan si el negocio tiene depositScope = "per_service"; si no están definidos,
  // se cae en la configuración global del negocio.
  depositType?: DepositType;
  depositValueCents?: number;
  depositValuePercent?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<ServiceDocument>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    locationIds: [{ type: Schema.Types.ObjectId, ref: "Location", required: true }],
    name: { type: String, required: true, trim: true },
    durationMinutes: { type: Number, required: true, min: 5 },
    priceCents: { type: Number, required: true, min: 0 },
    photo: { type: String },
    depositType: { type: String, enum: ["percentage", "fixed"] },
    depositValueCents: { type: Number, min: 0 },
    depositValuePercent: { type: Number, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Service = model<ServiceDocument>("Service", serviceSchema);
