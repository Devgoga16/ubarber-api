import { Schema, model, Types } from "mongoose";

export type WhatsAppConnectionStatus = "disconnected" | "connecting" | "connected";

export interface WhatsAppSessionDocument {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  status: WhatsAppConnectionStatus;
  phoneNumber?: string;
  // Snapshot completo de creds + claves de Baileys, serializado con BufferJSON.
  authData?: string;
  updatedAt: Date;
  createdAt: Date;
}

const whatsAppSessionSchema = new Schema<WhatsAppSessionDocument>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["disconnected", "connecting", "connected"],
      default: "disconnected",
    },
    phoneNumber: { type: String },
    authData: { type: String },
  },
  { timestamps: true }
);

export const WhatsAppSession = model<WhatsAppSessionDocument>(
  "WhatsAppSession",
  whatsAppSessionSchema
);
