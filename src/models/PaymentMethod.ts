import { Schema, model, Types } from "mongoose";

export interface PaymentMethodDocument {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const paymentMethodSchema = new Schema<PaymentMethodDocument>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PaymentMethod = model<PaymentMethodDocument>("PaymentMethod", paymentMethodSchema);
