import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';
import { Area, AreaChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, Cell, BarChart, Bar } from 'recharts';
import { LogOut, Settings, Sun, Moon, TrendingUp, Wallet, Target, Sparkles, ShieldCheck } from 'lucide-react';

interface DashboardProps {
  onOpenStory?: () => void;
}

interface PlanResponse {
  summary: {
    monthlyTakeHome: number;
    totalExpenses: number;
    goalCommitments: number;
    discretionary: number;
    investableSurplus: number;
    riskProfile: string;
  };
  taxComparison: {
    currentRegime: 'Old' | 'New';
    betterRegime: 'Old' | 'New';
    savings: number;
    oldRegime: { tax: number };
    newRegime: { tax: number };
  };
  cashFlowPlan: Array<{
    month: number;
    label: string;
    income: number;
    obligations: number;
    goalFunding: number;
    discretionary: number;
    variableIncome: number;
    variableExpense: number;
    netSurplus: number;
    status: 'Surplus' | 'Deficit';
    lifestyleCreepWarning: boolean;
  }>;
  allocation: Array<{
    name: string;
    bucket: string;
    weight: number;
    monthlyAmount: number;
    expectedReturn: number;
  }>;
  allocationSuggestions: Array<{
    bucket: string;
    vehicle: string;
    percent: number;
    monthlyAmount: number;
    rationale: string;
  }>;
  goalAnalysis: Array<{
    id: string;
    name: string;
    targetAmount: number;
    savedAmount: number;
    monthsToAchieve: number;
    progress: number;
    requiredSIP: number;
    status: 'On track' | 'At risk' | 'Off track';
    recommendation: string;
  }>;
  peerBenchmark: {
    city: string;
    userSavingsRate: number;
    peerSavingsRate: number;
    delta: number;
  };
  nudges: string[];
  simulation: {
    yearlyData: Array<{ year: number; p10: number; p50: number; p90: number }>;
    summary: { median: number; optimistic: number; pessimistic: number };
  };
  retirement: {
    yearsToRetirement: number;
    projectedWealth: number;
    inflationAdjusted: number;
  };
}

const formatCurrencyTooltip = (value: unknown) => `Rs ${Number(value || 0).toLocaleString('en-IN')}`;

const COLORS = ['#0f766e', '#1d4ed8', '#b45309', '#7c3aed'];

