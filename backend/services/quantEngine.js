const RISK_FREE_RATE = 0.065;
const INFLATION_RATE = 0.06;
const STANDARD_DEDUCTION = 50000;
const MONTH_NAMES = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

const ASSET_PARAMS = {
  emergency: { mu: 0.065, sigma: 0.01, name: 'Emergency Fund FD / Liquid Fund' },
  debt: { mu: 0.07, sigma: 0.02, name: 'Short-Term RD / Debt MF' },
  equity: { mu: 0.12, sigma: 0.18, name: 'Long-Term Equity MF SIP' },
};

const ALLOCATION_MATRIX = {
  Conservative: { emergency: 0.55, debt: 0.30, equity: 0.15 },
  Moderate: { emergency: 0.35, debt: 0.35, equity: 0.30 },
  Balanced: { emergency: 0.30, debt: 0.30, equity: 0.40 },
  Aggressive: { emergency: 0.20, debt: 0.20, equity: 0.60 },
};

function round(value) {
  return Math.round(Number(value) || 0);
}

function normalRandom() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function calculateTax({
  annualIncome,
  regime = 'New',
  section80C = 0,
  section80D = 0,
  annualRent = 0,
  basicSalary = 0,
  hraReceived = 0,
  isMetro = false,
}) {
  const grossIncome = round(annualIncome);
  const hraExemption = calculateHraExemption({ annualRent, basicSalary, hraReceived, isMetro });

  if (regime === 'Old') {
    const taxableIncome = Math.max(
      0,
      grossIncome
        - STANDARD_DEDUCTION
        - Math.min(round(section80C), 150000)
        - Math.min(round(section80D), 25000)
        - hraExemption
    );

    let tax = 0;
    if (taxableIncome > 250000) tax += Math.min(taxableIncome - 250000, 250000) * 0.05;
    if (taxableIncome > 500000) tax += Math.min(taxableIncome - 500000, 500000) * 0.2;
    if (taxableIncome > 1000000) tax += (taxableIncome - 1000000) * 0.3;
    if (taxableIncome <= 500000) tax = 0;

    return {
      regime,
      taxableIncome: round(taxableIncome),
      tax: round(tax * 1.04),
      hraExemption: round(hraExemption),
    };
  }

  const taxableIncome = Math.max(0, grossIncome - STANDARD_DEDUCTION);
  const newRegimeTax = calculateNewRegimeTax(taxableIncome);
  return {
    regime,
    taxableIncome: round(taxableIncome),
    tax: round(newRegimeTax),
    hraExemption: 0,
  };
}

function calculateNewRegimeTax(taxableIncome) {
  if (taxableIncome <= 1200000) return 0;

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

  let previousLimit = 0;
  for (const slab of slabs) {
    if (taxableIncome <= previousLimit) break;
    const slabAmount = Math.min(taxableIncome, slab.limit) - previousLimit;
    tax += slabAmount * slab.rate;
    previousLimit = slab.limit;
  }

  return tax * 1.04;
}

function calculateHraExemption({ annualRent, basicSalary, hraReceived, isMetro }) {
  const actualHra = round(hraReceived);
  const rentMinusTenPercentSalary = Math.max(0, round(annualRent) - round(basicSalary) * 0.1);
  const salaryShare = round(basicSalary) * (isMetro ? 0.5 : 0.4);
  return Math.max(0, Math.min(actualHra, rentMinusTenPercentSalary, salaryShare));
}

export function calculateMonthlyTakeHomeFromProfile(annualIncome, taxProfile, salaryMode = 'CTC') {
  if (salaryMode === 'InHand') {
    return round(annualIncome / 12);
  }

  const oldRegime = calculateTax({ annualIncome, ...taxProfile, regime: 'Old' });
  const newRegime = calculateTax({ annualIncome, ...taxProfile, regime: 'New' });
  const chosen = taxProfile.regime === 'Old' ? oldRegime : newRegime;

  return round((round(annualIncome) - chosen.tax) / 12);
}

export function sharpeRatio(expectedReturn, volatility, riskFreeRate = RISK_FREE_RATE) {
  if (!volatility) return 0;
  return (expectedReturn - riskFreeRate) / volatility;
}

