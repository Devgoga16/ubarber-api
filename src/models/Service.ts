import { Schema, model, Types } from "mongoose";

export interface ServiceDocument {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  locationIds: Types.ObjectId[]; // sedes donde aplica
  name: string;
  durationMinutes: number;
  priceCents: number;
  photo?: string;
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
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Service = model<ServiceDocument>("Service", serviceSchema);
