import { Schema, model, Types } from "mongoose";

export interface WeeklyHours {
  day: number; // 0 = domingo ... 6 = sábado
  openTime: string; // "09:00"
  closeTime: string; // "19:00"
  closed: boolean;
}

export interface LocationDocument {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  address?: string;
  phone?: string;
  hours: WeeklyHours[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const weeklyHoursSchema = new Schema<WeeklyHours>(
  {
    day: { type: Number, min: 0, max: 6, required: true },
    openTime: { type: String, required: true },
    closeTime: { type: String, required: true },
    closed: { type: Boolean, default: false },
  },
  { _id: false }
);

const locationSchema = new Schema<LocationDocument>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    hours: { type: [weeklyHoursSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Location = model<LocationDocument>("Location", locationSchema);
