import type { RoomConfiguration } from "@/types/holidayPackage";

type ChargeableRoom = Pick<RoomConfiguration, "adults" | "children" | "infants">;

export function getChargeablePassengerCount(rooms: ChargeableRoom[] | null | undefined): number {
  if (!Array.isArray(rooms) || rooms.length === 0) return 1;

  const count = rooms.reduce((sum, room) => {
    const adults = Math.max(0, Number(room?.adults || 0));
    const children = Math.max(0, Number(room?.children || 0));
    return sum + adults + children;
  }, 0);

  return count > 0 ? count : 1;
}

export function calculatePackagePerPersonPrice(
  total: number | null | undefined,
  rooms: ChargeableRoom[] | null | undefined
): number | undefined {
  if (typeof total !== "number" || !Number.isFinite(total) || total <= 0) return undefined;
  const passengers = getChargeablePassengerCount(rooms);
  return Math.round((total / passengers) * 100) / 100;
}
