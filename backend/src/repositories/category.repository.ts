import { db, generateId } from '../db';
import type { Category, CategoryInput } from '../types';

function mapCategory(row: any): Category {
  return {
    id: row.Id,
    ownerId: row.OwnerId,
    name: row.Name,
    type: row.Type,
    createdAt: row.CreatedAt,
  };
}

export const CategoryRepository = {
  findAll(): Category[] {
    const stmt = db.prepare('SELECT * FROM [Category] ORDER BY Name');
    return stmt.all().map(mapCategory) as Category[];
  },

  findByOwner(ownerId: string): Category[] {
    const stmt = db.prepare('SELECT * FROM [Category] WHERE OwnerId = ? ORDER BY Name');
    return stmt.all(ownerId).map(mapCategory) as Category[];
  },

  findById(id: string): Category | undefined {
    const stmt = db.prepare('SELECT * FROM [Category] WHERE Id = ?');
    const row = stmt.get(id);
    return row ? mapCategory(row) : undefined;
  },

  create(input: CategoryInput): Category {
    const id = generateId();
    const stmt = db.prepare('INSERT INTO [Category] (Id, OwnerId, Name, Type) VALUES (?, ?, ?, ?)');
    stmt.run(id, input.ownerId, input.name, input.type);
    return this.findById(id)!;
  },

  update(id: string, input: Partial<CategoryInput>): Category | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];
    
    if (input.name !== undefined) {
      fields.push('Name = ?');
      values.push(input.name);
    }
    if (input.type !== undefined) {
      fields.push('Type = ?');
      values.push(input.type);
    }
    if (input.ownerId !== undefined) {
      fields.push('OwnerId = ?');
      values.push(input.ownerId);
    }
    
    if (fields.length === 0) return this.findById(id);
    
    values.push(id);
    const stmt = db.prepare(`UPDATE [Category] SET ${fields.join(', ')} WHERE Id = ?`);
    stmt.run(...values);
    return this.findById(id);
  },

  delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM [Category] WHERE Id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
};
