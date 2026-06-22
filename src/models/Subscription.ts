import { Schema, model, Types } from "mongoose";
import { SUBSCRIPTION_STATUSES, type SubscriptionStatus } from "../types/roles";

export interface PaymentRecord {
  amountCents: number;
  paidAt: Date;
  note?: string;
  registeredBy: Types.ObjectId;
}

export interface SubscriptionDocument {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  planId: Types.ObjectId;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  payments: PaymentRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const paymentRecordSchema = new Schema<PaymentRecord>(
  {
    amountCents: { type: Number, required: true, min: 0 },
    paidAt: { type: Date, required: true },
    note: { type: String, trim: true },
    registeredBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false }
);

const subscriptionSchema = new Schema<SubscriptionDocument>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, unique: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    status: { type: String, enum: SUBSCRIPTION_STATUSES, required: true, default: "trial" },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    payments: { type: [paymentRecordSchema], default: [] },
  },
  { timestamps: true }
);

export const Subscription = model<SubscriptionDocument>("Subscription", subscriptionSchema);
