import { db, generateId } from '../db';
import type { Transaction, TransactionInput } from '../types';

function mapTransaction(row: any): Transaction {
  return {
    id: row.Id,
    ownerId: row.OwnerId,
    accountId: row.AccountId,
    categoryId: row.CategoryId,
    amount: row.Amount,
    type: row.Type,
    date: row.Date,
    createdAt: row.CreatedAt,
  };
}

export const TransactionRepository = {
  findAll(): Transaction[] {
    const stmt = db.prepare('SELECT * FROM [Transaction] ORDER BY Date DESC, CreatedAt DESC');
    return stmt.all().map(mapTransaction) as Transaction[];
  },

  findByOwner(ownerId: string): Transaction[] {
    const stmt = db.prepare('SELECT * FROM [Transaction] WHERE OwnerId = ? ORDER BY Date DESC, CreatedAt DESC');
    return stmt.all(ownerId).map(mapTransaction) as Transaction[];
  },

  findById(id: string): Transaction | undefined {
    const stmt = db.prepare('SELECT * FROM [Transaction] WHERE Id = ?');
    const row = stmt.get(id);
    return row ? mapTransaction(row) : undefined;
  },

  create(input: TransactionInput): Transaction {
    const id = generateId();
    const stmt = db.prepare(`
      INSERT INTO [Transaction] (Id, OwnerId, AccountId, CategoryId, Amount, Type, Date) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, input.ownerId, input.accountId, input.categoryId, input.amount, input.type, input.date);
    return this.findById(id)!;
  },

  update(id: string, input: Partial<TransactionInput>): Transaction | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];
    
    if (input.amount !== undefined) {
      fields.push('Amount = ?');
      values.push(input.amount);
    }
    if (input.type !== undefined) {
      fields.push('Type = ?');
      values.push(input.type);
    }
    if (input.date !== undefined) {
      fields.push('Date = ?');
      values.push(input.date);
    }
    if (input.accountId !== undefined) {
      fields.push('AccountId = ?');
      values.push(input.accountId);
    }
    if (input.categoryId !== undefined) {
      fields.push('CategoryId = ?');
      values.push(input.categoryId);
    }
    if (input.ownerId !== undefined) {
      fields.push('OwnerId = ?');
      values.push(input.ownerId);
    }
    
    if (fields.length === 0) return this.findById(id);
    
    values.push(id);
    const stmt = db.prepare(`UPDATE [Transaction] SET ${fields.join(', ')} WHERE Id = ?`);
    stmt.run(...values);
    return this.findById(id);
  },

  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM [Transaction] WHERE Id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
};
