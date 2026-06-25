import { Schema, model, Types } from "mongoose";

export interface ReviewDocument {
  _id: Types.ObjectId;
  businessId: Types.ObjectId;
  barberId: Types.ObjectId;
  appointmentId: Types.ObjectId;
  clientName: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDocument>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    barberId: { type: Schema.Types.ObjectId, ref: "Barber", required: true, index: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true, unique: true },
    clientName: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

export const Review = model<ReviewDocument>("Review", reviewSchema);
