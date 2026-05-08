/**
 * Quant Engine API Routes
 * 
 * Exposes the quantitative financial models as REST endpoints.
 * Used by the frontend to generate personalized financial plans.
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getDb } from '../db.js';
import { generateFinancialPlan, monteCarloSimulation, goalSIP, calculateMonthlyTakeHomeFromProfile } from '../services/quantEngine.js';
import crypto from 'crypto';

const router = express.Router();

router.use(authenticateToken);

async function buildPeerBenchmark(db, user, monthlyTakeHome) {
  const cohortUsers = await db.all(
    `SELECT Users.id, Users.city, Income.monthlyTakeHome
     FROM Users
     LEFT JOIN Income ON Income.userId = Users.id
     WHERE Income.monthlyTakeHome > 0 AND (Users.city = ? OR ? = '')`,
    [user.city || '', user.city || '']
  );

  const users = cohortUsers.length > 0
    ? cohortUsers
    : await db.all(
        `SELECT Users.id, Users.city, Income.monthlyTakeHome
         FROM Users
         LEFT JOIN Income ON Income.userId = Users.id
         WHERE Income.monthlyTakeHome > 0`
      );

  const savingsRates = [];
  for (const cohortUser of users) {
    const expenses = await db.get('SELECT COALESCE(SUM(amount), 0) AS total FROM Expenses WHERE userId = ?', [cohortUser.id]);
    const goals = await db.all('SELECT targetAmount, monthsToAchieve, savedAmount FROM Goals WHERE userId = ?', [cohortUser.id]);
    const goalFunding = goals.reduce((sum, goal) => {
      const remaining = Math.max(0, (goal.targetAmount || 0) - (goal.savedAmount || 0));
      return sum + Math.round(remaining / Math.max(1, goal.monthsToAchieve || 1));
    }, 0);
    const takeHome = cohortUser.monthlyTakeHome || 0;
    if (takeHome <= 0) continue;
    const rate = ((takeHome - (expenses?.total || 0) - goalFunding) / takeHome) * 100;
    savingsRates.push(rate);
  }

  const peerSavingsRate = savingsRates.length
    ? Number((savingsRates.reduce((sum, value) => sum + value, 0) / savingsRates.length).toFixed(1))
    : 0;

  const currentUserExpenses = await db.get('SELECT COALESCE(SUM(amount), 0) AS total FROM Expenses WHERE userId = ?', [user.id]);
  const currentUserGoals = await db.all('SELECT targetAmount, monthsToAchieve, savedAmount FROM Goals WHERE userId = ?', [user.id]);
  const currentUserGoalFunding = currentUserGoals.reduce((sum, goal) => {
    const remaining = Math.max(0, (goal.targetAmount || 0) - (goal.savedAmount || 0));
    return sum + Math.round(remaining / Math.max(1, goal.monthsToAchieve || 1));
  }, 0);
  const userSavingsRate = monthlyTakeHome > 0
    ? Number((((monthlyTakeHome - (currentUserExpenses?.total || 0) - currentUserGoalFunding) / monthlyTakeHome) * 100).toFixed(1))
    : 0;

  return {
    city: user.city || 'all users',
    userSavingsRate,
    peerSavingsRate,
    delta: Number((userSavingsRate - peerSavingsRate).toFixed(1)),
  };
}


// ── POST /api/quant/plan — Generate Full Financial Plan ───────────
router.post('/plan', async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.id;

    // Fetch user data from DB
    const user = await db.get('SELECT * FROM Users WHERE id = ?', [userId]);
    const income = await db.get('SELECT * FROM Income WHERE userId = ?', [userId]) || { annualCTC: 0, monthlyTakeHome: 0, salaryMode: 'CTC' };
    const expenses = await db.all('SELECT * FROM Expenses WHERE userId = ?', [userId]);
    const goals = await db.all('SELECT * FROM Goals WHERE userId = ?', [userId]);
    const taxProfile = await db.get('SELECT * FROM TaxProfiles WHERE userId = ?', [userId]) || { regime: 'New' };
    const variableCashFlows = await db.all('SELECT * FROM VariableCashFlows WHERE userId = ?', [userId]);

    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

    const stepUpRate = req.body.stepUpRate ?? 10;
    const salaryHikeMonth = req.body.salaryHikeMonth ?? 6;
    const salaryHikePercent = req.body.salaryHikePercent ?? 10;
    const monthlyTakeHome = income.monthlyTakeHome || calculateMonthlyTakeHomeFromProfile(income.annualCTC, taxProfile, income.salaryMode);

    const plan = generateFinancialPlan({
      monthlyTakeHome,
      annualIncome: income.annualCTC,
      totalExpenses,
      expenses,
      goals,
      riskProfile: user.riskProfile || 'Balanced',
      age: user.age || 25,
      city: user.city || '',
      taxProfile,
      variableCashFlows,
      stepUpRate,
      salaryHikeMonth,
      salaryHikePercent,
    });
    plan.peerBenchmark = await buildPeerBenchmark(db, user, monthlyTakeHome);
    plan.nudges = Array.from(new Set([
      ...plan.nudges.filter((nudge) => !nudge.toLowerCase().includes('peer benchmark')),
      plan.peerBenchmark.delta < 0
        ? `Your savings rate trails similar users by ${Math.abs(plan.peerBenchmark.delta).toFixed(1)} percentage points. Try protecting the emergency bucket before raising discretionary spend.`
        : `Your savings rate is ahead of the current user cohort by ${plan.peerBenchmark.delta.toFixed(1)} percentage points.`,
    ]));

    // Store the plan in DB
    const planId = crypto.randomUUID();
    await db.run(
      `INSERT OR REPLACE INTO UserAllocations (id, userId, generatedAt, riskScore, sharpeRatio, allocations, projections)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        planId,
        userId,
        plan.generatedAt,
        plan.portfolioMetrics.expectedReturn,
        plan.portfolioMetrics.sharpeRatio,
        JSON.stringify(plan.allocation),
        JSON.stringify(plan.simulation),
      ]
    );

    res.json({ status: 'success', plan });
  } catch (err) {
    console.error('Quant plan error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to generate plan' });
  }
});


// ── GET /api/quant/plan — Retrieve Latest Plan ────────────────────
router.get('/plan', async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.user.id;

    const latestPlan = await db.get(
      'SELECT * FROM UserAllocations WHERE userId = ? ORDER BY generatedAt DESC LIMIT 1',
      [userId]
    );

    if (!latestPlan) {
      return res.status(404).json({ status: 'error', message: 'No plan generated yet' });
    }

    res.json({
      status: 'success',
      plan: {
        id: latestPlan.id,
        generatedAt: latestPlan.generatedAt,
        riskScore: latestPlan.riskScore,
        sharpeRatio: latestPlan.sharpeRatio,
        allocation: JSON.parse(latestPlan.allocations),
        simulation: JSON.parse(latestPlan.projections),
      },
    });
  } catch (err) {
    console.error('Get plan error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve plan' });
  }
});


// ── POST /api/quant/simulate — Run Monte Carlo Simulation ─────────
router.post('/simulate', async (req, res) => {
  try {
    const { monthlySIP, allocation, years = 10, stepUpRate = 10 } = req.body;

    if (!monthlySIP || !allocation) {
      return res.status(400).json({ status: 'error', message: 'monthlySIP and allocation are required' });
    }

    const result = monteCarloSimulation(monthlySIP, allocation, years, 1000, stepUpRate / 100);
    res.json({ status: 'success', simulation: result });
  } catch (err) {
    console.error('Simulation error:', err);
    res.status(500).json({ status: 'error', message: 'Simulation failed' });
  }
});


// ── POST /api/quant/goal-sip — Calculate SIP for a Goal ───────────
router.post('/goal-sip', async (req, res) => {
  try {
    const { targetAmount, months, annualRate = 0.12 } = req.body;

    if (!targetAmount || !months) {
      return res.status(400).json({ status: 'error', message: 'targetAmount and months are required' });
    }

    const result = goalSIP(targetAmount, months, annualRate);
    res.json({ status: 'success', ...result });
  } catch (err) {
    console.error('Goal SIP error:', err);
    res.status(500).json({ status: 'error', message: 'Goal SIP calculation failed' });
  }
});


export default router;
