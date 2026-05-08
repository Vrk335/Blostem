import express from 'express';
import { getDb } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

router.use(authenticateToken);

// Helper to format data
async function fetchFullUserData(userId) {
  const db = await getDb();
  
  const user = await db.get('SELECT name, age, city, riskProfile, isOnboarded FROM Users WHERE id = ?', [userId]);
  const income = await db.get('SELECT annualCTC, monthlyTakeHome, salaryMode FROM Income WHERE userId = ?', [userId]) || { annualCTC: 0, monthlyTakeHome: 0, salaryMode: 'CTC' };
  const expenses = await db.all('SELECT id, name, amount, category FROM Expenses WHERE userId = ?', [userId]);
  const goals = await db.all('SELECT id, name, targetAmount, monthsToAchieve, icon, savedAmount FROM Goals WHERE userId = ?', [userId]);
  const taxProfile = await db.get(
    'SELECT regime, section80C, section80D, annualRent, basicSalary, hraReceived, isMetro FROM TaxProfiles WHERE userId = ?',
    [userId]
  ) || { regime: 'New', section80C: 0, section80D: 0, annualRent: 0, basicSalary: 0, hraReceived: 0, isMetro: 0 };
  const variableCashFlows = await db.all('SELECT id, month, name, amount, type FROM VariableCashFlows WHERE userId = ? ORDER BY month ASC', [userId]);

  return {
    profile: { name: user.name, age: user.age, city: user.city || '' },
    income: { annualCTC: income.annualCTC, monthlyTakeHome: income.monthlyTakeHome, salaryMode: income.salaryMode || 'CTC' },
    expenses,
    goals,
    taxProfile: {
      regime: taxProfile.regime,
      section80C: taxProfile.section80C,
      section80D: taxProfile.section80D,
      annualRent: taxProfile.annualRent,
      basicSalary: taxProfile.basicSalary,
      hraReceived: taxProfile.hraReceived,
      isMetro: !!taxProfile.isMetro,
    },
    variableCashFlows,
    riskProfile: user.riskProfile,
    isOnboarded: !!user.isOnboarded
  };
}

