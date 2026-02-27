import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { Owner } from '../types';

interface PinScreenProps {
  owners: Owner[];
  onUnlock: (ownerId: string) => void;
}

const PinScreen: React.FC<PinScreenProps> = ({ owners, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);

  // Автоматическая проверка при вводе 4 цифр
  useEffect(() => {
    if (pin.length === 4) {
      verifyPin(pin);
    }
  }, [pin]);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin(pin + num);
      setError('');
      setShowError(false);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
    setShowError(false);
  };

  const handleClear = () => {
    setPin('');
    setError('');
    setShowError(false);
  };

  const verifyPin = async (pinCode: string) => {
    // Ищем владельца с таким PIN-кодом
    const ownerWithPin = owners.find((o) => o.pinCode === pinCode);
    
    if (!ownerWithPin) {
      setError('Пользователь не определён');
      setShowError(true);
      setTimeout(() => {
        setPin('');
        setError('');
        setShowError(false);
      }, 1500);
      return;
    }

    // PIN найден - разблокируем
    localStorage.setItem('unlocked', 'true');
    localStorage.setItem('unlockedOwnerId', ownerWithPin.id);
    onUnlock(ownerWithPin.id);
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Введите PIN-код</h1>
        <p style={styles.subtitle}>Для доступа к приложению</p>
        
        {/* Отображение PIN */}
        <div style={styles.pinDisplay}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                ...styles.pinDot,
                backgroundColor: i < pin.length ? '#1976d2' : '#e0e0e0',
              }}
            />
          ))}
        </div>

        {showError && error && (
          <div style={{ ...styles.error, animation: 'shake 0.5s' }}>
            {error}
          </div>
        )}

        {/* Цифровая клавиатура */}
        <div style={styles.keypad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              style={styles.keyButton}
              disabled={pin.length >= 4}
            >
              {num}
            </button>
          ))}
          <button 
            onClick={handleClear} 
            style={{ ...styles.keyButton, ...styles.clearButton }}
            disabled={pin.length === 0}
          >
            ✕
          </button>
          <button 
            onClick={() => handleNumberClick('0')} 
            style={styles.keyButton}
            disabled={pin.length >= 4}
          >
            0
          </button>
          <button 
            onClick={handleDelete} 
            style={{ ...styles.keyButton, ...styles.deleteButton }}
            disabled={pin.length === 0}
          >
            ⌫
          </button>
        </div>

        <p style={styles.hint}>
          Введите 4-значный код
        </p>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1976d2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '32px 24px',
    width: '90%',
    maxWidth: '360px',
    textAlign: 'center',
  },
  title: {
    margin: '0 0 8px 0',
    color: '#333',
    fontSize: '24px',
  },
  subtitle: {
    margin: '0 0 32px 0',
    color: '#666',
    fontSize: '14px',
  },
  pinDisplay: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  pinDot: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    transition: 'background-color 0.2s',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: 500,
  },
  keypad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '20px',
  },
  keyButton: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    border: 'none',
    borderRadius: '12px',
    fontSize: '24px',
    fontWeight: 500,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transition: 'background-color 0.2s',
  },
  clearButton: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  deleteButton: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
  },
  hint: {
    margin: '0',
    color: '#999',
    fontSize: '12px',
  },
};

// Добавляем анимацию тряски для ошибки
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('style')) {
  document.head.appendChild(style);
}

export default PinScreen;
