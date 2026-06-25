import { Schema, model, Types } from "mongoose";

export interface BarberShift {
  locationId: Types.ObjectId;
  day: number; // 0-6
  startTime: string; // "10:00"
  endTime: string; // "18:00"
}

export interface BarberDocument {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  userId: Types.ObjectId; // referencia al User con role "barber"
  locationIds: Types.ObjectId[];
  phone?: string;
  photo?: string;
  specialties: string[];
  commissionPercentage?: number;
  shifts: BarberShift[];
  favoriteServiceIds: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const barberShiftSchema = new Schema<BarberShift>(
  {
    locationId: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    day: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const barberSchema = new Schema<BarberDocument>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    locationIds: [{ type: Schema.Types.ObjectId, ref: "Location", required: true }],
    phone: { type: String, trim: true },
    photo: { type: String },
    specialties: { type: [String], default: [] },
    commissionPercentage: { type: Number, min: 0, max: 100 },
    shifts: { type: [barberShiftSchema], default: [] },
    favoriteServiceIds: [{ type: Schema.Types.ObjectId, ref: "Service", default: [] }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Barber = model<BarberDocument>("Barber", barberSchema);