// Get all user data
router.get('/', async (req, res) => {
  try {
    const data = await fetchFullUserData(req.user.id);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Update Profile
router.put('/profile', async (req, res) => {
  try {
    const { name, age, city } = req.body;
    const db = await getDb();
    
    // Dynamically build query based on provided fields
    const updates = [];
    const values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (age !== undefined) { updates.push('age = ?'); values.push(age); }
    if (city !== undefined) { updates.push('city = ?'); values.push(city); }
    
    if (updates.length > 0) {
      values.push(req.user.id);
      await db.run(`UPDATE Users SET ${updates.join(', ')} WHERE id = ?`, values);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update Income
router.put('/income', async (req, res) => {
  try {
    const { annualCTC, monthlyTakeHome, salaryMode } = req.body;
    const db = await getDb();
    await db.run(
      'UPDATE Income SET annualCTC = ?, monthlyTakeHome = ?, salaryMode = ? WHERE userId = ?',
      [annualCTC, monthlyTakeHome, salaryMode || 'CTC', req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update income' });
  }
});

router.put('/tax-profile', async (req, res) => {
  try {
    const {
      regime,
      section80C,
      section80D,
      annualRent,
      basicSalary,
      hraReceived,
      isMetro,
    } = req.body;
    const db = await getDb();
    await db.run(
      `INSERT INTO TaxProfiles (userId, regime, section80C, section80D, annualRent, basicSalary, hraReceived, isMetro)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(userId) DO UPDATE SET
         regime = excluded.regime,
         section80C = excluded.section80C,
         section80D = excluded.section80D,
         annualRent = excluded.annualRent,
         basicSalary = excluded.basicSalary,
         hraReceived = excluded.hraReceived,
         isMetro = excluded.isMetro`,
      [req.user.id, regime, section80C, section80D, annualRent, basicSalary, hraReceived, isMetro ? 1 : 0]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update tax profile' });
  }
});

// Update Risk Profile
router.put('/risk-profile', async (req, res) => {
  try {
    const { riskProfile } = req.body;
    const db = await getDb();
    await db.run('UPDATE Users SET riskProfile = ? WHERE id = ?', [riskProfile, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update risk profile' });
  }
});

// Update Onboarded
router.put('/onboarding', async (req, res) => {
  try {
    const { isOnboarded } = req.body;
    const db = await getDb();
    await db.run('UPDATE Users SET isOnboarded = ? WHERE id = ?', [isOnboarded ? 1 : 0, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

// Add Expense
router.post('/expenses', async (req, res) => {
  try {
    const { id, name, amount, category } = req.body;
    const db = await getDb();
    const expenseId = id || crypto.randomUUID();
    await db.run(
      'INSERT INTO Expenses (id, userId, name, amount, category) VALUES (?, ?, ?, ?, ?)',
      [expenseId, req.user.id, name, amount, category]
    );
    res.status(201).json({ id: expenseId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add expense' });
  }
});

// Update Expense
router.put('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, amount, category } = req.body;
    const db = await getDb();

    const current = await db.get('SELECT * FROM Expenses WHERE id = ? AND userId = ?', [id, req.user.id]);
    if (!current) return res.status(404).json({ error: 'Expense not found' });

    await db.run(
      'UPDATE Expenses SET name = ?, amount = ?, category = ? WHERE id = ? AND userId = ?',
      [
        name !== undefined ? name : current.name,
        amount !== undefined ? amount : current.amount,
        category !== undefined ? category : current.category,
        id,
        req.user.id
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// Delete Expense
router.delete('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    await db.run('DELETE FROM Expenses WHERE id = ? AND userId = ?', [id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// Add Goal
router.post('/goals', async (req, res) => {
  try {
    const { id, name, targetAmount, monthsToAchieve, icon, savedAmount } = req.body;
    const db = await getDb();
    const goalId = id || crypto.randomUUID();
    await db.run(
      'INSERT INTO Goals (id, userId, name, targetAmount, monthsToAchieve, icon, savedAmount) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [goalId, req.user.id, name, targetAmount, monthsToAchieve, icon, savedAmount || 0]
    );
    res.status(201).json({ id: goalId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add goal' });
  }
});

// Update Goal
router.put('/goals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, targetAmount, monthsToAchieve, icon, savedAmount } = req.body;
    const db = await getDb();
    
    // Fetch current goal first to allow partial updates
    const current = await db.get('SELECT * FROM Goals WHERE id = ? AND userId = ?', [id, req.user.id]);
    if (!current) return res.status(404).json({ error: 'Goal not found' });

    await db.run(
      'UPDATE Goals SET name = ?, targetAmount = ?, monthsToAchieve = ?, icon = ?, savedAmount = ? WHERE id = ? AND userId = ?',
      [
        name !== undefined ? name : current.name,
        targetAmount !== undefined ? targetAmount : current.targetAmount,
        monthsToAchieve !== undefined ? monthsToAchieve : current.monthsToAchieve,
        icon !== undefined ? icon : current.icon,
        savedAmount !== undefined ? savedAmount : current.savedAmount,
        id,
        req.user.id
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

router.post('/cash-flows', async (req, res) => {
  try {
    const { id, month, name, amount, type } = req.body;
    const db = await getDb();
    const cashFlowId = id || crypto.randomUUID();
    await db.run(
      'INSERT INTO VariableCashFlows (id, userId, month, name, amount, type) VALUES (?, ?, ?, ?, ?, ?)',
      [cashFlowId, req.user.id, month, name, amount, type]
    );
    res.status(201).json({ id: cashFlowId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add cash flow event' });
  }
});

router.put('/cash-flows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { month, name, amount, type } = req.body;
    const db = await getDb();
    const current = await db.get('SELECT * FROM VariableCashFlows WHERE id = ? AND userId = ?', [id, req.user.id]);
    if (!current) return res.status(404).json({ error: 'Cash flow event not found' });

    await db.run(
      'UPDATE VariableCashFlows SET month = ?, name = ?, amount = ?, type = ? WHERE id = ? AND userId = ?',
      [
        month !== undefined ? month : current.month,
        name !== undefined ? name : current.name,
        amount !== undefined ? amount : current.amount,
        type !== undefined ? type : current.type,
        id,
        req.user.id,
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update cash flow event' });
  }
});

router.delete('/cash-flows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    await db.run('DELETE FROM VariableCashFlows WHERE id = ? AND userId = ?', [id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete cash flow event' });
  }
});

// Delete Goal
router.delete('/goals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    await db.run('DELETE FROM Goals WHERE id = ? AND userId = ?', [id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

export default router;
