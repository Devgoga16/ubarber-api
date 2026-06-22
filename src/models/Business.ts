import { Schema, model, Types } from "mongoose";

export interface BusinessDocument {
  _id: Types.ObjectId;
  name: string;
  ownerName: string;
  ownerEmail: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const businessSchema = new Schema<BusinessDocument>(
  {
    name: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Business = model<BusinessDocument>("Business", businessSchema);
