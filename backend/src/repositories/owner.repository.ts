import { db, generateId } from '../db';
import type { Owner, OwnerInput } from '../types';

function mapOwner(row: any): Owner {
  return {
    id: row.Id,
    name: row.Name,
    pinCode: row.PinCode,
    createdAt: row.CreatedAt,
  };
}

export const OwnerRepository = {
  findAll(): Owner[] {
    const stmt = db.prepare('SELECT * FROM [Owner] ORDER BY Name');
    return stmt.all().map(mapOwner) as Owner[];
  },

  findById(id: string): Owner | undefined {
    const stmt = db.prepare('SELECT * FROM [Owner] WHERE Id = ?');
    const row = stmt.get(id);
    return row ? mapOwner(row) : undefined;
  },

  create(input: OwnerInput): Owner {
    const id = generateId();
    const stmt = db.prepare('INSERT INTO [Owner] (Id, Name, PinCode) VALUES (?, ?, ?)');
    stmt.run(id, input.name, input.pinCode || null);
    return this.findById(id)!;
  },

  update(id: string, input: Partial<OwnerInput>): Owner | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      fields.push('Name = ?');
      values.push(input.name);
    }
    if (input.pinCode !== undefined) {
      fields.push('PinCode = ?');
      values.push(input.pinCode);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE [Owner] SET ${fields.join(', ')} WHERE Id = ?`);
    stmt.run(...values);
    return this.findById(id);
  },

  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM [Owner] WHERE Id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  verifyPin(id: string, pinCode: string): boolean {
    const stmt = db.prepare('SELECT PinCode FROM [Owner] WHERE Id = ?');
    const row = stmt.get(id) as { PinCode: string | null } | undefined;
    if (!row) return false;
    return row.PinCode === pinCode;
  },
};
