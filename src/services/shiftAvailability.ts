import type { BarberDocument } from "../models/Barber";
import { AppError } from "../utils/AppError";

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Verifica que el rango [startsAt, endsAt) caiga completamente dentro de algún
 * turno definido por el barbero para esa sede y ese día de la semana.
 */
export function assertWithinBarberShift(
  barber: BarberDocument,
  locationId: string,
  startsAt: Date,
  endsAt: Date
): void {
  const day = startsAt.getDay();
  const startMinutes = startsAt.getHours() * 60 + startsAt.getMinutes();
  const endMinutes = startMinutes + (endsAt.getTime() - startsAt.getTime()) / 60_000;

  const fitsInShift = barber.shifts.some((shift) => {
    if (shift.locationId.toString() !== locationId || shift.day !== day) return false;
    return toMinutes(shift.startTime) <= startMinutes && toMinutes(shift.endTime) >= endMinutes;
  });

  if (!fitsInShift) {
    throw new AppError(
      "Ese horario está fuera del turno del barbero en esa sede. Ajusta la hora o el horario en 'Mi horario'.",
      409
    );
  }
}
