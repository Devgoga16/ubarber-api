import { Schema, model, Types } from "mongoose";

export type DepositType = "percentage" | "fixed";
export type DepositScope = "global" | "per_service";

export interface BusinessDocument {
  _id: Types.ObjectId;
  name: string;
  ownerName: string;
  ownerEmail: string;
  phone?: string;
  slug?: string;
  depositEnabled: boolean;
  depositScope: DepositScope;
  depositType: DepositType;
  depositValueCents: number;
  depositValuePercent: number;
  trustCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const businessSchema = new Schema<BusinessDocument>(
  {
    name: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    slug: { type: String, unique: true, sparse: true },
    depositEnabled: { type: Boolean, default: false },
    depositScope: { type: String, enum: ["global", "per_service"], default: "global" },
    depositType: { type: String, enum: ["percentage", "fixed"], default: "percentage" },
    depositValueCents: { type: Number, default: 0, min: 0 },
    depositValuePercent: { type: Number, default: 0, min: 0, max: 100 },
    trustCode: { type: String },
  },
  { timestamps: true }
);

export const Business = model<BusinessDocument>("Business", businessSchema);
