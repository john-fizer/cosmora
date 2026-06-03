import type { ZodiacSign } from "./types";
import { ZODIAC_SIGNS } from "./types";

// Correct Hellenistic minor year values (Vettius Valens tradition)
export const ZR_MINOR_YEARS: Record<ZodiacSign, number> = {
  Aries: 15, Taurus: 8, Gemini: 20, Cancer: 25,
  Leo: 19, Virgo: 20, Libra: 8, Scorpio: 15,
  Sagittarius: 12, Capricorn: 27, Aquarius: 30, Pisces: 12,
};

export const ZR_TOTAL_YEARS = 211;

export interface ZRPeriod {
  sign: ZodiacSign;
  years: number;
  start: Date;
  end: Date;
  isCurrent: boolean;
  isPast: boolean;
  level: 1 | 2 | 3 | 4;
  // How many signs from the parent period's sign to this period's sign (1 = same sign, 7 = opposition)
  derivedHouse: number;
  // L2 period in the 7th sign from L1 = loosening of bonds (major life transition)
  isLooseningOfBonds: boolean;
}

// Number of signs from `from` to `to` (1–12; 1 = same sign, 7 = opposition)
export function signHouseDiff(from: ZodiacSign, to: ZodiacSign): number {
  return (ZODIAC_SIGNS.indexOf(to) - ZODIAC_SIGNS.indexOf(from) + 12) % 12 + 1;
}

export function buildL1Periods(lotLon: number, birthDatetime: string): ZRPeriod[] {
  const birth = new Date(birthDatetime);
  const today = new Date();
  const startIdx = Math.floor(lotLon / 30);
  const lotSign = ZODIAC_SIGNS[startIdx] as ZodiacSign;
  const maxDate = new Date(birth.getTime() + 120 * 365.25 * 86400000);

  const periods: ZRPeriod[] = [];
  let cursor = new Date(birth);
  let idx = startIdx;

  while (cursor < maxDate && periods.length < 60) {
    const sign = ZODIAC_SIGNS[idx % 12] as ZodiacSign;
    const years = ZR_MINOR_YEARS[sign];
    const end = new Date(cursor.getTime() + years * 365.25 * 86400000);
    periods.push({
      sign, years,
      start: new Date(cursor), end,
      isCurrent: today >= cursor && today < end,
      isPast: today >= end,
      level: 1,
      derivedHouse: signHouseDiff(lotSign, sign),
      isLooseningOfBonds: false,
    });
    cursor = end;
    idx++;
  }
  return periods;
}

// Build 12 sub-periods within a parent period, starting from the parent's sign
export function buildSubPeriods(parent: ZRPeriod, level: 2 | 3 | 4): ZRPeriod[] {
  const today = new Date();
  const parentMs = parent.end.getTime() - parent.start.getTime();
  const startSignIdx = ZODIAC_SIGNS.indexOf(parent.sign);

  const periods: ZRPeriod[] = [];
  let cursor = new Date(parent.start);

  for (let i = 0; i < 12; i++) {
    const signIdx = (startSignIdx + i) % 12;
    const sign = ZODIAC_SIGNS[signIdx] as ZodiacSign;
    const subMs = (ZR_MINOR_YEARS[sign] / ZR_TOTAL_YEARS) * parentMs;
    const rawEnd = new Date(cursor.getTime() + subMs);
    const end = rawEnd <= parent.end ? rawEnd : new Date(parent.end);
    const derivedHouse = signHouseDiff(parent.sign, sign);

    periods.push({
      sign,
      years: (ZR_MINOR_YEARS[sign] / ZR_TOTAL_YEARS) * parent.years,
      start: new Date(cursor),
      end,
      isCurrent: today >= cursor && today < end,
      isPast: today >= end,
      level,
      derivedHouse,
      // Loosening of bonds: L2 period in the 7th sign from L1 = opposition = major transition
      isLooseningOfBonds: level === 2 && derivedHouse === 7,
    });

    cursor = end;
    if (cursor >= parent.end) break;
  }
  return periods;
}

export interface ZRData {
  l1: ZRPeriod[];
  currentL1?: ZRPeriod;
  l2: ZRPeriod[];
  currentL2?: ZRPeriod;
  l3: ZRPeriod[];
  currentL3?: ZRPeriod;
  l4: ZRPeriod[];
  currentL4?: ZRPeriod;
}

export function buildZRData(lotLon: number, birthDatetime: string): ZRData {
  const l1 = buildL1Periods(lotLon, birthDatetime);
  const currentL1 = l1.find(p => p.isCurrent);
  const l2 = currentL1 ? buildSubPeriods(currentL1, 2) : [];
  const currentL2 = l2.find(p => p.isCurrent);
  const l3 = currentL2 ? buildSubPeriods(currentL2, 3) : [];
  const currentL3 = l3.find(p => p.isCurrent);
  const l4 = currentL3 ? buildSubPeriods(currentL3, 4) : [];
  const currentL4 = l4.find(p => p.isCurrent);
  return { l1, currentL1, l2, currentL2, l3, currentL3, l4, currentL4 };
}
