export interface Owner {
  id: string;
  name: string;
  pinCode?: string;
  createdAt: string;
}

export interface Account {
  id: string;
  ownerId: string;
  name: string;
  currency: string;
  createdAt: string;
}

export interface Category {
  id: string;
  ownerId: string;
  name: string;
  type: number; // -1 расход, 1 доход
  createdAt: string;
}

export interface Transaction {
  id: string;
  ownerId: string;
  accountId: string;
  categoryId: string;
  amount: number;
  type: number; // -1 расход, 1 доход
  date: string;
  createdAt: string;
}

export interface TransactionForm {
  ownerId: string;
  accountId: string;
  categoryId: string;
  amount: string;
  type: number;
  date: string;
}
