# Finance API - Bruno Collection

Коллекция API для тестирования backend приложения учета личных финансов.

## Как использовать

1. Откройте Bruno
2. Нажмите "Open Collection"
3. Выберите папку `bruno/finance-api`
4. Запустите backend сервер: `npm run dev:backend` или `cd backend && npm run dev`

## Структура коллекции

```
finance-api/
├── 0-health-check.bru          # Проверка работоспособности API
├── Owners/                     # Владельцы
│   ├── 1-get-all-owners.bru
│   ├── 2-create-owner.bru
│   ├── 3-get-owner-by-id.bru
│   ├── 4-update-owner.bru
│   └── 5-delete-owner.bru
├── Accounts/                   # Счета
│   ├── 1-get-all-accounts.bru
│   ├── 2-get-accounts-by-owner.bru
│   ├── 3-create-account.bru
│   ├── 4-update-account.bru
│   └── 5-delete-account.bru
├── Categories/                 # Категории
│   ├── 1-get-all-categories.bru
│   ├── 2-get-categories-by-owner.bru
│   ├── 3-create-category.bru
│   ├── 4-update-category.bru
│   └── 5-delete-category.bru
└── Transactions/               # Транзакции
    ├── 1-get-all-transactions.bru
    ├── 2-get-transactions-by-owner.bru
    ├── 3-create-transaction.bru
    ├── 4-update-transaction.bru
    └── 5-delete-transaction.bru
```

## Примеры запросов

### Создать владельца
```json
POST http://localhost:3001/api/owners
{
  "name": "John Doe"
}
```

### Создать счет
```json
POST http://localhost:3001/api/accounts
{
  "ownerId": "uuid-владельца",
  "name": "Main Account",
  "currency": "RUB"
}
```

### Создать категорию
```json
POST http://localhost:3001/api/categories
{
  "ownerId": "uuid-владельца",
  "name": "Groceries",
  "type": -1  // -1 = расход, 1 = доход
}
```

### Создать транзакцию
```json
POST http://localhost:3001/api/transactions
{
  "ownerId": "uuid-владельца",
  "accountId": "uuid-счета",
  "categoryId": "uuid-категории",
  "amount": 1000.50,
  "type": -1,  // -1 = расход, 1 = доход
  "date": "2026-02-26"
}
```

## Переменные

Для использования переменных (например, `{{ownerId}}`):
1. Выполните запрос на создание ресурса
2. Скопируйте ID из ответа
3. Вставьте ID в соответствующие запросы
