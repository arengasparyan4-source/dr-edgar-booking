export const PHONE_ERROR = "Խնդրում ենք մուտքագրել ճիշտ հեռախոսահամար";

const ARMENIA_COUNTRY_CODE = "374";

/**
 * E.164 allows up to 15 digits. We require a sane minimum so obviously broken
 * input is rejected, and disallow a leading 0 in the country code position.
 */
const isE164Digits = (digits: string) => /^[1-9]\d{7,14}$/.test(digits);

/**
 * Normalize a phone number to international E.164 format (+<countrycode><number>).
 *
 * Rules (see project requirements):
 *  - A number entered with a leading "+" is treated as international and its
 *    country code is preserved (never stripped) — e.g. +7..., +1..., +374...
 *  - A "00" prefix is the international access code and becomes "+".
 *  - Local Armenian formats (091123456, 0XXXXXXXX, 8-digit, 374XXXXXXXX) default
 *    to +374 — we do NOT assume every number is Armenian, only these local
 *    shapes.
 *  - Any other digits-only value that already looks like it carries a country
 *    code is accepted as international with a prepended "+".
 *
 * Returns the normalized +E.164 string, or null when the input is invalid.
 */
export function normalizePhoneNumber(phone: string): string | null {
  if (!phone) {
    return null;
  }

  const compact = phone.trim().replace(/[^\d+]/g, "");
  const plusCount = [...compact].filter((char) => char === "+").length;

  if (
    !compact ||
    plusCount > 1 ||
    (plusCount === 1 && !compact.startsWith("+"))
  ) {
    return null;
  }

  const digits = compact.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  // Explicit international: preserve the full number with its country code.
  if (compact.startsWith("+")) {
    return isE164Digits(digits) ? `+${digits}` : null;
  }

  // International access code (00XX...) -> +XX...
  if (digits.startsWith("00")) {
    const international = digits.slice(2);
    return isE164Digits(international) ? `+${international}` : null;
  }

  // Local Armenian shapes default to +374.
  if (digits.startsWith(ARMENIA_COUNTRY_CODE) && digits.length === 11) {
    return `+${ARMENIA_COUNTRY_CODE}${digits.slice(3)}`;
  }

  if (digits.length === 9 && digits.startsWith("0")) {
    return `+${ARMENIA_COUNTRY_CODE}${digits.slice(1)}`;
  }

  if (digits.length === 8) {
    return `+${ARMENIA_COUNTRY_CODE}${digits}`;
  }

  // Otherwise assume a full international number that is missing its leading "+".
  return isE164Digits(digits) ? `+${digits}` : null;
}