export function portfolioMetrics(allocation) {
  let expectedReturn = 0;
  let variance = 0;

  for (const [asset, weight] of Object.entries(allocation)) {
    const params = ASSET_PARAMS[asset];
    if (!params || !weight) continue;
    expectedReturn += weight * params.mu;
    variance += Math.pow(weight, 2) * Math.pow(params.sigma, 2);
  }

  const volatility = Math.sqrt(Math.max(0, variance));
  return {
    expectedReturn,
    volatility,
    sharpe: sharpeRatio(expectedReturn, volatility),
  };
}

export function monteCarloSimulation(monthlySIP, allocation, years = 10, numPaths = 1000, annualStepUp = 0.1) {
  const months = years * 12;
  const metrics = portfolioMetrics(allocation);
  const monthlyMu = metrics.expectedReturn / 12;
  const monthlySigma = metrics.volatility / Math.sqrt(12);
  const finalValues = [];
  const yearlySnapshots = Array.from({ length: years }, () => []);

  for (let path = 0; path < numPaths; path += 1) {
    let wealth = 0;
    let currentSip = monthlySIP;

    for (let month = 1; month <= months; month += 1) {
      const z = normalRandom();
      wealth = (wealth + currentSip) * (1 + monthlyMu + monthlySigma * z);

      if (month % 12 === 0) {
        currentSip *= (1 + annualStepUp);
        yearlySnapshots[Math.floor(month / 12) - 1].push(Math.max(0, wealth));
      }
    }

    finalValues.push(Math.max(0, wealth));
  }

  finalValues.sort((a, b) => a - b);
  const percentile = (array, fraction) => {
    if (!array.length) return 0;
    const index = Math.floor((array.length - 1) * fraction);
    return round(array[index]);
  };

  return {
    summary: {
      pessimistic: percentile(finalValues, 0.1),
      median: percentile(finalValues, 0.5),
      optimistic: percentile(finalValues, 0.9),
      mean: round(finalValues.reduce((sum, value) => sum + value, 0) / Math.max(1, finalValues.length)),
    },
    yearlyData: yearlySnapshots.map((values, index) => {
      values.sort((a, b) => a - b);
      return {
        year: new Date().getFullYear() + index + 1,
        p10: percentile(values, 0.1),
        p25: percentile(values, 0.25),
        p50: percentile(values, 0.5),
        p75: percentile(values, 0.75),
        p90: percentile(values, 0.9),
      };
    }),
    portfolioMetrics: {
      expectedReturn: +(metrics.expectedReturn * 100).toFixed(2),
      volatility: +(metrics.volatility * 100).toFixed(2),
      sharpeRatio: +metrics.sharpe.toFixed(3),
    },
  };
}

export function goalSIP(targetAmount, months, annualRate = 0.12) {
  const r = annualRate / 12;
  if (!months) {
    return { requiredSIP: 0, totalInvested: 0, wealthGain: 0, effectiveReturn: 0 };
  }
  if (r === 0) {
    const required = round(targetAmount / months);
    return { requiredSIP: required, totalInvested: required * months, wealthGain: 0, effectiveReturn: 0 };
  }

  const fvFactor = (Math.pow(1 + r, months) - 1) / r;
  const sip = targetAmount / (fvFactor * (1 + r));
  return {
    requiredSIP: round(sip),
    totalInvested: round(sip * months),
    wealthGain: round(targetAmount - sip * months),
    effectiveReturn: +((targetAmount / Math.max(1, sip * months) - 1) * 100).toFixed(1),
  };
}

function monthGoalRequirement(goal) {
  const remaining = Math.max(0, round(goal.targetAmount) - round(goal.savedAmount || 0));
  return round(remaining / Math.max(1, round(goal.monthsToAchieve)));
}

function getAllocationForRisk(riskProfile = 'Balanced') {
  return ALLOCATION_MATRIX[riskProfile] || ALLOCATION_MATRIX.Balanced;
}

