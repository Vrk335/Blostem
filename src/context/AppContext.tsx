import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { FinancialData, Expense, Goal, RiskProfile, TaxProfile, VariableCashFlow } from '../types';
import { initialData } from '../types';
import { calculateMonthlyTakeHome } from '../utils/taxCalculator';
import { api, getAuthToken } from '../services/api';

interface AppContextType {
  data: FinancialData;
  updateProfile: (profile: Partial<FinancialData['profile']>) => void;
  updateIncome: (income: Partial<FinancialData['income']>) => void;
  updateTaxProfile: (taxProfile: TaxProfile) => void;
  addExpense: (expense: Expense) => void;
  removeExpense: (id: string) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  addGoal: (goal: Goal) => void;
  removeGoal: (id: string) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  addVariableCashFlow: (cashFlow: VariableCashFlow) => void;
  updateVariableCashFlow: (id: string, updates: Partial<VariableCashFlow>) => void;
  removeVariableCashFlow: (id: string) => void;
  updateRiskProfile: (rp: RiskProfile) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<FinancialData>(initialData);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getAuthToken());
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Fetch initial data on mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      api.get('/data').then((fetchedData) => {
        setData(fetchedData);
      }).catch(err => {
        console.error('Failed to fetch user data', err);
        if (err.message === 'Token invalid') {
          logout();
        }
      });
    }
  }, [isAuthenticated]);

  // Update data-theme on body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const updateProfile = async (profileUpdate: Partial<FinancialData['profile']>) => {
    try {
      await api.put('/data/profile', profileUpdate);
      setData(prev => ({ ...prev, profile: { ...prev.profile, ...profileUpdate } }));
    } catch (err) { console.error(err); }
  };

  const updateIncome = async (incomeUpdate: Partial<FinancialData['income']>) => {
    const nextIncome = { ...data.income, ...incomeUpdate };
    const monthlyTakeHome = incomeUpdate.monthlyTakeHome !== undefined && nextIncome.salaryMode === 'InHand'
      ? nextIncome.monthlyTakeHome
      : calculateMonthlyTakeHome(nextIncome.annualCTC, data.taxProfile, nextIncome.salaryMode);

    try {
      await api.put('/data/income', { ...nextIncome, monthlyTakeHome });
      setData(prev => ({
        ...prev,
        income: { ...nextIncome, monthlyTakeHome }
      }));
    } catch (err) { console.error(err); }
  };

  const updateTaxProfile = async (taxProfile: TaxProfile) => {
    try {
      await api.put('/data/tax-profile', taxProfile);
      setData(prev => {
        const monthlyTakeHome = calculateMonthlyTakeHome(prev.income.annualCTC, taxProfile, prev.income.salaryMode);
        return {
          ...prev,
          taxProfile,
          income: {
            ...prev.income,
            monthlyTakeHome,
          },
        };
      });
    } catch (err) { console.error(err); }
  };

  const addExpense = async (expense: Expense) => {
    try {
      const res = await api.post('/data/expenses', expense);
      const newExpense = { ...expense, id: res.id || expense.id };
      setData(prev => ({ ...prev, expenses: [...prev.expenses, newExpense] }));
    } catch (err) { console.error(err); }
  };

  const removeExpense = async (id: string) => {
    try {
      await api.delete(`/data/expenses/${id}`);
      setData(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
    } catch (err) { console.error(err); }
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    try {
      await api.put(`/data/expenses/${id}`, updates);
      setData(prev => ({
        ...prev,
        expenses: prev.expenses.map(e => (e.id === id ? { ...e, ...updates } : e))
      }));
    } catch (err) { console.error(err); }
  };

  const addGoal = async (goal: Goal) => {
    try {
      const res = await api.post('/data/goals', goal);
      const newGoal = { ...goal, id: res.id || goal.id };
      setData(prev => ({ ...prev, goals: [...prev.goals, newGoal] }));
    } catch (err) { console.error(err); }
  };

  const removeGoal = async (id: string) => {
    try {
      await api.delete(`/data/goals/${id}`);
      setData(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== id) }));
    } catch (err) { console.error(err); }
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    try {
      await api.put(`/data/goals/${id}`, updates);
      setData(prev => ({
        ...prev,
        goals: prev.goals.map(g => (g.id === id ? { ...g, ...updates } : g))
      }));
    } catch (err) { console.error(err); }
  }

  const addVariableCashFlow = async (cashFlow: VariableCashFlow) => {
    try {
      const res = await api.post('/data/cash-flows', cashFlow);
      const newCashFlow = { ...cashFlow, id: res.id || cashFlow.id };
      setData(prev => ({ ...prev, variableCashFlows: [...prev.variableCashFlows, newCashFlow] }));
    } catch (err) { console.error(err); }
  };

  const updateVariableCashFlow = async (id: string, updates: Partial<VariableCashFlow>) => {
    try {
      await api.put(`/data/cash-flows/${id}`, updates);
      setData(prev => ({
        ...prev,
        variableCashFlows: prev.variableCashFlows.map(item => item.id === id ? { ...item, ...updates } : item)
      }));
    } catch (err) { console.error(err); }
  };

  const removeVariableCashFlow = async (id: string) => {
    try {
      await api.delete(`/data/cash-flows/${id}`);
      setData(prev => ({ ...prev, variableCashFlows: prev.variableCashFlows.filter(item => item.id !== id) }));
    } catch (err) { console.error(err); }
  };

  const updateRiskProfile = async (rp: RiskProfile) => {
    try {
      await api.put('/data/risk-profile', { riskProfile: rp });
      setData(prev => ({ ...prev, riskProfile: rp }));
    } catch (err) { console.error(err); }
  }

  const completeOnboarding = async () => {
    try {
      await api.put('/data/onboarding', { isOnboarded: true });
      setData(prev => ({ ...prev, isOnboarded: true }));
    } catch (err) { console.error(err); }
  };

  const resetOnboarding = () => {
    setData(initialData);
  }

  const login = () => setIsAuthenticated(true);
  const logout = () => {
    localStorage.removeItem('blostem_token');
    setIsAuthenticated(false);
    setData(initialData); // Optional: clear data on logout
  };

  return (
    <AppContext.Provider value={{
      data, updateProfile, updateIncome, addExpense, removeExpense, updateExpense,
      updateTaxProfile, addGoal, removeGoal, updateGoal, addVariableCashFlow, updateVariableCashFlow,
      removeVariableCashFlow, updateRiskProfile, completeOnboarding, resetOnboarding,
      isAuthenticated, login, logout, theme, toggleTheme
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
