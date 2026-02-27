import React, { useState, useEffect } from 'react';
import { api } from './api';
import type { Owner, Transaction, Account, Category } from './types';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import Dictionaries from './components/Dictionaries';
import PinScreen from './components/PinScreen';

function App() {
  const [page, setPage] = useState<'form' | 'transactions' | 'dictionaries'>('form');
  const [owners, setOwners] = useState<Owner[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentOwner, setCurrentOwner] = useState<Owner | null>(null);

  const loadData = async () => {
    try {
      const [ownersData, transactionsData, accountsData, categoriesData] = await Promise.all([
        api.owners.getAll(),
        api.transactions.getAll(),
        api.accounts.getAll(),
        api.categories.getAll(),
      ]);
      setOwners(ownersData);
      setTransactions(transactionsData);
      setAccounts(accountsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Проверка разблокировки
  useEffect(() => {
    const unlocked = localStorage.getItem('unlocked');
    const unlockedOwnerId = localStorage.getItem('unlockedOwnerId');
    
    if (unlocked === 'true' && unlockedOwnerId && owners.some(o => o.id === unlockedOwnerId)) {
      const owner = owners.find(o => o.id === unlockedOwnerId);
      setCurrentOwner(owner || null);
      setIsUnlocked(true);
    }
  }, [owners]);

  const handleUnlock = (ownerId: string) => {
    const owner = owners.find(o => o.id === ownerId);
    setCurrentOwner(owner || null);
    setIsUnlocked(true);
    console.log('Unlocked with owner:', owner?.name);
  };

  const handleTransactionCreated = () => {
    loadData();
  };

  const handleTransactionDeleted = () => {
    loadData();
  };

  const handleDictionaryChanged = () => {
    loadData();
  };

  // Показываем экран блокировки
  if (!isUnlocked && !isLoading) {
    return <PinScreen owners={owners} onUnlock={handleUnlock} />;
  }

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <button
            onClick={() => setPage('form')}
            style={{ ...styles.navButton, ...(page === 'form' ? styles.navButtonActive : {}) }}
          >
            Новая транзакция
          </button>
          <button
            onClick={() => setPage('transactions')}
            style={{ ...styles.navButton, ...(page === 'transactions' ? styles.navButtonActive : {}) }}
          >
            Транзакции
          </button>
          <button
            onClick={() => setPage('dictionaries')}
            style={{ ...styles.navButton, ...(page === 'dictionaries' ? styles.navButtonActive : {}) }}
          >
            Справочники
          </button>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('unlocked');
            localStorage.removeItem('unlockedOwnerId');
            setIsUnlocked(false);
            setCurrentOwner(null);
          }}
          style={styles.logoutButton}
          title="Выйти"
        >
          🚪 Выйти
        </button>
      </nav>

      <main style={styles.main}>
        {page === 'form' && (
          <TransactionForm
            owners={owners}
            accounts={accounts}
            categories={categories}
            onCreated={handleTransactionCreated}
          />
        )}
        {page === 'transactions' && (
          <TransactionList
            transactions={transactions}
            owners={owners}
            accounts={accounts}
            categories={categories}
            onDeleted={handleTransactionDeleted}
          />
        )}
        {page === 'dictionaries' && (
          <Dictionaries
            owners={owners}
            accounts={accounts}
            categories={categories}
            onChanged={handleDictionaryChanged}
          />
        )}
      </main>

      {/* Нижняя панель с именем владельца */}
      {currentOwner && (
        <div style={styles.ownerBar}>
          <span style={styles.ownerIcon}>👤</span>
          <span style={styles.ownerName}>{currentOwner.name}</span>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  nav: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#1976d2',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navLeft: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  navButton: {
    padding: '12px 16px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background-color 0.2s',
    flex: '1 1 auto',
    textAlign: 'center',
    minWidth: '100px',
  },
  navButtonActive: {
    backgroundColor: 'white',
    color: '#1976d2',
  },
  logoutButton: {
    padding: '12px 16px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'rgba(255,255,255,0.3)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
  main: {
    padding: '16px',
    maxWidth: '1200px',
    margin: '0 auto',
    paddingBottom: '80px',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingSpinner: {
    fontSize: '18px',
    color: '#1976d2',
  },
  ownerBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1976d2',
    color: 'white',
    padding: '16px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
    zIndex: 100,
    paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
  },
  ownerIcon: {
    fontSize: '18px',
  },
  ownerName: {
    fontSize: '14px',
    fontWeight: 500,
  },
};

export default App;
