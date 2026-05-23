export type ZodiacSign =
  | "Aries" | "Taurus" | "Gemini" | "Cancer"
  | "Leo" | "Virgo" | "Libra" | "Scorpio"
  | "Sagittarius" | "Capricorn" | "Aquarius" | "Pisces";

export type PlanetName =
  | "Sun" | "Moon" | "Mercury" | "Venus" | "Mars"
  | "Jupiter" | "Saturn" | "Uranus" | "Neptune" | "Pluto"
  | "NorthNode" | "Chiron";

export type HouseSystem = "whole_sign" | "placidus" | "equal" | "porphyry";

export interface PlanetPosition {
  name: PlanetName;
  longitude: number;       // 0–360 ecliptic longitude
  sign: ZodiacSign;
  signDegree: number;      // degree within the sign (0–30)
  house: number;           // 1–12
  retrograde: boolean;
  speed: number;           // degrees per day
  dignity?: string;        // domicile | exaltation | detriment | fall | peregrine
  decan?: number;          // 1 | 2 | 3 (Ptolemaic face/decan)
  decanLord?: PlanetName;  // Chaldean decan ruler
}

export interface HouseCusp {
  house: number;
  longitude: number;
  sign: ZodiacSign;
  signDegree: number;
}

export interface Aspect {
  planet1: PlanetName;
  planet2: PlanetName;
  type: "conjunction" | "opposition" | "trine" | "square" | "sextile" | "quincunx";
  orb: number;
  exact: boolean;
  applying: boolean;
}

export interface ChartData {
  id?: number;
  profileId?: number;
  calculatedAt: string;
  birthDatetime: string;
  latitude: number;
  longitude: number;
  timezone: string;
  houseSystem: HouseSystem;
  sect: "day" | "night";
  ascendant: number;
  midheaven: number;
  planets: PlanetPosition[];
  houses: HouseCusp[];
  aspects: Aspect[];
  annualProfection: AnnualProfection;
  lotOfFortune: number;
  lotOfSpirit: number;
}

export interface AnnualProfection {
  age: number;
  activatedHouse: number;
  activatedSign: ZodiacSign;
  lordOfYear: PlanetName;
}

export interface BirthProfile {
  id?: number;
  userId?: string;
  name: string;
  birthDate: string;        // YYYY-MM-DD
  birthTime: string;        // HH:MM:SS
  birthPlace: string;
  latitude: number;
  longitude: number;
  timezone: string;
  birthTimeConfidence: "exact" | "approximate" | "unknown" | "rectified";
  houseSystem: HouseSystem;
  astrologyMode: "traditional" | "modern" | "blended";
  createdAt?: string;
}

export const ZODIAC_SIGNS: ZodiacSign[] = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
];

export const SIGN_SYMBOLS: Record<ZodiacSign, string> = {
  Aries:"♈", Taurus:"♉", Gemini:"♊", Cancer:"♋", Leo:"♌", Virgo:"♍",
  Libra:"♎", Scorpio:"♏", Sagittarius:"♐", Capricorn:"♑", Aquarius:"♒", Pisces:"♓",
};

export const PLANET_SYMBOLS: Record<PlanetName, string> = {
  Sun:"☉", Moon:"☽", Mercury:"☿", Venus:"♀", Mars:"♂",
  Jupiter:"♃", Saturn:"♄", Uranus:"♅", Neptune:"♆", Pluto:"♇",
  NorthNode:"☊", Chiron:"⚷",
};

export const TRADITIONAL_RULERS: Record<ZodiacSign, PlanetName> = {
  Aries:"Mars", Taurus:"Venus", Gemini:"Mercury", Cancer:"Moon",
  Leo:"Sun", Virgo:"Mercury", Libra:"Venus", Scorpio:"Mars",
  Sagittarius:"Jupiter", Capricorn:"Saturn", Aquarius:"Saturn", Pisces:"Jupiter",
};

export const MODERN_RULERS: Record<ZodiacSign, PlanetName> = {
  Aries:"Mars", Taurus:"Venus", Gemini:"Mercury", Cancer:"Moon",
  Leo:"Sun", Virgo:"Mercury", Libra:"Venus", Scorpio:"Pluto",
  Sagittarius:"Jupiter", Capricorn:"Saturn", Aquarius:"Uranus", Pisces:"Neptune",
};

export const DOMICILE: Record<PlanetName, ZodiacSign[]> = {
  Sun:["Leo"], Moon:["Cancer"], Mercury:["Gemini","Virgo"],
  Venus:["Taurus","Libra"], Mars:["Aries","Scorpio"],
  Jupiter:["Sagittarius","Pisces"], Saturn:["Capricorn","Aquarius"],
  Uranus:["Aquarius"], Neptune:["Pisces"], Pluto:["Scorpio"],
  NorthNode:[], Chiron:[],
};

export const EXALTATION: Partial<Record<PlanetName, ZodiacSign>> = {
  Sun:"Aries", Moon:"Taurus", Mercury:"Virgo", Venus:"Pisces",
  Mars:"Capricorn", Jupiter:"Cancer", Saturn:"Libra",
};
