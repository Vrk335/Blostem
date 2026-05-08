import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-blostem';

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const db = await getDb();
    
    // Check if user exists
    const existingUser = await db.get('SELECT * FROM Users WHERE email = ?', [email]);
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await db.run(
      'INSERT INTO Users (email, password, name, age, city, riskProfile, isOnboarded) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [email, hashedPassword, name || '', 24, '', 'Balanced', 0]
    );

    // Insert default income
    await db.run('INSERT INTO Income (userId, annualCTC, monthlyTakeHome, salaryMode) VALUES (?, ?, ?, ?)', [result.lastID, 0, 0, 'CTC']);
    await db.run(
      'INSERT INTO TaxProfiles (userId, regime, section80C, section80D, annualRent, basicSalary, hraReceived, isMetro) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [result.lastID, 'New', 0, 0, 0, 0, 0, 0]
    );

    // Generate token
    const token = jwt.sign({ id: result.lastID, email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const db = await getDb();
    
    // Find user
    const user = await db.get('SELECT * FROM Users WHERE email = ?', [email]);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
