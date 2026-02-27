import React, { useState } from 'react';
import { api } from '../api';
import type { Owner, Account, Category } from '../types';

interface DictionariesProps {
  owners: Owner[];
  accounts: Account[];
  categories: Category[];
  onChanged: () => void;
}

type DictionaryType = 'owners' | 'accounts' | 'categories' | null;

const Dictionaries: React.FC<DictionariesProps> = ({
  owners,
  accounts,
  categories,
  onChanged,
}) => {
  const [activeDict, setActiveDict] = useState<DictionaryType>(null);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Справочники</h2>
      
      <div style={styles.buttons}>
        <button
          onClick={() => setActiveDict('owners')}
          style={{ ...styles.dictButton, ...(activeDict === 'owners' ? styles.dictButtonActive : {}) }}
        >
          Владельцы
        </button>
        <button
          onClick={() => setActiveDict('accounts')}
          style={{ ...styles.dictButton, ...(activeDict === 'accounts' ? styles.dictButtonActive : {}) }}
        >
          Счета
        </button>
        <button
          onClick={() => setActiveDict('categories')}
          style={{ ...styles.dictButton, ...(activeDict === 'categories' ? styles.dictButtonActive : {}) }}
        >
          Категории
        </button>
      </div>

      <div style={styles.content}>
        {activeDict === 'owners' && (
          <DictionaryCRUD
            title="Владельцы"
            data={owners}
            fields={[
              { key: 'name', label: 'Имя', type: 'text' },
              { key: 'pinCode', label: 'PIN-код', type: 'text' },
            ]}
            owners={owners}
            onCreate={(data) => api.owners.create(data as { name: string; pinCode?: string })}
            onUpdate={(id, data) => api.owners.update(id, data as { name?: string; pinCode?: string })}
            onDelete={(id) => api.owners.delete(id)}
            onChanged={onChanged}
          />
        )}
        {activeDict === 'accounts' && (
          <DictionaryCRUD
            title="Счета"
            data={accounts}
            fields={[
              { key: 'name', label: 'Название', type: 'text' },
              { key: 'currency', label: 'Валюта', type: 'text' },
            ]}
            extraFields={[{ key: 'ownerId', label: 'Владелец', type: 'select', options: owners.map(o => ({ value: o.id, label: o.name })) }]}
            owners={owners}
            onCreate={(data) => api.accounts.create(data as { ownerId: string; name: string; currency: string })}
            onUpdate={(id, data) => api.accounts.update(id, data as { name?: string; currency?: string; ownerId?: string })}
            onDelete={(id) => api.accounts.delete(id)}
            onChanged={onChanged}
          />
        )}
        {activeDict === 'categories' && (
          <DictionaryCRUD
            title="Категории"
            data={categories}
            fields={[
              { key: 'name', label: 'Название', type: 'text' },
              { key: 'type', label: 'Тип', type: 'select', options: [{ value: '-1', label: 'Расход' }, { value: '1', label: 'Доход' }] },
            ]}
            owners={owners}
            onCreate={(data) => api.categories.create(data as { ownerId: string; name: string; type: number })}
            onUpdate={(id, data) => api.categories.update(id, data as { name?: string; type?: number; ownerId?: string })}
            onDelete={(id) => api.categories.delete(id)}
            onChanged={onChanged}
          />
        )}
      </div>
    </div>
  );
};

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number';
  options?: { value: string; label: string }[];
}

interface DictionaryCRUDProps<T = any> {
  title: string;
  data: T[];
  fields: FieldConfig[];
  extraFields?: FieldConfig[];
  owners: Owner[];
  onCreate: (data: Record<string, any>) => Promise<any>;
  onUpdate: (id: string, data: Record<string, any>) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
  onChanged: () => void;
}

