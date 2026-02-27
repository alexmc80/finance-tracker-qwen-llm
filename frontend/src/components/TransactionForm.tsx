import React, { useState } from 'react';
import { api } from '../api';
import type { Owner, Account, Category } from '../types';

interface TransactionFormProps {
  owners: Owner[];
  accounts: Account[];
  categories: Category[];
  onCreated: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  owners,
  accounts,
  categories,
  onCreated,
}) => {
  const [formData, setFormData] = useState({
    ownerId: '',
    accountId: '',
    categoryId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Получаем тип операции из выбранной категории
  const selectedCategory = categories.find((c) => c.id === formData.categoryId);
  const transactionType = selectedCategory ? selectedCategory.type : -1;

  const filteredAccounts = accounts.filter(
    (a) => !formData.ownerId || a.ownerId === formData.ownerId
  );

  // Показываем все категории, но сначала категории выбранного владельца
  const displayedCategories = formData.ownerId
    ? categories.sort((a, b) => {
        if (a.ownerId === formData.ownerId && b.ownerId !== formData.ownerId) return -1;
        if (a.ownerId !== formData.ownerId && b.ownerId === formData.ownerId) return 1;
        return 0;
      })
    : categories;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.ownerId) throw new Error('Выберите владельца');
      if (!formData.accountId) throw new Error('Выберите счет');
      if (!formData.categoryId) throw new Error('Выберите категорию');
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('Введите корректную сумму');
      }
      if (!formData.date) throw new Error('Выберите дату');

      await api.transactions.create({
        ownerId: formData.ownerId,
        accountId: formData.accountId,
        categoryId: formData.categoryId,
        amount: parseFloat(parseFloat(formData.amount).toFixed(2)),
        type: transactionType,
        date: formData.date,
      });

      setFormData({
        ownerId: '',
        accountId: '',
        categoryId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при создании транзакции');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Новая транзакция</h2>
      
      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Дата</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              style={styles.input}
              required
            />
          </div>
        </div>

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Владелец</label>
            <select
              value={formData.ownerId}
              onChange={(e) => setFormData({ ...formData, ownerId: e.target.value, accountId: '' })}
              style={styles.select}
              required
            >
              <option value="">Выберите владельца</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Счет</label>
            <select
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
              style={styles.select}
              disabled={!formData.ownerId}
              required
            >
              <option value="">Выберите счет</option>
              {filteredAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Категория</label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              style={styles.select}
              disabled={!formData.ownerId}
              required
            >
              <option value="">Выберите категорию</option>
              {displayedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.type === 1 ? 'Доход' : 'Расход'})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Сумма</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              style={styles.input}
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
          disabled={loading}
        >
          {loading ? 'Сохранение...' : 'Сохранить транзакцию'}
        </button>
      </form>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  title: {
    margin: '0 0 20px 0',
    color: '#333',
    fontSize: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  formGroup: {
    flex: '1 1 200px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: '140px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#555',
  },
  input: {
    padding: '12px 14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    minHeight: '48px',
  },
  select: {
    padding: '12px 14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: 'white',
    minHeight: '48px',
  },
  button: {
    padding: '16px 24px',
    backgroundColor: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px',
    minHeight: '56px',
    touchAction: 'manipulation',
  },
  buttonDisabled: {
    backgroundColor: '#90caf9',
    cursor: 'not-allowed',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
  },
};

export default TransactionForm;
