import type { TaxProfile, TaxRegime } from '../types';

const STANDARD_DEDUCTION = 50000;

function round(value: number) {
  return Math.round(Number(value) || 0);
}

export function calculateHraExemption(profile: TaxProfile) {
  const actualHra = round(profile.hraReceived);
  const rentMinusTenPercentSalary = Math.max(0, round(profile.annualRent) - round(profile.basicSalary) * 0.1);
  const salaryShare = round(profile.basicSalary) * (profile.isMetro ? 0.5 : 0.4);
  return round(Math.min(actualHra, rentMinusTenPercentSalary, salaryShare));
}

export function calculateTaxByRegime(annualIncome: number, profile: TaxProfile, regime: TaxRegime) {
  if (regime === 'Old') {
    const hraExemption = calculateHraExemption(profile);
    const taxableIncome = Math.max(
      0,
      round(annualIncome)
        - STANDARD_DEDUCTION
        - Math.min(round(profile.section80C), 150000)
        - Math.min(round(profile.section80D), 25000)
        - hraExemption
    );

    let tax = 0;
    if (taxableIncome > 250000) tax += Math.min(taxableIncome - 250000, 250000) * 0.05;
    if (taxableIncome > 500000) tax += Math.min(taxableIncome - 500000, 500000) * 0.2;
    if (taxableIncome > 1000000) tax += (taxableIncome - 1000000) * 0.3;
    if (taxableIncome <= 500000) tax = 0;

    return {
      regime,
      taxableIncome,
      hraExemption,
      tax: round(tax * 1.04),
    };
  }

  const taxableIncome = Math.max(0, round(annualIncome) - STANDARD_DEDUCTION);
  let tax = 0;
  const slabs = [
    { limit: 400000, rate: 0 },
    { limit: 800000, rate: 0.05 },
    { limit: 1200000, rate: 0.1 },
    { limit: 1600000, rate: 0.15 },
    { limit: 2000000, rate: 0.2 },
    { limit: 2400000, rate: 0.25 },
    { limit: Number.POSITIVE_INFINITY, rate: 0.3 },
  ];

  if (taxableIncome > 1200000) {
    let previousLimit = 0;
    for (const slab of slabs) {
      if (taxableIncome <= previousLimit) break;
      const slabAmount = Math.min(taxableIncome, slab.limit) - previousLimit;
      tax += slabAmount * slab.rate;
      previousLimit = slab.limit;
    }
  }

  return {
    regime,
    taxableIncome,
    hraExemption: 0,
    tax: round(tax * 1.04),
  };
}

export function calculateTaxComparison(annualIncome: number, profile: TaxProfile) {
  const oldRegime = calculateTaxByRegime(annualIncome, profile, 'Old');
  const newRegime = calculateTaxByRegime(annualIncome, profile, 'New');
  const betterRegime = oldRegime.tax <= newRegime.tax ? 'Old' : 'New';
  return {
    oldRegime,
    newRegime,
    betterRegime,
    savings: Math.abs(oldRegime.tax - newRegime.tax),
  };
}

export function calculateMonthlyTakeHome(annualIncome: number, profile: TaxProfile, salaryMode: 'CTC' | 'InHand') {
  if (salaryMode === 'InHand') {
    return round(annualIncome / 12);
  }

  const comparison = calculateTaxComparison(annualIncome, profile);
  const chosen = profile.regime === 'Old' ? comparison.oldRegime : comparison.newRegime;
  return round((round(annualIncome) - chosen.tax) / 12);
}
