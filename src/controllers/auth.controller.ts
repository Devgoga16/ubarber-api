import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User";
import { signAuthToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
  if (!user) {
    throw new AppError("Credenciales inválidas", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError("Credenciales inválidas", 401);
  }

  const token = signAuthToken({
    userId: user._id.toString(),
    businessId: user.businessId ? user.businessId.toString() : null,
    role: user.role,
  });

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      locationIds: user.locationIds,
    },
  });
}
