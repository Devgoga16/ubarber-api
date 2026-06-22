import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { Role } from "../types/roles";

export interface AuthTokenPayload {
  userId: string;
  businessId: string | null;
  role: Role;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}
