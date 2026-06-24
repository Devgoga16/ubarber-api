import { Types } from "mongoose";
import { Appointment } from "../models/Appointment";
import { Invoice } from "../models/Invoice";
import { Subscription } from "../models/Subscription";
import { Client } from "../models/Client";
import { Service } from "../models/Service";
import { Barber } from "../models/Barber";
import { Location } from "../models/Location";
import { PaymentMethod } from "../models/PaymentMethod";
import { WhatsAppSession } from "../models/WhatsAppSession";
import { User } from "../models/User";
import { Business } from "../models/Business";

/** Borra un negocio y todo lo que depende de él (citas, clientes, equipo, facturación, etc). Irreversible. */
export async function deleteBusinessCascade(businessId: string): Promise<void> {
  const id = new Types.ObjectId(businessId);

  await Appointment.deleteMany({ businessId: id });
  await Invoice.deleteMany({ businessId: id });
  await Subscription.deleteMany({ businessId: id });
  await Client.deleteMany({ businessId: id });
  await Service.deleteMany({ businessId: id });
  await Barber.deleteMany({ businessId: id });
  await Location.deleteMany({ businessId: id });
  await PaymentMethod.deleteMany({ businessId: id });
  await WhatsAppSession.deleteMany({ businessId: id });
  await User.deleteMany({ businessId: id });
  await Business.findByIdAndDelete(id);
}
