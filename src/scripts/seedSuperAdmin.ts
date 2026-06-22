import bcrypt from "bcryptjs";
import { connectDB } from "../config/db";
import { User } from "../models/User";
import mongoose from "mongoose";

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] ?? "Super Admin";

  if (!email || !password) {
    console.error("Uso: npm run seed:admin -- <email> <password> [nombre]");
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email: email.toLowerCase(), businessId: null });
  if (existing) {
    console.log(`Ya existe un super_admin con email ${email}`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({
    businessId: null,
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: "super_admin",
    locationIds: [],
    isActive: true,
  });

  console.log(`Super admin creado: ${email}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