function buildGoalAnalysis(goals, allocation, investableSurplus) {
  const equityReturn = portfolioMetrics(allocation).expectedReturn;
  return goals.map((goal) => {
    const remainingAmount = Math.max(0, round(goal.targetAmount) - round(goal.savedAmount || 0));
    const sipCalc = goalSIP(remainingAmount, Math.max(1, goal.monthsToAchieve), equityReturn);
    const progress = goal.targetAmount > 0 ? ((goal.savedAmount || 0) / goal.targetAmount) * 100 : 0;
    const shareOfSurplus = investableSurplus > 0 ? sipCalc.requiredSIP / investableSurplus : 1;
    const status = progress >= 70 ? 'On track' : shareOfSurplus <= 0.6 ? 'At risk' : 'Off track';
    return {
      ...goal,
      remainingAmount,
      progress: +progress.toFixed(1),
      requiredSIP: sipCalc.requiredSIP,
      wealthGain: sipCalc.wealthGain,
      status,
      isFeasible: shareOfSurplus <= 0.8,
      recommendation: status === 'On track'
        ? `Keep contributing around Rs ${sipCalc.requiredSIP.toLocaleString('en-IN')} a month.`
        : status === 'At risk'
          ? `Increase monthly goal funding or extend the deadline by 3 to 6 months.`
          : `This goal is stretching the plan. Reduce the target, add savings, or move the timeline.`,
    };
  });
}

function buildAllocationSuggestions(goals, riskProfile, investableSurplus) {
  const riskAllocation = getAllocationForRisk(riskProfile);
  const goalBuckets = goals.reduce((acc, goal) => {
    if (goal.name.toLowerCase().includes('emergency')) acc.emergency += 1;
    else if (goal.monthsToAchieve <= 24) acc.debt += 1;
    else acc.equity += 1;
    return acc;
  }, { emergency: 0, debt: 0, equity: 0 });

  return [
    {
      bucket: 'Emergency Fund',
      vehicle: 'FD / Liquid Fund',
      percent: round((riskAllocation.emergency + goalBuckets.emergency * 0.05) * 100),
      monthlyAmount: round(investableSurplus * riskAllocation.emergency),
      rationale: 'Keeps 6 months of essentials stable and accessible.',
    },
    {
      bucket: 'Short-Term Goals',
      vehicle: 'RD / Debt MF',
      percent: round((riskAllocation.debt + goalBuckets.debt * 0.03) * 100),
      monthlyAmount: round(investableSurplus * riskAllocation.debt),
      rationale: 'Useful for goals due within 2 years and premium-heavy months.',
    },
    {
      bucket: 'Long-Term Goals',
      vehicle: 'Equity MF SIP',
      percent: round((riskAllocation.equity + goalBuckets.equity * 0.02) * 100),
      monthlyAmount: round(investableSurplus * riskAllocation.equity),
      rationale: 'Best fit for multi-year wealth creation and goal compounding.',
    },
  ];
}

function buildMonthlyPlan({ monthlyTakeHome, totalExpenses, goals, variableCashFlows, salaryHikeMonth, salaryHikePercent, discretionaryRate }) {
  const monthlyGoalFunding = goals.reduce((sum, goal) => sum + monthGoalRequirement(goal), 0);
  const plan = [];
  let rollingDiscretionary = 0;

  for (let month = 0; month < 12; month += 1) {
    const hikeMultiplier = salaryHikeMonth && month + 1 >= salaryHikeMonth ? 1 + salaryHikePercent / 100 : 1;
    const income = round(monthlyTakeHome * hikeMultiplier);
    const monthEvents = variableCashFlows.filter((event) => Number(event.month) === month + 1);
    const extraIncome = monthEvents.filter((event) => event.type === 'income').reduce((sum, event) => sum + round(event.amount), 0);
    const extraExpense = monthEvents.filter((event) => event.type === 'expense').reduce((sum, event) => sum + round(event.amount), 0);
    const discretionary = round(income * discretionaryRate);
    const surplus = income + extraIncome - totalExpenses - monthlyGoalFunding - discretionary - extraExpense;
    const lifestyleChange = month === 0 ? 0 : discretionary - rollingDiscretionary;
    rollingDiscretionary = discretionary;

    plan.push({
      month: month + 1,
      label: MONTH_NAMES[month],
      income,
      obligations: totalExpenses,
      goalFunding: monthlyGoalFunding,
      discretionary,
      variableIncome: extraIncome,
      variableExpense: extraExpense,
      netSurplus: round(surplus),
      status: surplus >= 0 ? 'Surplus' : 'Deficit',
      events: monthEvents,
      lifestyleCreepWarning: lifestyleChange > income * 0.03,
    });
  }

  return plan;
}

