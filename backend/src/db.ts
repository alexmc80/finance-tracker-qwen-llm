import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/finance.db');

// Создаем директорию если не существует
const dbDir = path.dirname(dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

export function initDatabase() {
  // Включаем поддержку внешних ключей
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS [Owner] (
      Id TEXT PRIMARY KEY,
      Name TEXT NOT NULL,
      PinCode TEXT DEFAULT NULL,
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS [Account] (
      Id TEXT PRIMARY KEY,
      OwnerId TEXT NOT NULL,
      Name TEXT NOT NULL,
      Currency TEXT DEFAULT 'RUB',
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (OwnerId) REFERENCES [Owner](Id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS [Category] (
      Id TEXT PRIMARY KEY,
      OwnerId TEXT NOT NULL,
      Name TEXT NOT NULL,
      Type INTEGER NOT NULL,
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (OwnerId) REFERENCES [Owner](Id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS [Transaction] (
      Id TEXT PRIMARY KEY,
      OwnerId TEXT NOT NULL,
      AccountId TEXT NOT NULL,
      CategoryId TEXT NOT NULL,
      Amount REAL NOT NULL,
      Type INTEGER NOT NULL,
      Date TEXT NOT NULL,
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (OwnerId) REFERENCES [Owner](Id) ON DELETE CASCADE,
      FOREIGN KEY (AccountId) REFERENCES [Account](Id) ON DELETE CASCADE,
      FOREIGN KEY (CategoryId) REFERENCES [Category](Id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_transaction_owner ON [Transaction](OwnerId);
    CREATE INDEX IF NOT EXISTS idx_transaction_date ON [Transaction](Date);
    CREATE INDEX IF NOT EXISTS idx_account_owner ON [Account](OwnerId);
    CREATE INDEX IF NOT EXISTS idx_category_owner ON [Category](OwnerId);
  `);

  // Создаем владельца admin по умолчанию если не существует
  const adminCheck = db.prepare('SELECT Id FROM [Owner] WHERE Name = ?').get('admin');
  if (!adminCheck) {
    const adminId = generateId();
    db.prepare('INSERT INTO [Owner] (Id, Name, PinCode) VALUES (?, ?, ?)').run(adminId, 'admin', '1111');
  }
}

export function generateId(): string {
  return uuidv4();
}
