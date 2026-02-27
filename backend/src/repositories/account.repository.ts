import { db, generateId } from '../db';
import type { Account, AccountInput } from '../types';

function mapAccount(row: any): Account {
  return {
    id: row.Id,
    ownerId: row.OwnerId,
    name: row.Name,
    currency: row.Currency,
    createdAt: row.CreatedAt,
  };
}

export const AccountRepository = {
  findAll(): Account[] {
    const stmt = db.prepare('SELECT * FROM [Account] ORDER BY Name');
    return stmt.all().map(mapAccount) as Account[];
  },

  findByOwner(ownerId: string): Account[] {
    const stmt = db.prepare('SELECT * FROM [Account] WHERE OwnerId = ? ORDER BY Name');
    return stmt.all(ownerId).map(mapAccount) as Account[];
  },

  findById(id: string): Account | undefined {
    const stmt = db.prepare('SELECT * FROM [Account] WHERE Id = ?');
    const row = stmt.get(id);
    return row ? mapAccount(row) : undefined;
  },

  create(input: AccountInput): Account {
    const id = generateId();
    const stmt = db.prepare('INSERT INTO [Account] (Id, OwnerId, Name, Currency) VALUES (?, ?, ?, ?)');
    stmt.run(id, input.ownerId, input.name, input.currency || 'RUB');
    return this.findById(id)!;
  },

  update(id: string, input: Partial<AccountInput>): Account | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];
    
    if (input.name !== undefined) {
      fields.push('Name = ?');
      values.push(input.name);
    }
    if (input.currency !== undefined) {
      fields.push('Currency = ?');
      values.push(input.currency);
    }
    if (input.ownerId !== undefined) {
      fields.push('OwnerId = ?');
      values.push(input.ownerId);
    }
    
    if (fields.length === 0) return this.findById(id);
    
    values.push(id);
    const stmt = db.prepare(`UPDATE [Account] SET ${fields.join(', ')} WHERE Id = ?`);
    stmt.run(...values);
    return this.findById(id);
  },

  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM [Account] WHERE Id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
};
