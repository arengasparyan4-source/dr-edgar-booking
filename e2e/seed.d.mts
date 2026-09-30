export const E2E_PORT: number;
export const E2E_BASE_URL: string;
export const E2E_ADMIN_PASSWORD: string;
export function clinicDate(now: Date, offsetDays?: number): string;
export function nextWeekday(now: Date, minOffset: number): string;
export const SEED: {
  clients: Record<"aram" | "maria" | "anna", { id: string; fullName: string; phone: string }>;
  bookings: Record<"pending" | "toCancel" | "past", string>;
};
export function buildSeedData(now: Date): unknown;
