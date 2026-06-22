import { Schema, model, Types } from "mongoose";

export interface ClientDocument {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  // Preparado para habilitar login self-service en v2 sin migrar el esquema.
  passwordHash?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<ClientDocument>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    notes: { type: String, trim: true },
    passwordHash: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

clientSchema.index({ businessId: 1, phone: 1 }, { unique: true });

export const Client = model<ClientDocument>("Client", clientSchema);
