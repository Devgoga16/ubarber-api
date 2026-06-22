import { Schema, model, Types } from "mongoose";
import { ROLES, type Role } from "../types/roles";

export interface UserDocument {
  _id: Types.ObjectId;
  businessId: Types.ObjectId | null; // null para super_admin
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  locationIds: Types.ObjectId[]; // sedes a las que tiene acceso (manager/barbero)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", default: null, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    locationIds: [{ type: Schema.Types.ObjectId, ref: "Location" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.index({ businessId: 1, email: 1 }, { unique: true });

export const User = model<UserDocument>("User", userSchema);
