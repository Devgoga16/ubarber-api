import { Schema, model, Types } from "mongoose";
import { INVOICE_STATUSES, type InvoiceStatus } from "../types/roles";

export interface InvoiceDocument {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  subscriptionId: Types.ObjectId;
  planId: Types.ObjectId;
  amountCents: number;
  issuedAt: Date;
  dueDate: Date;
  status: InvoiceStatus;
  paidAt?: Date;
  registeredBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<InvoiceDocument>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription", required: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    amountCents: { type: Number, required: true, min: 0 },
    issuedAt: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: INVOICE_STATUSES, required: true, default: "pending" },
    paidAt: { type: Date },
    registeredBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

invoiceSchema.index({ businessId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 });

export const Invoice = model<InvoiceDocument>("Invoice", invoiceSchema);
