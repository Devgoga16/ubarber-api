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

const SLOT_STEP_MINUTES = 15;

/**
 * Genera los horarios "HH:mm" en los que el barbero está disponible ese día para una
 * sede dada, descontando citas ya agendadas y horas pasadas (si la fecha es hoy).
 */
export function getAvailableSlots(
  barber: BarberDocument,
  locationId: string,
  date: Date,
  durationMinutes: number,
  busyRanges: { startsAt: Date; endsAt: Date }[]
): string[] {
  const day = date.getDay();
  const dayShifts = barber.shifts.filter(
    (shift) => shift.locationId.toString() === locationId && shift.day === day
  );
  if (dayShifts.length === 0) return [];

  const now = new Date();
  const isToday =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots: string[] = [];

  for (const shift of dayShifts) {
    const shiftStart = toMinutes(shift.startTime);
    const shiftEnd = toMinutes(shift.endTime);

    for (
      let slotStart = shiftStart;
      slotStart + durationMinutes <= shiftEnd;
      slotStart += SLOT_STEP_MINUTES
    ) {
      if (isToday && slotStart <= nowMinutes) continue;

      const slotStartAt = new Date(date);
      slotStartAt.setHours(0, slotStart, 0, 0);
      const slotEndAt = new Date(slotStartAt.getTime() + durationMinutes * 60_000);

      const overlaps = busyRanges.some(
        (range) => slotStartAt < range.endsAt && slotEndAt > range.startsAt
      );
      if (overlaps) continue;

      const hh = String(Math.floor(slotStart / 60)).padStart(2, "0");
      const mm = String(slotStart % 60).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }

  return slots;
}
