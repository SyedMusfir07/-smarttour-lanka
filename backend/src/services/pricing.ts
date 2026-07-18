/**
 * Algorithm 1 — Flexi-Fare Matrix (Tour Guide pricing)
 * 
 * Total = (BaseRate[tier] × Hours) + VehicleFee + LanguagePremium − GroupDiscount
 * BaseRate: NATIONAL=$25/hr, AREA=$18/hr, SITE=$12/hr, CHAUFFEUR=$15/hr
 * VehicleFee: car=$8/hr, tuk-tuk=$5/hr (only if vehicle_provided)
 * LanguagePremium: +$5/hr if tourist requests German/Russian/Mandarin
 * GroupDiscount: 5% per person above 4 travellers, capped at 20%
 */

export type GuideTier = 'NATIONAL' | 'AREA' | 'SITE' | 'CHAUFFEUR';
export type VehicleType = 'car' | 'tuk-tuk';
export type PremiumLanguage = 'GERMAN' | 'RUSSIAN' | 'MANDARIN';

const BASE_RATES: Record<GuideTier, number> = {
  NATIONAL: 25,
  AREA: 18,
  SITE: 12,
  CHAUFFEUR: 15,
};

const VEHICLE_FEES: Record<VehicleType, number> = {
  'car': 8,
  'tuk-tuk': 5,
};

const LANGUAGE_PREMIUM_AMOUNT = 5; // $5/hr
const PREMIUM_LANGUAGES: PremiumLanguage[] = ['GERMAN', 'RUSSIAN', 'MANDARIN'];
const GROUP_DISCOUNT_THRESHOLD = 4;
const GROUP_DISCOUNT_PERCENT_PER_PERSON = 5; // 5% per person above threshold
const MAX_GROUP_DISCOUNT_PERCENT = 20;

export interface FlexiFareInput {
  tier: GuideTier;
  hours: number;
  vehicleProvided: boolean;
  vehicleType?: VehicleType;
  languagePremium: boolean;
  premiumLanguage?: string;
  groupSize: number;
}

export interface FlexiFareBreakdown {
  baseRate: number;
  baseTotal: number;
  vehicleFee: number;
  vehicleFeeTotal: number;
  languagePremium: number;
  languagePremiumTotal: number;
  groupDiscountPercent: number;
  groupDiscountAmount: number;
  total: number;
  breakdown: Array<{ label: string; amount: number }>;
}

export function calculateFlexiFare(input: FlexiFareInput): FlexiFareBreakdown {
  const baseRate = BASE_RATES[input.tier];
  const baseTotal = baseRate * input.hours;

  // Vehicle fee
  let vehicleFee = 0;
  let vehicleFeeTotal = 0;
  if (input.vehicleProvided && input.vehicleType) {
    vehicleFee = VEHICLE_FEES[input.vehicleType] || 0;
    vehicleFeeTotal = vehicleFee * input.hours;
  }

  // Language premium
  let languagePremium = 0;
  let languagePremiumTotal = 0;
  if (input.languagePremium && input.premiumLanguage && 
      PREMIUM_LANGUAGES.includes(input.premiumLanguage as PremiumLanguage)) {
    languagePremium = LANGUAGE_PREMIUM_AMOUNT;
    languagePremiumTotal = languagePremium * input.hours;
  }

  // Group discount
  let groupDiscountPercent = 0;
  if (input.groupSize > GROUP_DISCOUNT_THRESHOLD) {
    const extraPeople = input.groupSize - GROUP_DISCOUNT_THRESHOLD;
    groupDiscountPercent = Math.min(
      extraPeople * GROUP_DISCOUNT_PERCENT_PER_PERSON,
      MAX_GROUP_DISCOUNT_PERCENT
    );
  }

  const subtotal = baseTotal + vehicleFeeTotal + languagePremiumTotal;
  const groupDiscountAmount = (subtotal * groupDiscountPercent) / 100;
  const total = subtotal - groupDiscountAmount;

  const breakdown: Array<{ label: string; amount: number }> = [
    { label: `Base (${input.hours}h × $${baseRate}/hr)`, amount: baseTotal },
  ];

  if (vehicleFeeTotal > 0) {
    breakdown.push({
      label: `Vehicle Fee (${input.vehicleType}, ${input.hours}h × $${vehicleFee}/hr)`,
      amount: vehicleFeeTotal,
    });
  }

  if (languagePremiumTotal > 0) {
    breakdown.push({
      label: `Language Premium (${input.premiumLanguage}, ${input.hours}h × $${languagePremium}/hr)`,
      amount: languagePremiumTotal,
    });
  }

  if (groupDiscountAmount > 0) {
    breakdown.push({
      label: `Group Discount (−${groupDiscountPercent}%)`,
      amount: -groupDiscountAmount,
    });
  }

  return {
    baseRate,
    baseTotal,
    vehicleFee,
    vehicleFeeTotal,
    languagePremium,
    languagePremiumTotal,
    groupDiscountPercent,
    groupDiscountAmount,
    total: Math.round(total * 100) / 100,
    breakdown,
  };
}
