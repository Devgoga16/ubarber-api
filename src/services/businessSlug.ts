import type { BusinessDocument } from "../models/Business";
import { Business } from "../models/Business";
import { slugify } from "../utils/slugify";

export async function ensureBusinessSlug(
  business: BusinessDocument & { save: () => Promise<unknown> }
): Promise<string> {
  if (business.slug) return business.slug;

  const base = slugify(business.name) || "negocio";
  let candidate = base;
  let attempt = 1;
  while (await Business.exists({ slug: candidate, _id: { $ne: business._id } })) {
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }

  business.slug = candidate;
  await business.save();
  return candidate;
}