function buildPeerBenchmark(city, monthlyTakeHome, expenses, goals) {
  const totalFixedExpenses = expenses.reduce((sum, expense) => sum + round(expense.amount), 0);
  const goalFunding = goals.reduce((sum, goal) => sum + monthGoalRequirement(goal), 0);
  const savedRate = monthlyTakeHome > 0 ? ((monthlyTakeHome - totalFixedExpenses - goalFunding) / monthlyTakeHome) * 100 : 0;
  const cityBoost = city ? Math.min(8, city.length % 6) : 3;
  const benchmark = clamp(22 + cityBoost, 18, 32);
  return {
    city: city || 'your city',
    userSavingsRate: +savedRate.toFixed(1),
    peerSavingsRate: benchmark,
    delta: +(savedRate - benchmark).toFixed(1),
  };
}

function buildNudges(monthlyPlan, allocationSuggestions, peerBenchmark, taxComparison) {
  const nudges = [];
  const deficits = monthlyPlan.filter((month) => month.netSurplus < 0);
  const creepMonths = monthlyPlan.filter((month) => month.lifestyleCreepWarning);

  if (deficits.length) {
    nudges.push(`You dip into deficit in ${deficits.map((month) => month.label).join(', ')}. Pre-fund those months from surplus months or trim discretionary spend.`);
  }
  if (creepMonths.length >= 2) {
    nudges.push(`Lifestyle spend rises across ${creepMonths.map((month) => month.label).join(', ')}. Keep discretionary spending inside a steady monthly cap.`);
  }
  if (taxComparison.betterRegime !== taxComparison.currentRegime) {
    nudges.push(`${taxComparison.betterRegime} regime currently saves about Rs ${taxComparison.savings.toLocaleString('en-IN')} more in annual tax.`);
  }
  if (peerBenchmark.delta < 0) {
    nudges.push(`Your savings rate trails the peer benchmark by ${Math.abs(peerBenchmark.delta).toFixed(1)} percentage points. The easiest fix is to protect the ${allocationSuggestions[0].bucket.toLowerCase()} bucket first.`);
  }
  if (!nudges.length) {
    nudges.push('Your plan is stable. Keep the SIP step-up linked to salary hikes so the surplus keeps compounding.');
  }

  return nudges;
}

function buildTaxComparison(annualIncome, taxProfile) {
  const oldRegime = calculateTax({ annualIncome, ...taxProfile, regime: 'Old' });
  const newRegime = calculateTax({ annualIncome, ...taxProfile, regime: 'New' });
  const betterRegime = oldRegime.tax <= newRegime.tax ? 'Old' : 'New';
  const currentRegime = taxProfile.regime || 'New';
  return {
    currentRegime,
    oldRegime,
    newRegime,
    betterRegime,
    savings: Math.abs(oldRegime.tax - newRegime.tax),
  };
}

function buildRetirementProjection(investableSurplus, expectedReturn, age, stepUpRate) {
  const yearsToRetirement = Math.max(5, 60 - round(age || 25));
  const wealth = stepUpSIPFutureValue(investableSurplus, expectedReturn, yearsToRetirement, stepUpRate / 100);
  return {
    yearsToRetirement,
    projectedWealth: wealth,
    inflationAdjusted: round(wealth / Math.pow(1 + INFLATION_RATE, yearsToRetirement)),
  };
}

export function stepUpSIPFutureValue(monthlySIP, annualRate, years, annualStepUp = 0.1) {
  let totalValue = 0;
  let currentSip = monthlySIP;
  const monthlyRate = annualRate / 12;

  for (let month = 1; month <= years * 12; month += 1) {
    totalValue = (totalValue + currentSip) * (1 + monthlyRate);
    if (month % 12 === 0) currentSip *= (1 + annualStepUp);
  }

  return round(totalValue);
}

