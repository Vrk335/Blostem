export interface UserProfile {
  name: string;
  age: number;
  city: string;
}

export interface Income {
  annualCTC: number;
  monthlyTakeHome: number; // calculated or explicitly provided
  salaryMode: 'CTC' | 'InHand';
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: 'Housing' | 'Utilities' | 'EMI' | 'Food' | 'Transport' | 'Subscription' | 'Family' | 'Other';
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  monthsToAchieve: number;
  icon: string;
  savedAmount: number;
}

export type RiskProfile = 'Conservative' | 'Moderate' | 'Balanced' | 'Aggressive';
export type TaxRegime = 'Old' | 'New';

export interface TaxProfile {
  regime: TaxRegime;
  section80C: number;
  section80D: number;
  annualRent: number;
  basicSalary: number;
  hraReceived: number;
  isMetro: boolean;
}

export interface VariableCashFlow {
  id: string;
  month: number;
  name: string;
  amount: number;
  type: 'income' | 'expense';
}

export interface FinancialData {
  profile: UserProfile;
  income: Income;
  expenses: Expense[];
  goals: Goal[];
  taxProfile: TaxProfile;
  variableCashFlows: VariableCashFlow[];
  riskProfile: RiskProfile;
  isOnboarded: boolean;
}

export const initialData: FinancialData = {
  profile: { name: '', age: 0, city: '' },
  income: { annualCTC: 0, monthlyTakeHome: 0, salaryMode: 'CTC' },
  expenses: [],
  goals: [],
  taxProfile: {
    regime: 'New',
    section80C: 0,
    section80D: 0,
    annualRent: 0,
    basicSalary: 0,
    hraReceived: 0,
    isMetro: false,
  },
  variableCashFlows: [],
  riskProfile: 'Balanced',
  isOnboarded: false,
};
