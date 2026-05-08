import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ArrowRight, ArrowLeft, Plus, Trash2, CheckCircle } from 'lucide-react';
import type { Expense, VariableCashFlow } from '../types';
import { calculateTaxComparison } from '../utils/taxCalculator';

const expenseCategories: Expense['category'][] = ['Housing', 'Utilities', 'EMI', 'Food', 'Transport', 'Subscription', 'Family', 'Other'];

const Onboarding: React.FC = () => {
  const {
    data,
    updateProfile,
    updateIncome,
    updateTaxProfile,
    addExpense,
    removeExpense,
    addGoal,
    removeGoal,
    addVariableCashFlow,
    removeVariableCashFlow,
    updateRiskProfile,
    completeOnboarding,
  } = useAppContext();

  const [step, setStep] = useState(1);
  const [tempExpense, setTempExpense] = useState<{ name: string; amount: string; category: Expense['category'] }>({
    name: '',
    amount: '',
    category: 'Other',
  });
  const [tempGoal, setTempGoal] = useState({ name: '', targetAmount: '', monthsToAchieve: '12', savedAmount: '0' });
  const [tempCashFlow, setTempCashFlow] = useState<{ month: string; name: string; amount: string; type: VariableCashFlow['type'] }>({
    month: '6',
    name: '',
    amount: '',
    type: 'income',
  });

  const taxComparison = calculateTaxComparison(data.income.annualCTC, data.taxProfile);

  const handleAddExpense = () => {
    if (!tempExpense.name || !tempExpense.amount) return;
    addExpense({
      id: crypto.randomUUID(),
      name: tempExpense.name,
      amount: Number(tempExpense.amount),
      category: tempExpense.category,
    });
    setTempExpense({ name: '', amount: '', category: 'Other' });
  };

  const handleAddGoal = () => {
    if (!tempGoal.name || !tempGoal.targetAmount) return;
    addGoal({
      id: crypto.randomUUID(),
      name: tempGoal.name,
      targetAmount: Number(tempGoal.targetAmount),
      monthsToAchieve: Number(tempGoal.monthsToAchieve),
      savedAmount: Number(tempGoal.savedAmount),
      icon: 'Target',
    });
    setTempGoal({ name: '', targetAmount: '', monthsToAchieve: '12', savedAmount: '0' });
  };

  const handleAddCashFlow = () => {
    if (!tempCashFlow.name || !tempCashFlow.amount) return;
    addVariableCashFlow({
      id: crypto.randomUUID(),
      month: Number(tempCashFlow.month),
      name: tempCashFlow.name,
      amount: Number(tempCashFlow.amount),
      type: tempCashFlow.type,
    });
    setTempCashFlow({ month: '6', name: '', amount: '', type: 'income' });
  };

  return (
    <div className="container flex items-center justify-center" style={{ minHeight: '100vh' }}>
      <div className="card-panel animate-fade-in" style={{ width: '100%', maxWidth: '760px' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h2 className="text-gradient">Set up your first-year money plan</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Step {step} of 6</p>
          </div>
          <div style={{ minWidth: '120px', textAlign: 'right', color: 'var(--text-muted)' }}>
            {Math.round((step / 6) * 100)}%
          </div>
        </div>

        <div style={{ width: '100%', height: '6px', background: 'var(--card-border)', borderRadius: '999px', marginBottom: '2rem' }}>
          <div style={{ width: `${(step / 6) * 100}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '999px', transition: 'width 0.25s ease' }} />
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h3>Profile</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Name</label>
                <input className="flat-input" value={data.profile.name} onChange={(e) => updateProfile({ name: e.target.value })} placeholder="Aarav" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Age</label>
                <input className="flat-input" type="number" value={data.profile.age || ''} onChange={(e) => updateProfile({ age: Number(e.target.value) || 0 })} placeholder="24" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>City</label>
                <input className="flat-input" value={data.profile.city} onChange={(e) => updateProfile({ city: e.target.value })} placeholder="Bengaluru" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h3>Income and tax setup</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Salary input type</label>
                <select className="flat-input" value={data.income.salaryMode} onChange={(e) => updateIncome({ salaryMode: e.target.value as 'CTC' | 'InHand' })}>
                  <option value="CTC">Annual CTC</option>
                  <option value="InHand">Monthly in-hand</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                  {data.income.salaryMode === 'CTC' ? 'Annual CTC (Rs)' : 'Monthly in-hand (Rs)'}
                </label>
                <input
                  className="flat-input"
                  type="number"
                  value={data.income.salaryMode === 'CTC' ? data.income.annualCTC || '' : data.income.monthlyTakeHome || ''}
                  onChange={(e) => {
                    const numericValue = Number(e.target.value) || 0;
                    if (data.income.salaryMode === 'CTC') {
                      updateIncome({ annualCTC: numericValue });
                    } else {
                      updateIncome({ annualCTC: numericValue * 12, monthlyTakeHome: numericValue });
                    }
                  }}
                  placeholder={data.income.salaryMode === 'CTC' ? '900000' : '62000'}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Tax regime</label>
                <select
                  className="flat-input"
                  value={data.taxProfile.regime}
                  onChange={(e) => updateTaxProfile({ ...data.taxProfile, regime: e.target.value as 'Old' | 'New' })}
                >
                  <option value="New">New regime</option>
                  <option value="Old">Old regime</option>
                </select>
              </div>
            </div>

            {data.income.salaryMode === 'CTC' && (
              <>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>80C deductions</label>
                    <input className="flat-input" type="number" value={data.taxProfile.section80C || ''} onChange={(e) => updateTaxProfile({ ...data.taxProfile, section80C: Number(e.target.value) || 0 })} placeholder="150000" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>80D deductions</label>
                    <input className="flat-input" type="number" value={data.taxProfile.section80D || ''} onChange={(e) => updateTaxProfile({ ...data.taxProfile, section80D: Number(e.target.value) || 0 })} placeholder="25000" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Annual rent</label>
                    <input className="flat-input" type="number" value={data.taxProfile.annualRent || ''} onChange={(e) => updateTaxProfile({ ...data.taxProfile, annualRent: Number(e.target.value) || 0 })} placeholder="240000" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Annual basic salary</label>
                    <input className="flat-input" type="number" value={data.taxProfile.basicSalary || ''} onChange={(e) => updateTaxProfile({ ...data.taxProfile, basicSalary: Number(e.target.value) || 0 })} placeholder="360000" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Annual HRA received</label>
                    <input className="flat-input" type="number" value={data.taxProfile.hraReceived || ''} onChange={(e) => updateTaxProfile({ ...data.taxProfile, hraReceived: Number(e.target.value) || 0 })} placeholder="180000" />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Metro city</label>
                    <select className="flat-input" value={data.taxProfile.isMetro ? 'yes' : 'no'} onChange={(e) => updateTaxProfile({ ...data.taxProfile, isMetro: e.target.value === 'yes' })}>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                </div>

                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div className="card-panel" style={{ background: 'var(--card-hover)' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Estimated monthly take-home</p>
                    <strong>Rs {data.income.monthlyTakeHome.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="card-panel" style={{ background: 'var(--card-hover)' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Better regime today</p>
                    <strong>{taxComparison.betterRegime}</strong>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0 }}>
                      Difference: Rs {taxComparison.savings.toLocaleString('en-IN')} per year
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h3>Fixed monthly obligations</h3>
            {data.expenses.map((expense) => (
              <div key={expense.id} className="flex justify-between items-center" style={{ padding: '0.75rem 1rem', background: 'var(--card-hover)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <strong>{expense.name}</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{expense.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>Rs {expense.amount.toLocaleString('en-IN')}</span>
                  <button style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }} onClick={() => removeExpense(expense.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            <div className="grid" style={{ gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
              <input className="flat-input" value={tempExpense.name} onChange={(e) => setTempExpense((prev) => ({ ...prev, name: e.target.value }))} placeholder="Rent, EMI, family transfer" />
              <input className="flat-input" type="number" value={tempExpense.amount} onChange={(e) => setTempExpense((prev) => ({ ...prev, amount: e.target.value }))} placeholder="12000" />
              <select className="flat-input" value={tempExpense.category} onChange={(e) => setTempExpense((prev) => ({ ...prev, category: e.target.value as Expense['category'] }))}>
                {expenseCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <button className="btn-secondary" onClick={handleAddExpense}><Plus size={18} /></button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            <h3>Goals and progress</h3>
            {data.goals.map((goal) => (
              <div key={goal.id} className="card-panel" style={{ background: 'var(--card-hover)' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                  <strong>{goal.name}</strong>
                  <button style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }} onClick={() => removeGoal(goal.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Rs {goal.savedAmount.toLocaleString('en-IN')} saved of Rs {goal.targetAmount.toLocaleString('en-IN')} in {goal.monthsToAchieve} months
                </p>
                <div style={{ width: '100%', height: '8px', background: 'var(--card-border)', borderRadius: '999px' }}>
                  <div style={{ width: `${Math.min(100, (goal.savedAmount / Math.max(1, goal.targetAmount)) * 100)}%`, height: '100%', background: 'var(--accent-success)', borderRadius: '999px' }} />
                </div>
              </div>
            ))}
            <div className="grid" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
              <input className="flat-input" value={tempGoal.name} onChange={(e) => setTempGoal((prev) => ({ ...prev, name: e.target.value }))} placeholder="Emergency fund, trip, MBA" />
              <input className="flat-input" type="number" value={tempGoal.targetAmount} onChange={(e) => setTempGoal((prev) => ({ ...prev, targetAmount: e.target.value }))} placeholder="150000" />
              <input className="flat-input" type="number" value={tempGoal.savedAmount} onChange={(e) => setTempGoal((prev) => ({ ...prev, savedAmount: e.target.value }))} placeholder="20000" />
              <input className="flat-input" type="number" value={tempGoal.monthsToAchieve} onChange={(e) => setTempGoal((prev) => ({ ...prev, monthsToAchieve: e.target.value }))} placeholder="12" />
              <button className="btn-secondary" onClick={handleAddGoal}><Plus size={18} /></button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col gap-4">
            <h3>Variable months and salary growth</h3>
            <p style={{ color: 'var(--text-muted)' }}>Add bonus months, festival costs, insurance premiums, or any one-off events that affect cash flow.</p>
            {data.variableCashFlows.map((event) => (
              <div key={event.id} className="flex justify-between items-center" style={{ padding: '0.75rem 1rem', background: 'var(--card-hover)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <strong>{event.name}</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>Month {event.month} · {event.type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>Rs {event.amount.toLocaleString('en-IN')}</span>
                  <button style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }} onClick={() => removeVariableCashFlow(event.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            <div className="grid" style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
              <input className="flat-input" type="number" min="1" max="12" value={tempCashFlow.month} onChange={(e) => setTempCashFlow((prev) => ({ ...prev, month: e.target.value }))} placeholder="6" />
              <input className="flat-input" value={tempCashFlow.name} onChange={(e) => setTempCashFlow((prev) => ({ ...prev, name: e.target.value }))} placeholder="Joining bonus, Diwali trip, insurance premium" />
              <input className="flat-input" type="number" value={tempCashFlow.amount} onChange={(e) => setTempCashFlow((prev) => ({ ...prev, amount: e.target.value }))} placeholder="50000" />
              <select className="flat-input" value={tempCashFlow.type} onChange={(e) => setTempCashFlow((prev) => ({ ...prev, type: e.target.value as VariableCashFlow['type'] }))}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              <button className="btn-secondary" onClick={handleAddCashFlow}><Plus size={18} /></button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="flex flex-col gap-4">
            <h3>Risk profile</h3>
            <p style={{ color: 'var(--text-muted)' }}>Choose how much volatility you are comfortable with for long-term investments.</p>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              {(['Conservative', 'Moderate', 'Balanced', 'Aggressive'] as const).map((profile) => (
                <button
                  key={profile}
                  className="card-panel"
                  onClick={() => updateRiskProfile(profile)}
                  style={{
                    textAlign: 'left',
                    cursor: 'pointer',
                    border: data.riskProfile === profile ? '1px solid var(--accent-primary)' : '1px solid var(--card-border)',
                    background: data.riskProfile === profile ? 'var(--card-hover)' : 'var(--card-bg)',
                  }}
                >
                  <strong>{profile}</strong>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem', marginBottom: 0 }}>
                    {profile === 'Conservative' && 'Stability first, low equity exposure.'}
                    {profile === 'Moderate' && 'Balanced cushion with measured growth.'}
                    {profile === 'Balanced' && 'A steady long-term compounding mix.'}
                    {profile === 'Aggressive' && 'Higher equity for longer-horizon wealth growth.'}
                  </p>
                </button>
              ))}
            </div>
            <div className="card-panel" style={{ background: 'var(--card-hover)' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Ready when you are</p>
              <p style={{ margin: 0 }}>
                The dashboard will generate a 12-month cash flow plan, tax comparison, goal health, risk-based allocation, salary-hike simulation, and nudges from these inputs.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3" style={{ marginTop: '2rem' }}>
          <button className="btn-secondary" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1}>
            <ArrowLeft size={18} /> Back
          </button>
          {step < 6 ? (
            <button className="btn-primary" onClick={() => setStep((current) => Math.min(6, current + 1))} style={{ marginLeft: 'auto' }}>
              Next <ArrowRight size={18} />
            </button>
          ) : (
            <button className="btn-primary" onClick={completeOnboarding} style={{ marginLeft: 'auto' }}>
              Generate Plan <CheckCircle size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