const DictionaryCRUD = <T extends { id: string; [key: string]: any }>({
  title,
  data,
  fields,
  extraFields = [],
  owners,
  onCreate,
  onUpdate,
  onDelete,
  onChanged,
}: DictionaryCRUDProps<T>) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allFields = [...fields, ...extraFields];

  const handleEdit = (item: T) => {
    setEditingId(item.id);
    const initialData: Record<string, any> = {};
    allFields.forEach((f) => {
      initialData[f.key] = item[f.key] !== undefined ? String(item[f.key]) : '';
    });
    setFormData(initialData);
    setIsCreating(false);
    setError(null);
  };

  const handleCreate = () => {
    setEditingId(null);
    const initialData: Record<string, any> = {};
    allFields.forEach((f) => {
      initialData[f.key] = f.type === 'select' ? '' : '';
    });
    setFormData(initialData);
    setIsCreating(true);
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);

    const submitData: Record<string, any> = {};
    allFields.forEach((f) => {
      let value = formData[f.key];
      if (f.type === 'number') {
        value = parseFloat(value) || 0;
      }
      if (f.key === 'type') {
        value = parseInt(value) || -1;
      }
      submitData[f.key] = value;
    });

    // Валидация PIN-кода для владельцев
    if (title === 'Владельцы' && submitData.pinCode) {
      if (!/^\d{4}$/.test(submitData.pinCode)) {
        setError('PIN-код должен содержать 4 цифры');
        return;
      }
    }

    // Для категорий автоматически добавляем первого владельца
    if (isCreating && title === 'Категории' && !submitData.ownerId && owners.length > 0) {
      submitData.ownerId = owners[0].id;
    }

    try {
      if (isCreating) {
        await onCreate(submitData);
      } else if (editingId) {
        await onUpdate(editingId, submitData);
      }
      setFormData({});
      setEditingId(null);
      setIsCreating(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении');
    }
  };

  const handleCancel = () => {
    setFormData({});
    setEditingId(null);
    setIsCreating(false);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) return;
    
    try {
      await onDelete(id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при удалении');
    }
  };

  return (
    <div style={styles.crudContainer}>
      <div style={styles.crudHeader}>
        <h3 style={styles.crudTitle}>{title}</h3>
        {!isCreating && !editingId && (
          <button onClick={handleCreate} style={styles.addButton}>
            + Добавить
          </button>
        )}
      </div>

      {(isCreating || editingId) && (
        <div style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}
          {allFields.map((field) => (
            <div key={field.key} style={styles.formGroup}>
              <label style={styles.label}>{field.label}</label>
              {field.type === 'select' ? (
                <select
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  style={styles.select}
                >
                  <option value="">Выберите...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  style={styles.input}
                />
              )}
            </div>
          ))}
          <div style={styles.formActions}>
            <button onClick={handleSubmit} style={styles.saveButton}>
              Сохранить
            </button>
            <button onClick={handleCancel} style={styles.cancelButton}>
              Отмена
            </button>
          </div>
        </div>
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            {fields.map((field) => (
              <th key={field.key} style={styles.th}>{field.label}</th>
            ))}
            <th style={styles.th}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id} style={styles.tr}>
              {fields.map((field) => (
                <td key={field.key} style={styles.td}>
                  {field.key === 'type'
                    ? item[field.key] === 1 ? 'Доход' : 'Расход'
                    : String(item[field.key] || '-')}
                </td>
              ))}
              <td style={styles.td}>
                <button
                  onClick={() => handleEdit(item)}
                  style={styles.editButton}
                >
                  Ред.
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  style={styles.deleteButton}
                >
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.length === 0 && !isCreating && !editingId && (
        <div style={styles.empty}>Нет записей</div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  title: {
    margin: '0 0 16px 0',
    color: '#333',
    fontSize: '20px',
  },
  buttons: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  dictButton: {
    padding: '12px 16px',
    border: '1px solid #1976d2',
    borderRadius: '8px',
    backgroundColor: 'white',
    color: '#1976d2',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    flex: '1 1 auto',
    textAlign: 'center',
    minWidth: '100px',
    touchAction: 'manipulation',
  },
  dictButtonActive: {
    backgroundColor: '#1976d2',
    color: 'white',
  },
  content: {
    marginTop: '16px',
  },
  crudContainer: {
    width: '100%',
  },
  crudHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  crudTitle: {
    margin: 0,
    fontSize: '18px',
    color: '#333',
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: '#2e7d32',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    touchAction: 'manipulation',
  },
  form: {
    backgroundColor: '#f5f5f5',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  formGroup: {
    marginBottom: '12px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#555',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    boxSizing: 'border-box',
    minHeight: '48px',
  },
  select: {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: 'white',
    boxSizing: 'border-box',
    minHeight: '48px',
  },
  formActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '16px',
    flexWrap: 'wrap',
  },
  saveButton: {
    padding: '12px 24px',
    backgroundColor: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    flex: '1 1 auto',
    minWidth: '120px',
    touchAction: 'manipulation',
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#e0e0e0',
    color: '#333',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    flex: '1 1 auto',
    minWidth: '120px',
    touchAction: 'manipulation',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '12px',
    fontSize: '14px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 8px',
    borderBottom: '2px solid #e0e0e0',
    fontWeight: 600,
    color: '#555',
    fontSize: '13px',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #e0e0e0',
  },
  td: {
    padding: '12px 8px',
    fontSize: '14px',
  },
  editButton: {
    padding: '8px 12px',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    marginRight: '6px',
    touchAction: 'manipulation',
  },
  deleteButton: {
    padding: '8px 12px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    touchAction: 'manipulation',
  },
  empty: {
    textAlign: 'center',
    padding: '32px 16px',
    color: '#999',
  },
};

export default Dictionaries;
