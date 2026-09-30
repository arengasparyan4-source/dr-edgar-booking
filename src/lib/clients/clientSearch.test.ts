import { describe, expect, it } from "vitest";
import { findClientByPhone, scoreClientMatch, searchClients, searchSkeleton } from "@/lib/clients/clientSearch";
import type { Client } from "@/types/domain";

const client = (id: string, fullName: string, phone: string): Client => ({
  id,
  fullName,
  firstName: fullName.split(" ")[0],
  lastName: fullName.split(" ").slice(1).join(" "),
  phone,
  normalizedPhone: phone,
  status: "active",
  isVip: false,
  isBlacklisted: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
});

const clients = [
  client("aram", "Արամ Խաչատրյան", "+37491123456"),
  client("artyom", "Артём Гаспарян", "+37477000005"),
  client("anna", "Anna Petrosyan", "+37477000111"),
  client("olga", "Ольга Смирнова", "+37477000003"),
  client("narek", "Նարեկ Պետրոսյան", "+37477000006")
];

describe("searchSkeleton (transliteration)", () => {
  it("brings Armenian, Cyrillic and Latin spellings to one form", () => {
    expect(searchSkeleton("Արամ")).toBe(searchSkeleton("Арам"));
    expect(searchSkeleton("Арам")).toBe(searchSkeleton("aram"));
    expect(searchSkeleton("Խաչատրյան")).toBe(searchSkeleton("Хачатрян"));
    expect(searchSkeleton("Хачатрян")).toBe(searchSkeleton("Khachatryan"));
    expect(searchSkeleton("Գասպարյան")).toBe(searchSkeleton("Gasparyan"));
    expect(searchSkeleton("Պետրոսյան")).toBe(searchSkeleton("Петросян"));
  });

  it("ignores case", () => {
    expect(searchSkeleton("SMIRNOVA")).toBe(searchSkeleton("smirnova"));
    expect(searchSkeleton("СМИРНОВА")).toBe(searchSkeleton("смирнова"));
  });
});

describe("searchClients", () => {
  const ids = (query: string) => searchClients(clients, query).map((item) => item.id);

  it("finds a client typed in another alphabet", () => {
    expect(ids("Хачатрян")).toEqual(["aram"]);
    expect(ids("khachatryan")).toEqual(["aram"]);
    expect(ids("Гаспарян")).toEqual(["artyom"]);
    expect(ids("smirnova")).toEqual(["olga"]);
    expect(ids("Նարեկ")).toEqual(["narek"]);
  });

  it("matches prefixes and needs every word to match", () => {
    expect(ids("петро")).toEqual(expect.arrayContaining(["anna", "narek"]));
    expect(ids("Anna Petrosyan")).toEqual(["anna"]);
    expect(ids("Anna Smirnova")).toEqual([]);
  });

  it("searches phones in international and local form", () => {
    expect(ids("+37491123456")).toEqual(["aram"]);
    expect(ids("091 123")).toEqual(["aram"]);
    expect(ids("77000")).toHaveLength(4);
  });

  it("an exact phone scores above a name match", () => {
    expect(scoreClientMatch(clients[0], "091123456")).toBe(100);
    expect(scoreClientMatch(clients[0], "Արամ")).toBeLessThan(100);
    expect(scoreClientMatch(clients[0], "   ")).toBe(0);
  });

  it("respects the limit", () => {
    expect(searchClients(clients, "7", 2)).toHaveLength(0); // one digit is not a phone query
    expect(searchClients(clients, "77000", 2)).toHaveLength(2);
  });
});

describe("findClientByPhone", () => {
  it("finds an existing client whatever the format, so no duplicate is created", () => {
    expect(findClientByPhone(clients, "091 12-34-56")?.id).toBe("aram");
    expect(findClientByPhone(clients, "+374 77 000 005")?.id).toBe("artyom");
    expect(findClientByPhone(clients, "099999999")).toBeNull();
    expect(findClientByPhone(clients, "abc")).toBeNull();
  });
});
