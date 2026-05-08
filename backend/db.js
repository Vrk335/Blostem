import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'database.sqlite');

let dbPromise;

export async function getDb() {
  if (!dbPromise) {
    dbPromise = open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  }
  return dbPromise;
}

export async function initDb() {
  const db = await getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      name TEXT,
      age INTEGER,
      city TEXT DEFAULT '',
      riskProfile TEXT DEFAULT 'Balanced',
      isOnboarded BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS Income (
      userId INTEGER PRIMARY KEY,
      annualCTC INTEGER,
      monthlyTakeHome INTEGER,
      salaryMode TEXT DEFAULT 'CTC',
      FOREIGN KEY(userId) REFERENCES Users(id)
    );

    CREATE TABLE IF NOT EXISTS Expenses (
      id TEXT PRIMARY KEY,
      userId INTEGER,
      name TEXT,
      amount INTEGER,
      category TEXT,
      FOREIGN KEY(userId) REFERENCES Users(id)
    );

    CREATE TABLE IF NOT EXISTS Goals (
      id TEXT PRIMARY KEY,
      userId INTEGER,
      name TEXT,
      targetAmount INTEGER,
      monthsToAchieve INTEGER,
      icon TEXT,
      savedAmount INTEGER DEFAULT 0,
      FOREIGN KEY(userId) REFERENCES Users(id)
    );

    CREATE TABLE IF NOT EXISTS TaxProfiles (
      userId INTEGER PRIMARY KEY,
      regime TEXT DEFAULT 'New',
      section80C INTEGER DEFAULT 0,
      section80D INTEGER DEFAULT 0,
      annualRent INTEGER DEFAULT 0,
      basicSalary INTEGER DEFAULT 0,
      hraReceived INTEGER DEFAULT 0,
      isMetro BOOLEAN DEFAULT 0,
      FOREIGN KEY(userId) REFERENCES Users(id)
    );

    CREATE TABLE IF NOT EXISTS VariableCashFlows (
      id TEXT PRIMARY KEY,
      userId INTEGER,
      month INTEGER,
      name TEXT,
      amount INTEGER,
      type TEXT,
      FOREIGN KEY(userId) REFERENCES Users(id)
    );

    CREATE TABLE IF NOT EXISTS UserPortfolio (
      id TEXT PRIMARY KEY,
      userId INTEGER,
      assetClass TEXT,
      symbol TEXT,
      name TEXT,
      units REAL,
      avgBuyPrice REAL,
      currentValue REAL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(userId) REFERENCES Users(id)
    );

    CREATE TABLE IF NOT EXISTS UserAllocations (
      id TEXT PRIMARY KEY,
      userId INTEGER,
      generatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      riskScore REAL,
      sharpeRatio REAL,
      allocations TEXT,
      projections TEXT,
      FOREIGN KEY(userId) REFERENCES Users(id)
    );

    CREATE TABLE IF NOT EXISTS MarketCache (
      cacheKey TEXT PRIMARY KEY,
      data TEXT,
      expiresAt INTEGER
    );
  `);

  await ensureColumn(db, 'Users', 'city', "TEXT DEFAULT ''");
  await ensureColumn(db, 'Income', 'salaryMode', "TEXT DEFAULT 'CTC'");
  await ensureColumn(db, 'Goals', 'savedAmount', 'INTEGER DEFAULT 0');
  console.log('Database initialized.');
}

async function ensureColumn(db, tableName, columnName, definition) {
  const columns = await db.all(`PRAGMA table_info(${tableName})`);
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}