export function generateFinancialPlan(userData) {
  const {
    monthlyTakeHome,
    totalExpenses,
    goals = [],
    riskProfile = 'Balanced',
    age = 25,
    city = '',
    annualIncome = 0,
    taxProfile = { regime: 'New' },
    variableCashFlows = [],
    stepUpRate = 10,
    salaryHikeMonth = 6,
    salaryHikePercent = 10,
    discretionaryRate = 0.12,
  } = userData;

  const allocation = getAllocationForRisk(riskProfile);
  const goalCommitments = goals.reduce((sum, goal) => sum + monthGoalRequirement(goal), 0);
  const currentDiscretionary = round(monthlyTakeHome * discretionaryRate);
  const investableSurplus = Math.max(0, round(monthlyTakeHome - totalExpenses - goalCommitments - currentDiscretionary));
  const monthlyPlan = buildMonthlyPlan({
    monthlyTakeHome,
    totalExpenses,
    goals,
    variableCashFlows,
    salaryHikeMonth,
    salaryHikePercent,
    discretionaryRate,
  });
  const portfolio = portfolioMetrics(allocation);
  const simulation = monteCarloSimulation(investableSurplus, allocation, 10, 1000, stepUpRate / 100);
  const goalAnalysis = buildGoalAnalysis(goals, allocation, investableSurplus);
  const allocationSuggestions = buildAllocationSuggestions(goals, riskProfile, investableSurplus);
  const taxComparison = buildTaxComparison(annualIncome, taxProfile);
  const retirement = buildRetirementProjection(investableSurplus, portfolio.expectedReturn, age, stepUpRate);
  const peerBenchmark = buildPeerBenchmark(city, monthlyTakeHome, userData.expenses || [], goals);
  const nudges = buildNudges(monthlyPlan, allocationSuggestions, peerBenchmark, taxComparison);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      monthlyTakeHome,
      totalExpenses,
      goalCommitments,
      discretionary: currentDiscretionary,
      investableSurplus,
      riskProfile,
    },
    taxComparison,
    cashFlowPlan: monthlyPlan,
    allocation: allocationSuggestions.map((item) => ({
      name: item.vehicle,
      bucket: item.bucket,
      weight: item.percent,
      monthlyAmount: item.monthlyAmount,
      expectedReturn: +(ASSET_PARAMS[item.bucket === 'Emergency Fund' ? 'emergency' : item.bucket === 'Short-Term Goals' ? 'debt' : 'equity'].mu * 100).toFixed(1),
    })),
    allocationSuggestions,
    portfolioMetrics: {
      expectedReturn: +(portfolio.expectedReturn * 100).toFixed(2),
      volatility: +(portfolio.volatility * 100).toFixed(2),
      sharpeRatio: +portfolio.sharpe.toFixed(3),
    },
    simulation,
    goalAnalysis,
    retirement,
    peerBenchmark,
    nudges,
    assumptions: {
      salaryHikeMonth,
      salaryHikePercent,
      stepUpRate,
      inflationRate: INFLATION_RATE * 100,
      discretionaryRate: discretionaryRate * 100,
    },
    storyChapters: [
      {
        id: 'earning',
        title: 'Your monthly income runway',
        subtitle: `Net monthly income is Rs ${monthlyTakeHome.toLocaleString('en-IN')}.`,
        value: monthlyTakeHome,
        emoji: 'Income',
        color: '#0f766e',
      },
      {
        id: 'spending',
        title: 'Fixed obligations first',
        subtitle: `Essentials commit Rs ${totalExpenses.toLocaleString('en-IN')} every month.`,
        value: totalExpenses,
        emoji: 'Spend',
        color: '#b45309',
      },
      {
        id: 'surplus',
        title: 'This is the fuel for your goals',
        subtitle: investableSurplus > 0
          ? `About Rs ${investableSurplus.toLocaleString('en-IN')} a month can be invested after goals and lifestyle spend.`
          : 'Your current plan is tight. Closing the expense gap is the first move.',
        value: investableSurplus,
        emoji: 'Surplus',
        color: '#1d4ed8',
      },
      {
        id: 'allocation',
        title: 'Allocation built around timeline and risk',
        subtitle: `${riskProfile} profile with a ${portfolio.sharpe.toFixed(2)} Sharpe ratio.`,
        value: null,
        emoji: 'Allocation',
        color: '#065f46',
        breakdown: allocationSuggestions.map((item) => ({
          name: item.vehicle,
          weight: item.percent,
          monthlyAmount: item.monthlyAmount,
          expectedReturn: item.bucket === 'Emergency Fund' ? 6.5 : item.bucket === 'Short-Term Goals' ? 7 : 12,
        })),
      },
      {
        id: 'projection',
        title: 'Ten-year projection',
        subtitle: `The median 10-year wealth path reaches Rs ${simulation.summary.median.toLocaleString('en-IN')}.`,
        value: simulation.summary.median,
        emoji: 'Projection',
        color: '#1e40af',
        simulation: simulation.summary,
      },
      {
        id: 'retirement',
        title: 'Long-range compounding',
        subtitle: `Inflation-adjusted retirement value is about Rs ${retirement.inflationAdjusted.toLocaleString('en-IN')}.`,
        value: retirement.projectedWealth,
        emoji: 'Retirement',
        color: '#9a3412',
      },
    ],
  };
}
