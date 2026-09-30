import { normalizePhoneNumber } from "@/lib/phone/armenianPhone";
import type { Client } from "@/types/domain";

/**
 * Client search that works across Armenian, Russian and Latin spelling.
 *
 * Every name and every query is reduced to a Latin "skeleton": letters are
 * transliterated, then spelling variants that the same name commonly gets in
 * different alphabets are folded together (kh/x/h, ts/c, zh/j, y/i, double
 * letters…). "Հակոբ", "Акоп" and "Hakob" do not all collapse to one string,
 * but "Արամ"/"Арам"/"Aram" and "Խաչատրյան"/"Хачатрян"/"Khachatryan" do.
 * Case never matters.
 */

const armenian: Record<string, string> = {
  ա: "a", բ: "b", գ: "g", դ: "d", ե: "e", զ: "z", է: "e", ը: "e", թ: "t",
  ժ: "zh", ի: "i", լ: "l", խ: "kh", ծ: "ts", կ: "k", հ: "h", ձ: "dz", ղ: "gh",
  ճ: "ch", մ: "m", յ: "y", ն: "n", շ: "sh", ո: "o", չ: "ch", պ: "p", ջ: "j",
  ռ: "r", ս: "s", վ: "v", տ: "t", ր: "r", ց: "ts", ւ: "v", փ: "p", ք: "k",
  և: "ev", օ: "o", ֆ: "f"
};

const cyrillic: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "sh",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya"
};

const transliterate = (value: string) => {
  // Armenian "ու" is the vowel u; handle it before single letters.
  const lower = value.toLowerCase().replace(/ու/g, "u");
  let result = "";

  for (const char of lower) {
    result += armenian[char] ?? cyrillic[char] ?? char;
  }

  return result;
};

/** Folds spelling variants so different alphabets meet on one form. */
const foldLatin = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/kh|x/g, "h")
    .replace(/gh/g, "g")
    .replace(/zh|dj|dzh/g, "j")
    .replace(/tz|ts/g, "c")
    .replace(/dz/g, "z")
    .replace(/ph/g, "p")
    .replace(/th/g, "t")
    .replace(/ck|q/g, "k")
    .replace(/w/g, "v")
    .replace(/ou/g, "u")
    .replace(/y(?=[aeiou])/g, "")
    .replace(/y/g, "i")
    .replace(/(.)\1+/g, "$1")
    .replace(/[^a-z0-9]/g, "");

export const searchSkeleton = (value: string) => foldLatin(transliterate(value));

const wordsOf = (value: string) =>
  value
    .split(/[\s,.;-]+/)
    .map(searchSkeleton)
    .filter(Boolean);

const phoneDigitVariants = (client: Client) => {
  const digits = (client.normalizedPhone || client.phone || "").replace(/\D/g, "");
  const variants = [digits];

  // Armenian numbers are usually typed in the local 0XX form.
  if (digits.startsWith("374")) {
    variants.push(`0${digits.slice(3)}`, digits.slice(3));
  }

  return variants;
};

/**
 * Scores how well a client matches a query; 0 means no match. Higher is
 * better: exact phone > word prefix > substring.
 */
export function scoreClientMatch(client: Client, query: string): number {
  const trimmed = query.trim();

  if (!trimmed) {
    return 0;
  }

  const queryDigits = trimmed.replace(/\D/g, "");
  const looksLikePhone = queryDigits.length >= 3 && /^[\d\s()+-]+$/.test(trimmed);

  if (looksLikePhone) {
    const normalized = normalizePhoneNumber(trimmed);
    if (normalized && normalized === client.normalizedPhone) {
      return 100;
    }

    const variants = phoneDigitVariants(client);
    if (variants.some((variant) => variant.startsWith(queryDigits))) {
      return 60;
    }

    return variants.some((variant) => variant.includes(queryDigits)) ? 40 : 0;
  }

  const queryWords = wordsOf(trimmed);
  if (!queryWords.length) {
    return 0;
  }

  const nameWords = wordsOf(
    [client.fullName, client.firstName, client.lastName].filter(Boolean).join(" ")
  );
  const joinedName = nameWords.join(" ");
  let score = 0;

  // Every query word has to match some part of the name.
  for (const queryWord of queryWords) {
    if (nameWords.some((word) => word === queryWord)) {
      score += 30;
    } else if (nameWords.some((word) => word.startsWith(queryWord))) {
      score += 20;
    } else if (queryWord.length >= 3 && joinedName.includes(queryWord)) {
      score += 8;
    } else {
      return 0;
    }
  }

  return score;
}

export function searchClients(clients: Client[], query: string, limit = 8): Client[] {
  return clients
    .map((client) => ({ client, score: scoreClientMatch(client, query) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.client.fullName.localeCompare(b.client.fullName)
    )
    .slice(0, limit)
    .map((entry) => entry.client);
}

/** The existing client with exactly this phone number, if any. */
export function findClientByPhone(clients: Client[], phone: string): Client | null {
  const normalized = normalizePhoneNumber(phone);

  if (!normalized) {
    return null;
  }

  return clients.find((client) => client.normalizedPhone === normalized) ?? null;
}
