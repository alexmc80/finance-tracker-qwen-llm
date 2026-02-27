import React from 'react';
import { api } from '../api';
import type { Transaction, Owner, Account, Category } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  owners: Owner[];
  accounts: Account[];
  categories: Category[];
  onDeleted: () => void;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  owners,
  accounts,
  categories,
  onDeleted,
}) => {
  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту транзакцию?')) return;
    
    try {
      await api.transactions.delete(id);
      onDeleted();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Ошибка при удалении транзакции');
    }
  };

  const getOwnerName = (ownerId: string) => owners.find((o) => o.id === ownerId)?.name || 'Unknown';
  const getAccountName = (accountId: string) => accounts.find((a) => a.id === accountId)?.name || 'Unknown';
  const getCategoryName = (categoryId: string) => categories.find((c) => c.id === categoryId)?.name || 'Unknown';

  const formatAmount = (amount: number, type: number) => {
    const formatted = Math.abs(amount).toFixed(2);
    return type === 1 ? `+${formatted}` : `-${formatted}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const totalIncome = transactions
    .filter((t) => t.type === 1)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === -1)
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Транзакции</h2>

      <div style={styles.summary}>
        <div style={{ ...styles.summaryItem, color: '#2e7d32' }}>
          Доходы: {totalIncome.toFixed(2)}
        </div>
        <div style={{ ...styles.summaryItem, color: '#c62828' }}>
          Расходы: {totalExpense.toFixed(2)}
        </div>
        <div style={{ ...styles.summaryItem, color: totalIncome - totalExpense >= 0 ? '#2e7d32' : '#c62828' }}>
          Баланс: {(totalIncome - totalExpense).toFixed(2)}
        </div>
      </div>

      {transactions.length === 0 ? (
        <div style={styles.empty}>Нет транзакций</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Дата</th>
                <th style={styles.th}>Владелец</th>
                <th style={styles.th}>Счет</th>
                <th style={styles.th}>Категория</th>
                <th style={styles.th}>Тип</th>
                <th style={styles.th}>Сумма</th>
                <th style={styles.th}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} style={styles.tr}>
                  <td style={styles.td}>{formatDate(transaction.date)}</td>
                  <td style={styles.td}>{getOwnerName(transaction.ownerId)}</td>
                  <td style={styles.td}>{getAccountName(transaction.accountId)}</td>
                  <td style={styles.td}>{getCategoryName(transaction.categoryId)}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.typeBadge,
                      backgroundColor: transaction.type === 1 ? '#e8f5e9' : '#ffebee',
                      color: transaction.type === 1 ? '#2e7d32' : '#c62828',
                    }}>
                      {transaction.type === 1 ? 'Доход' : 'Расход'}
                    </span>
                  </td>
                  <td style={{
                    ...styles.td,
                    ...styles.amount,
                    color: transaction.type === 1 ? '#2e7d32' : '#c62828',
                  }}>
                    {formatAmount(transaction.amount, transaction.type)}
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      style={styles.deleteButton}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  summary: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: '#f5f5f5',
    borderRadius: '12px',
    flexWrap: 'wrap',
  },
  summaryItem: {
    fontSize: '15px',
    fontWeight: 600,
    flex: '1 1 auto',
    minWidth: '100px',
  },
  empty: {
    textAlign: 'center',
    padding: '48px 16px',
    color: '#999',
  },
  tableWrapper: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '600px',
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
  amount: {
    fontWeight: 600,
  },
  typeBadge: {
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    display: 'inline-block',
  },
  deleteButton: {
    padding: '8px 16px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    touchAction: 'manipulation',
  },
};

export default TransactionList;