const Dashboard: React.FC<DashboardProps> = ({ onOpenStory }) => {
  const { data, updateGoal, logout, resetOnboarding, theme, toggleTheme } = useAppContext();
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [mutualFunds, setMutualFunds] = useState<Array<{ schemeName: string; category: string; nav: number; oneYearReturn: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [planRes, mfRes] = await Promise.all([
          api.quant.generatePlan(10),
          api.markets.mutualFunds(),
        ]);
        setPlan(planRes.plan);
        setMutualFunds((mfRes.data?.schemes || []).slice(0, 6));
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [data]);

  if (loading || !plan) {
    return (
      <div className="container flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div className="card-panel">
          <h3>Building your live plan</h3>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Pulling your saved data, tax view, and market suggestions together.</p>
        </div>
      </div>
    );
  }

  const cashFlowPie = [
    { name: 'Obligations', value: plan.summary.totalExpenses },
    { name: 'Goals', value: plan.summary.goalCommitments },
    { name: 'Discretionary', value: plan.summary.discretionary },
    { name: 'Investable', value: Math.max(0, plan.summary.investableSurplus) },
  ].filter((item) => item.value > 0);

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 1rem 4rem' }}>
      <header className="flex justify-between items-center" style={{ marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="text-gradient">Hi {data.profile.name || 'there'}</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Your first-year finance cockpit is now driven by saved profile data and live market feeds.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleTheme} className="btn-secondary" style={{ padding: '0.5rem' }}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
          <button onClick={resetOnboarding} className="btn-secondary" style={{ padding: '0.5rem' }}><Settings size={18} /></button>
          <button onClick={logout} className="btn-secondary" style={{ padding: '0.5rem', color: 'var(--accent-danger)' }}><LogOut size={18} /></button>
        </div>
      </header>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card-panel">
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Take-home</p>
          <h3 style={{ margin: 0 }}>Rs {plan.summary.monthlyTakeHome.toLocaleString('en-IN')}</h3>
        </div>
        <div className="card-panel">
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Investable surplus</p>
          <h3 style={{ margin: 0, color: plan.summary.investableSurplus >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
            Rs {plan.summary.investableSurplus.toLocaleString('en-IN')}
          </h3>
        </div>
        <div className="card-panel">
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Better tax regime</p>
          <h3 style={{ margin: 0 }}>{plan.taxComparison.betterRegime}</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0 }}>Annual gap: Rs {plan.taxComparison.savings.toLocaleString('en-IN')}</p>
        </div>
        <div className="card-panel">
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Peer benchmark</p>
          <h3 style={{ margin: 0 }}>{plan.peerBenchmark.userSavingsRate}%</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0 }}>Peers in {plan.peerBenchmark.city}: {plan.peerBenchmark.peerSavingsRate}%</p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'stretch', marginBottom: '1.5rem' }}>
        <div className="card-panel">
          <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>12-month cash flow</h3>
            {onOpenStory && <button className="btn-primary" onClick={onOpenStory}><Sparkles size={16} /> Story mode</button>}
          </div>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={plan.cashFlowPlan}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="label" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }}
                  formatter={formatCurrencyTooltip}
                />
                <Legend />
                <Bar dataKey="income" fill="#0f766e" name="Income" />
                <Bar dataKey="netSurplus" fill="#1d4ed8" name="Net Surplus" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2" style={{ marginTop: '1rem' }}>
            {plan.cashFlowPlan.map((month) => (
              <div key={month.month} className="flex justify-between items-center" style={{ padding: '0.65rem 0.85rem', background: 'var(--card-hover)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <strong>{month.label}</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.6rem' }}>{month.status}</span>
                  {month.lifestyleCreepWarning && <span style={{ color: 'var(--accent-warning)', marginLeft: '0.6rem' }}>Lifestyle creep</span>}
                </div>
                <span style={{ color: month.netSurplus >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                  Rs {month.netSurplus.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-panel">
          <h3 style={{ marginTop: 0 }}>Monthly money mix</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={cashFlowPie} dataKey="value" nameKey="name" innerRadius={56} outerRadius={86} paddingAngle={4}>
                  {cashFlowPie.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }}
                  formatter={formatCurrencyTooltip}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card-panel" style={{ background: 'var(--card-hover)' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Tax regime check</p>
            <p style={{ marginTop: 0 }}>Current: {plan.taxComparison.currentRegime} · Better today: {plan.taxComparison.betterRegime}</p>
            <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>
              Old tax: Rs {plan.taxComparison.oldRegime.tax.toLocaleString('en-IN')} · New tax: Rs {plan.taxComparison.newRegime.tax.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card-panel">
          <h3 style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: 0 }}><Target size={18} /> Goal tracker</h3>
          <div className="flex flex-col gap-3">
            {plan.goalAnalysis.map((goal) => (
              <div key={goal.id} style={{ padding: '0.85rem', background: 'var(--card-hover)', borderRadius: 'var(--radius-sm)' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                  <strong>{goal.name}</strong>
                  <span style={{ color: goal.status === 'On track' ? 'var(--accent-success)' : goal.status === 'At risk' ? 'var(--accent-warning)' : 'var(--accent-danger)' }}>
                    {goal.status}
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--card-border)', borderRadius: '999px', marginBottom: '0.75rem' }}>
                  <div style={{ width: `${Math.min(100, goal.progress)}%`, height: '100%', background: '#0f766e', borderRadius: '999px' }} />
                </div>
                <p style={{ color: 'var(--text-muted)', marginTop: 0 }}>
                  Rs {goal.savedAmount.toLocaleString('en-IN')} saved of Rs {goal.targetAmount.toLocaleString('en-IN')} · Needs Rs {goal.requiredSIP.toLocaleString('en-IN')}/month
                </p>
                <div className="flex gap-2">
                  <input
                    className="flat-input"
                    type="number"
                    value={goal.savedAmount}
                    onChange={(e) => updateGoal(goal.id, { savedAmount: Number(e.target.value) || 0 })}
                    style={{ maxWidth: '160px' }}
                  />
                  <span style={{ color: 'var(--text-muted)', alignSelf: 'center' }}>Current saved amount</span>
                </div>
                <p style={{ marginBottom: 0 }}>{goal.recommendation}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card-panel">
          <h3 style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: 0 }}><ShieldCheck size={18} /> Nudges and benchmarks</h3>
          <div className="flex flex-col gap-3">
            {plan.nudges.map((nudge, index) => (
              <div key={index} style={{ padding: '0.9rem', background: 'var(--card-hover)', borderRadius: 'var(--radius-sm)' }}>
                {nudge}
              </div>
            ))}
            <div style={{ padding: '0.9rem', background: 'var(--card-hover)', borderRadius: 'var(--radius-sm)' }}>
              Savings rate delta vs peer group: {plan.peerBenchmark.delta >= 0 ? '+' : ''}{plan.peerBenchmark.delta} percentage points
            </div>
            <div style={{ padding: '0.9rem', background: 'var(--card-hover)', borderRadius: 'var(--radius-sm)' }}>
              Retirement projection in {plan.retirement.yearsToRetirement} years: Rs {plan.retirement.projectedWealth.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card-panel">
          <h3 style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: 0 }}><TrendingUp size={18} /> Allocation suggestions</h3>
          <div className="flex flex-col gap-3">
            {plan.allocationSuggestions.map((item) => (
              <div key={item.bucket} style={{ padding: '0.9rem', background: 'var(--card-hover)', borderRadius: 'var(--radius-sm)' }}>
                <div className="flex justify-between items-center">
                  <strong>{item.bucket}</strong>
                  <span>{item.percent}%</span>
                </div>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '0.5rem' }}>{item.vehicle}</p>
                <p style={{ marginTop: 0, marginBottom: '0.4rem' }}>Rs {item.monthlyAmount.toLocaleString('en-IN')} / month</p>
                <p style={{ marginBottom: 0 }}>{item.rationale}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card-panel">
          <h3 style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: 0 }}><Wallet size={18} /> Live mutual fund watchlist</h3>
          <div className="flex flex-col gap-3" style={{ marginBottom: '1rem' }}>
            {mutualFunds.map((scheme) => (
              <div key={scheme.schemeName} style={{ padding: '0.9rem', background: 'var(--card-hover)', borderRadius: 'var(--radius-sm)' }}>
                <div className="flex justify-between items-center">
                  <strong>{scheme.schemeName}</strong>
                  <span>Rs {scheme.nav.toFixed(2)}</span>
                </div>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.45rem', marginBottom: 0 }}>{scheme.category} · 1Y {scheme.oneYearReturn >= 0 ? '+' : ''}{scheme.oneYearReturn}%</p>
              </div>
            ))}
          </div>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={plan.simulation.yearlyData}>
                <defs>
                  <linearGradient id="medianFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="year" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" tickFormatter={(value) => `${Math.round(value / 100000)}L`} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }}
                  formatter={formatCurrencyTooltip}
                />
                <Legend />
                <Area type="monotone" dataKey="p50" stroke="#1d4ed8" fill="url(#medianFill)" name="Median wealth path" />
                <Area type="monotone" dataKey="p90" stroke="#0f766e" fill="transparent" name="Optimistic" />
                <Area type="monotone" dataKey="p10" stroke="#b45309" fill="transparent" name="Defensive" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
